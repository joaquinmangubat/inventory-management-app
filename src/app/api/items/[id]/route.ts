import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { updateItemSchema } from "@/lib/validations/items";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await db.item.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { orderCode: rawOrderCode, ...rest } = parsed.data;
    const orderCode = rawOrderCode?.trim() || null;

    // Check unique order code if changed
    if (orderCode && orderCode !== existing.orderCode) {
      const conflict = await db.item.findFirst({
        where: { orderCode, id: { not: id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "Order code already in use" },
          { status: 409 }
        );
      }
    }

    // Check unique description within category if changed
    if (
      rest.itemDescription !== existing.itemDescription ||
      rest.categoryId !== existing.categoryId
    ) {
      const duplicate = await db.item.findFirst({
        where: {
          categoryId: rest.categoryId,
          itemDescription: { equals: rest.itemDescription, mode: "insensitive" },
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "An item with this description already exists in this category" },
          { status: 409 }
        );
      }
    }

    const item = await db.item.update({
      where: { id },
      data: { ...rest, orderCode },
      include: { category: true },
    });

    return NextResponse.json({ item });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Order code already in use" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
