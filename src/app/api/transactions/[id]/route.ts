import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { editTransactionSchema } from "@/lib/validations/transactions";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            itemDescription: true,
            unitOfMeasure: true,
            allowsDecimal: true,
            tracksExpiration: true,
            currentUnitCostPhp: true,
            quantityInStock: true,
          },
        },
        loggedBy: { select: { id: true, fullName: true } },
        editedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            itemDescription: true,
            unitOfMeasure: true,
            allowsDecimal: true,
            tracksExpiration: true,
            quantityInStock: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Only the original logger can edit
    if (transaction.loggedByUserId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check edit window (configured in system_settings)
    const editWindowSetting = await db.systemSetting.findUnique({
      where: { key: "edit_window_minutes" },
    });
    const editWindowMs =
      (editWindowSetting ? parseInt(editWindowSetting.value, 10) : 5) * 60 * 1000;
    const msSinceCreation = Date.now() - transaction.timestamp.getTime();
    if (msSinceCreation > editWindowMs) {
      return NextResponse.json(
        { error: "Edit window has expired" },
        { status: 403 }
      );
    }

    // Adjustment transactions cannot be edited via this endpoint
    if (transaction.transactionType === "adjust_approved") {
      return NextResponse.json(
        { error: "Approved adjustments cannot be edited" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = editTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { businessEntity, quantity, expirationDate, notes } = parsed.data;
    const item = transaction.item;

    // Validate decimal quantity
    if (!item.allowsDecimal && !Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: "This item does not allow decimal quantities" },
        { status: 400 }
      );
    }

    // Validate expiration date if applicable
    let parsedExpirationDate: Date | null = null;
    if (item.tracksExpiration && transaction.transactionType === "add") {
      if (!expirationDate) {
        return NextResponse.json(
          { error: "Expiration date is required for this item" },
          { status: 400 }
        );
      }
      parsedExpirationDate = new Date(expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedExpirationDate < today) {
        return NextResponse.json(
          { error: "Expiration date cannot be in the past" },
          { status: 400 }
        );
      }
    }

    // Recalculate stock: reverse old change, apply new change
    const oldQuantityChange = Number(transaction.quantityChange);
    const newQuantityChange = transaction.transactionType === "add" ? quantity : -quantity;
    const stockDiff = newQuantityChange - oldQuantityChange;
    const currentStock = Number(item.quantityInStock);
    const newStock = currentStock + stockDiff;

    const businessChanged = businessEntity !== transaction.businessEntity;

    const [updated] = await db.$transaction([
      db.transaction.update({
        where: { id },
        data: {
          businessEntity,
          quantityChange: newQuantityChange,
          stockAfterTransaction: newStock,
          expirationDate: parsedExpirationDate,
          notes: notes ?? null,
          editedAt: new Date(),
          editedByUserId: session.userId,
          ...(businessChanged && {
            originalBusinessEntity: transaction.originalBusinessEntity ?? transaction.businessEntity,
          }),
        },
        include: {
          item: {
            select: {
              id: true,
              itemDescription: true,
              unitOfMeasure: true,
              allowsDecimal: true,
              tracksExpiration: true,
              currentUnitCostPhp: true,
              quantityInStock: true,
            },
          },
          loggedBy: { select: { id: true, fullName: true } },
          editedBy: { select: { id: true, fullName: true } },
        },
      }),
      db.item.update({
        where: { id: item.id },
        data: { quantityInStock: newStock },
      }),
    ]);

    return NextResponse.json({ transaction: updated });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
