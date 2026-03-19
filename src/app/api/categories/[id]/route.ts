import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { updateCategorySchema } from "@/lib/validations/categories";

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

    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    const conflict = await db.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    const category = await db.category.update({
      where: { id },
      data: { name },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const itemCount = await db.item.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete — this category has ${itemCount} item${itemCount !== 1 ? "s" : ""}. Reassign or remove all items first.`,
        },
        { status: 409 }
      );
    }

    await db.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
