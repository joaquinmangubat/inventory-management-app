import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  // Validate CRON_SECRET bearer token (set automatically by Vercel Cron)
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read expiry_alert_days from system settings (default 7)
    const setting = await db.systemSetting.findUnique({
      where: { key: "expiry_alert_days" },
    });
    const alertDays = setting ? parseInt(setting.value, 10) : 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alertDate = new Date(today);
    alertDate.setDate(alertDate.getDate() + alertDays);

    // Find active items with expiration tracking that have batches expiring within
    // the threshold or already expired, and still have stock remaining
    const items = await db.item.findMany({
      where: {
        isActive: true,
        tracksExpiration: true,
        quantityInStock: { gt: 0 },
        transactions: {
          some: {
            expirationDate: { not: null, lte: alertDate },
          },
        },
      },
      select: {
        id: true,
        itemDescription: true,
        unitOfMeasure: true,
        transactions: {
          where: {
            expirationDate: { not: null, lte: alertDate },
          },
          orderBy: { expirationDate: "asc" },
          take: 1,
          select: { expirationDate: true },
        },
      },
    });

    if (items.length === 0) {
      return NextResponse.json({ checked: 0, created: 0 });
    }

    // Fetch all active users to notify
    const users = await db.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (users.length === 0) {
      return NextResponse.json({ checked: items.length, created: 0 });
    }

    // Fetch existing expiry notifications from the last 24h for deduplication
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentNotifications = await db.notification.findMany({
      where: {
        type: { in: ["expiring_soon", "expired"] },
        createdAt: { gte: since24h },
      },
      select: { userId: true, itemId: true, type: true },
    });

    const existing = new Set(
      recentNotifications.map((n: { userId: string; itemId: string | null; type: string }) => `${n.userId}:${n.itemId}:${n.type}`)
    );

    // Build list of notifications to create, skipping duplicates
    const toCreate: {
      userId: string;
      type: string;
      title: string;
      message: string;
      itemId: string;
    }[] = [];

    for (const item of items) {
      const earliestExpiry = item.transactions[0]?.expirationDate;
      if (!earliestExpiry) continue;

      const isExpired = earliestExpiry < today;
      const type = isExpired ? "expired" : "expiring_soon";

      const daysUntil = Math.ceil(
        (earliestExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const title = isExpired ? "Expired Stock" : "Expiring Soon";
      const message = isExpired
        ? `${item.itemDescription} has expired stock — consider submitting an adjustment to write it off`
        : `${item.itemDescription} expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;

      for (const user of users) {
        const key = `${user.id}:${item.id}:${type}`;
        if (!existing.has(key)) {
          toCreate.push({
            userId: user.id,
            type,
            title,
            message,
            itemId: item.id,
          });
        }
      }
    }

    if (toCreate.length > 0) {
      await db.notification.createMany({ data: toCreate });
    }

    return NextResponse.json({
      checked: items.length,
      created: toCreate.length,
    });
  } catch (err) {
    console.error("[cron/expiration-check]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
