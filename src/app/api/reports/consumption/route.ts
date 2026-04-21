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
    const businessEntity = searchParams.get("businessEntity") ?? "";
    const categoryId = searchParams.get("categoryId") ?? "";

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
        ...(businessEntity && { businessEntity }),
        ...(categoryId && { item: { categoryId } }),
      },
      include: {
        item: {
          select: {
            id: true,
            itemDescription: true,
            unitOfMeasure: true,
            categoryId: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Aggregate by business
    const businessMap = new Map<
      string,
      { totalQuantity: number; totalCost: number; transactionCount: number }
    >();
    for (const t of transactions) {
      const qty = Math.abs(Number(t.quantityChange));
      const cost = qty * Number(t.unitCostAtTransaction);
      const entry = businessMap.get(t.businessEntity) ?? {
        totalQuantity: 0,
        totalCost: 0,
        transactionCount: 0,
      };
      entry.totalQuantity += qty;
      entry.totalCost += cost;
      entry.transactionCount += 1;
      businessMap.set(t.businessEntity, entry);
    }
    const byBusiness = Array.from(businessMap.entries()).map(([be, v]) => ({
      businessEntity: be,
      ...v,
    }));

    // Aggregate by category
    const categoryMap = new Map<string, { categoryName: string; totalCost: number }>();
    for (const t of transactions) {
      const qty = Math.abs(Number(t.quantityChange));
      const cost = qty * Number(t.unitCostAtTransaction);
      const catId = t.item.categoryId;
      const catName = t.item.category.name;
      const entry = categoryMap.get(catId) ?? { categoryName: catName, totalCost: 0 };
      entry.totalCost += cost;
      categoryMap.set(catId, entry);
    }
    const byCategory = Array.from(categoryMap.entries())
      .map(([cid, v]) => ({ categoryId: cid, ...v }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // Aggregate by date
    const dateMap = new Map<string, { arcysCost: number; baleCost: number }>();
    for (const t of transactions) {
      const date = t.timestamp.toISOString().split("T")[0];
      const qty = Math.abs(Number(t.quantityChange));
      const cost = qty * Number(t.unitCostAtTransaction);
      const entry = dateMap.get(date) ?? { arcysCost: 0, baleCost: 0 };
      if (t.businessEntity === "Arcy's Kitchen") entry.arcysCost += cost;
      else entry.baleCost += cost;
      dateMap.set(date, entry);
    }
    const byDate = Array.from(dateMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Detail rows: aggregate by item + business
    const rowMap = new Map<
      string,
      {
        itemId: string;
        itemDescription: string;
        unitOfMeasure: string;
        categoryName: string;
        businessEntity: string;
        totalQuantity: number;
        totalCost: number;
      }
    >();
    for (const t of transactions) {
      const key = `${t.itemId}:${t.businessEntity}`;
      const qty = Math.abs(Number(t.quantityChange));
      const cost = qty * Number(t.unitCostAtTransaction);
      const entry = rowMap.get(key) ?? {
        itemId: t.itemId,
        itemDescription: t.item.itemDescription,
        unitOfMeasure: t.item.unitOfMeasure,
        categoryName: t.item.category.name,
        businessEntity: t.businessEntity,
        totalQuantity: 0,
        totalCost: 0,
      };
      entry.totalQuantity += qty;
      entry.totalCost += cost;
      rowMap.set(key, entry);
    }
    const rows = Array.from(rowMap.values()).sort((a, b) => b.totalCost - a.totalCost);

    return NextResponse.json({ byBusiness, byCategory, byDate, rows });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
