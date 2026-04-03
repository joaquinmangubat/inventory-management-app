import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read expiry_alert_days from SystemSetting (default 7)
    const setting = await db.systemSetting.findUnique({
      where: { key: "expiry_alert_days" },
    });
    const alertDays = setting ? parseInt(setting.value, 10) : 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alertDate = new Date(today);
    alertDate.setDate(alertDate.getDate() + alertDays);

    // Find active items that track expiration and have transactions with upcoming/past expiry
    const items = await db.item.findMany({
      where: {
        isActive: true,
        tracksExpiration: true,
        transactions: {
          some: {
            expirationDate: {
              not: null,
              lte: alertDate,
            },
          },
        },
      },
      include: {
        category: true,
        transactions: {
          where: {
            expirationDate: {
              not: null,
              lte: alertDate,
            },
          },
          orderBy: { expirationDate: "asc" },
          take: 1,
          select: { expirationDate: true },
        },
      },
    });

    type ExpiringResult = {
      id: string;
      itemDescription: string;
      categoryId: string;
      category: { name: string };
      earliestExpiry: string;
      expiryStatus: string;
    };
    const result: ExpiringResult[] = items.flatMap((item: (typeof items)[0]) => {
      const expirationDate = item.transactions[0]?.expirationDate;
      if (!expirationDate) return [];
      const earliest = expirationDate;
      const expiryStatus = earliest < today ? "expired" : "expiring_soon";
      return [{
        id: item.id,
        itemDescription: item.itemDescription,
        categoryId: item.categoryId,
        category: { name: item.category.name },
        earliestExpiry: earliest.toISOString().split("T")[0],
        expiryStatus,
      }];
    });

    // Sort: expired first, then ascending by date
    result.sort((a, b) => {
      if (a.expiryStatus === b.expiryStatus) {
        return a.earliestExpiry.localeCompare(b.earliestExpiry);
      }
      return a.expiryStatus === "expired" ? -1 : 1;
    });

    return NextResponse.json({ items: result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
