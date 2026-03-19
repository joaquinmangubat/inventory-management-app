import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { reorderCategorySchema } from "@/lib/validations/categories";

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
    const parsed = reorderCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { direction } = parsed.data;

    const current = await db.category.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const adjacent = await db.category.findFirst({
      where: {
        displayOrder:
          direction === "up"
            ? { lt: current.displayOrder }
            : { gt: current.displayOrder },
      },
      orderBy: { displayOrder: direction === "up" ? "desc" : "asc" },
    });

    if (!adjacent) {
      return NextResponse.json(
        { error: "Cannot move further in that direction" },
        { status: 400 }
      );
    }

    await db.$transaction([
      db.category.update({
        where: { id: current.id },
        data: { displayOrder: adjacent.displayOrder },
      }),
      db.category.update({
        where: { id: adjacent.id },
        data: { displayOrder: current.displayOrder },
      }),
    ]);

    const categories = await db.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
