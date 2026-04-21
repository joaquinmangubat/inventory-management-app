import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const adjustment = await db.transaction.findUnique({
      where: { id },
      include: {
        item: { select: { id: true, itemDescription: true, unitOfMeasure: true, quantityInStock: true } },
        loggedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!adjustment) {
      return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
    }
    if (adjustment.transactionType !== "adjust_pending") {
      return NextResponse.json({ error: "Adjustment is not pending" }, { status: 409 });
    }

    const quantityChange = Number(adjustment.quantityChange);
    const currentStock = Number(adjustment.item.quantityInStock);
    const newStock = currentStock + quantityChange;

    const [updated] = await db.$transaction([
      db.transaction.update({
        where: { id },
        data: {
          transactionType: "adjust_approved",
          approvedByUserId: session.userId,
          approvalTimestamp: new Date(),
          stockAfterTransaction: newStock,
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
      }),
      db.item.update({
        where: { id: adjustment.itemId },
        data: { quantityInStock: newStock },
      }),
    ]);

    // Notify the staff member who submitted the adjustment
    const sign = quantityChange > 0 ? "+" : "";
    await db.notification.create({
      data: {
        userId: adjustment.loggedByUserId,
        type: "adjustment_approved",
        title: "Adjustment Approved",
        message: `Your ${adjustment.adjustmentReason} adjustment for ${adjustment.item.itemDescription} (${sign}${quantityChange} ${adjustment.item.unitOfMeasure}) was approved by ${session.fullName}`,
        itemId: adjustment.itemId,
      },
    });

    return NextResponse.json({ adjustment: updated });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
