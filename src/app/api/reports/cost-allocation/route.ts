import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const transactions = await db.transaction.findMany({
      where: {
        transactionType: "consume",
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
            categoryId: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    let arcysTotal = 0;
    let baleTotal = 0;
    const categoryMap = new Map<
      string,
      { categoryName: string; arcysCost: number; baleCost: number }
    >();

    for (const t of transactions) {
      const qty = Math.abs(Number(t.quantityChange));
      const cost = qty * Number(t.unitCostAtTransaction);
      const catId = t.item.categoryId;
      const catName = t.item.category.name;
      const entry = categoryMap.get(catId) ?? {
        categoryName: catName,
        arcysCost: 0,
        baleCost: 0,
      };
      if (t.businessEntity === "Arcy's Kitchen") {
        entry.arcysCost += cost;
        arcysTotal += cost;
      } else {
        entry.baleCost += cost;
        baleTotal += cost;
      }
      categoryMap.set(catId, entry);
    }

    const byCategory = Array.from(categoryMap.values())
      .map((v) => ({
        categoryName: v.categoryName,
        arcysCost: v.arcysCost,
        baleCost: v.baleCost,
        totalCost: v.arcysCost + v.baleCost,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    return NextResponse.json({
      summary: {
        arcysTotal,
        baleTotal,
        combinedTotal: arcysTotal + baleTotal,
      },
      byCategory,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
