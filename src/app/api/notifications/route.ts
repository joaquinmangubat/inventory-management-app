import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await db.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter((n: { isRead: boolean }) => !n.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
