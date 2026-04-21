import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

const rejectSchema = z.object({
  rejectionReason: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
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

    const body = await request.json().catch(() => ({}));
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const adjustment = await db.transaction.findUnique({
      where: { id },
      include: {
        item: { select: { id: true, itemDescription: true, unitOfMeasure: true } },
        loggedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!adjustment) {
      return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
    }
    if (adjustment.transactionType !== "adjust_pending") {
      return NextResponse.json({ error: "Adjustment is not pending" }, { status: 409 });
    }

    const updated = await db.transaction.update({
      where: { id },
      data: {
        transactionType: "adjust_rejected",
        approvedByUserId: session.userId,
        approvalTimestamp: new Date(),
        rejectionReason: parsed.data.rejectionReason ?? null,
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

    const quantityChange = Number(adjustment.quantityChange);
    const sign = quantityChange > 0 ? "+" : "";
    await db.notification.create({
      data: {
        userId: adjustment.loggedByUserId,
        type: "adjustment_rejected",
        title: "Adjustment Rejected",
        message: `Your ${adjustment.adjustmentReason} adjustment for ${adjustment.item.itemDescription} (${sign}${quantityChange} ${adjustment.item.unitOfMeasure}) was rejected by ${session.fullName}${parsed.data.rejectionReason ? `: ${parsed.data.rejectionReason}` : ""}`,
        itemId: adjustment.itemId,
      },
    });

    return NextResponse.json({ adjustment: updated });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
