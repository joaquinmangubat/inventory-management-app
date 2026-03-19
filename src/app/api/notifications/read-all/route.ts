import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.notification.updateMany({
      where: { userId: session.userId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
