import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { createTransactionSchema } from "@/lib/validations/transactions";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId") ?? "";
    const businessEntity = searchParams.get("businessEntity") ?? "";
    const transactionType = searchParams.get("transactionType") ?? "";
    const search = searchParams.get("search") ?? "";
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    const transactions = await db.transaction.findMany({
      where: {
        ...(itemId && { itemId }),
        ...(businessEntity && { businessEntity }),
        ...(transactionType && { transactionType }),
        ...(search && {
          item: { itemDescription: { contains: search, mode: "insensitive" } },
        }),
        ...(from || to
          ? {
              timestamp: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
              },
            }
          : {}),
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
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json({ transactions });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { itemId, businessEntity, transactionType, quantity, expirationDate, notes } = parsed.data;

    // Fetch item to validate and get current stock
    const item = await db.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!item.isActive) {
      return NextResponse.json({ error: "Item is inactive" }, { status: 400 });
    }

    // Validate decimal quantity
    if (!item.allowsDecimal && !Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: "This item does not allow decimal quantities" },
        { status: 400 }
      );
    }

    // Validate expiration date
    let parsedExpirationDate: Date | null = null;
    if (item.tracksExpiration && transactionType === "add") {
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

    // Calculate quantity change and new stock
    const quantityChange = transactionType === "add" ? quantity : -quantity;
    const currentStock = Number(item.quantityInStock);
    const newStock = currentStock + quantityChange;

    // Run transaction + stock update atomically
    const [transaction] = await db.$transaction([
      db.transaction.create({
        data: {
          itemId,
          businessEntity,
          transactionType,
          quantityChange,
          stockAfterTransaction: newStock,
          unitCostAtTransaction: item.currentUnitCostPhp,
          loggedByUserId: session.userId,
          notes: notes ?? null,
          expirationDate: parsedExpirationDate,
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
        where: { id: itemId },
        data: { quantityInStock: newStock },
      }),
    ]);

    // Create negative stock notifications for all owners
    if (newStock < 0) {
      const owners = await db.user.findMany({
        where: { role: "owner", isActive: true },
        select: { id: true },
      });
      await db.notification.createMany({
        data: owners.map((owner: { id: string }) => ({
          userId: owner.id,
          type: "low_stock",
          title: "Negative Stock Alert",
          message: `${item.itemDescription} stock went negative: ${newStock} ${item.unitOfMeasure}`,
          itemId: item.id,
        })),
      });
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
