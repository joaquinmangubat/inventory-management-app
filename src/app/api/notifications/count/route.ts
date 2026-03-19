import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await db.notification.count({
      where: { userId: session.userId, isRead: false },
    });

    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
