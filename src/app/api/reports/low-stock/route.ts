import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Low stock: all active items with severity classification
    const allItems = await db.item.findMany({
      where: { isActive: true },
      include: { category: { select: { name: true } } },
      orderBy: { quantityInStock: "asc" },
    });

    const itemsWithSeverity = allItems.map((item) => {
      const qty = Number(item.quantityInStock);
      const reorder = Number(item.reorderLevel);
      const severity: "critical" | "low" | "healthy" =
        qty <= 0 ? "critical" : reorder > 0 && qty <= reorder ? "low" : "healthy";
      return {
        id: item.id,
        itemDescription: item.itemDescription,
        categoryName: item.category.name,
        quantityInStock: qty,
        reorderLevel: reorder,
        currentUnitCostPhp: Number(item.currentUnitCostPhp),
        unitOfMeasure: item.unitOfMeasure,
        severity,
      };
    });

    const criticalCount = itemsWithSeverity.filter((i) => i.severity === "critical").length;
    const lowCount = itemsWithSeverity.filter((i) => i.severity === "low").length;
    const healthyCount = itemsWithSeverity.filter((i) => i.severity === "healthy").length;

    // Expiring items
    const setting = await db.systemSetting.findUnique({
      where: { key: "expiry_alert_days" },
    });
    const alertDays = setting ? parseInt(setting.value, 10) : 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alertDate = new Date(today);
    alertDate.setDate(alertDate.getDate() + alertDays);

    const expiringRaw = await db.item.findMany({
      where: {
        isActive: true,
        tracksExpiration: true,
        transactions: {
          some: {
            expirationDate: { not: null, lte: alertDate },
          },
        },
      },
      include: {
        category: { select: { name: true } },
        transactions: {
          where: { expirationDate: { not: null, lte: alertDate } },
          orderBy: { expirationDate: "asc" },
          take: 1,
          select: { expirationDate: true },
        },
      },
    });

    const expiringItems = expiringRaw.flatMap((item) => {
      const expDate = item.transactions[0]?.expirationDate;
      if (!expDate) return [];
      const daysRemaining = Math.floor(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const status: "expired" | "expiring_soon" = expDate < today ? "expired" : "expiring_soon";
      return [
        {
          id: item.id,
          itemDescription: item.itemDescription,
          categoryName: item.category.name,
          quantityInStock: Number(item.quantityInStock),
          unitOfMeasure: item.unitOfMeasure,
          expirationDate: expDate.toISOString().split("T")[0],
          daysRemaining,
          status,
        },
      ];
    });

    expiringItems.sort((a, b) => {
      if (a.status !== b.status) return a.status === "expired" ? -1 : 1;
      return a.expirationDate.localeCompare(b.expirationDate);
    });

    const expiredCount = expiringItems.filter((i) => i.status === "expired").length;
    const expiringSoonCount = expiringItems.filter((i) => i.status === "expiring_soon").length;

    return NextResponse.json({
      lowStock: {
        summary: { critical: criticalCount, low: lowCount, healthy: healthyCount },
        items: itemsWithSeverity,
      },
      expiringItems: {
        summary: { expired: expiredCount, expiringSoon: expiringSoonCount },
        items: expiringItems,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
