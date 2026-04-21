import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { createAdjustmentSchema } from "@/lib/validations/adjustments";


export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { itemId, businessEntity, quantityChange, adjustmentReason, adjustmentNotes } =
      parsed.data;

    // Validate item exists and is active
    const item = await db.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!item.isActive) {
      return NextResponse.json({ error: "Item is inactive" }, { status: 400 });
    }

    // Validate decimal quantity
    if (!item.allowsDecimal && !Number.isInteger(Math.abs(quantityChange))) {
      return NextResponse.json(
        { error: "This item does not allow decimal quantities" },
        { status: 400 }
      );
    }

    // Calculate projected stock (not applied — applied only on owner approval)
    const currentStock = Number(item.quantityInStock);
    const projectedStock = currentStock + quantityChange;

    // Create the pending adjustment as a transaction record (no stock change yet)
    const adjustment = await db.transaction.create({
      data: {
        itemId,
        businessEntity,
        transactionType: "adjust_pending",
        quantityChange,
        stockAfterTransaction: projectedStock,
        unitCostAtTransaction: item.currentUnitCostPhp,
        loggedByUserId: session.userId,
        adjustmentReason,
        adjustmentNotes,
      },
      include: {
        item: {
          select: {
            id: true,
            itemDescription: true,
            unitOfMeasure: true,
            allowsDecimal: true,
            quantityInStock: true,
            currentUnitCostPhp: true,
          },
        },
        loggedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });

    // Notify all active owners of the pending adjustment
    const owners = await db.user.findMany({
      where: { role: "owner", isActive: true },
      select: { id: true },
    });
    if (owners.length > 0) {
      const sign = quantityChange > 0 ? "+" : "";
      await db.notification.createMany({
        data: owners.map((owner: { id: string }) => ({
          userId: owner.id,
          type: "adjustment_pending",
          title: "Adjustment Pending Review",
          message: `${session.fullName} submitted a ${adjustmentReason} adjustment for ${item.itemDescription} (${sign}${quantityChange} ${item.unitOfMeasure})`,
          itemId: item.id,
        })),
      });
    }

    return NextResponse.json({ adjustment }, { status: 201 });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
