import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    if (notification.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ notification: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
