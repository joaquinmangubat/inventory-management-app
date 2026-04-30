import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adjustments = await db.transaction.findMany({
      where: { transactionType: "adjust_pending" },
      orderBy: { timestamp: "asc" },
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

    return NextResponse.json({ adjustments });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
