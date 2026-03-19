import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { updatePriceSchema } from "@/lib/validations/items";

export async function PUT(
  request: Request,
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

    const body = await request.json();
    const parsed = updatePriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const item = await db.item.update({
      where: { id },
      data: { currentUnitCostPhp: parsed.data.currentUnitCostPhp },
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
