import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { createCategorySchema } from "@/lib/validations/categories";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCount = searchParams.get("includeCount") === "true";

    const categories = await db.category.findMany({
      orderBy: { displayOrder: "asc" },
      ...(includeCount && {
        include: { _count: { select: { items: true } } },
      }),
    });

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    const existing = await db.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    const maxOrder = await db.category.aggregate({
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const category = await db.category.create({
      data: { name, displayOrder: nextOrder },
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
