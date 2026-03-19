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
    if (session.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.item.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = await db.item.update({
      where: { id },
      data: { isActive: true },
      include: { category: true },
    });

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
