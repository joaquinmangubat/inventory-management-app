import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { createItemSchema } from "@/lib/validations/items";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const categoryId = searchParams.get("categoryId") ?? "";
    const showInactive = searchParams.get("showInactive") === "true";

    const items = await db.item.findMany({
      where: {
        ...(search && {
          itemDescription: { contains: search, mode: "insensitive" },
        }),
        ...(categoryId && { categoryId }),
        ...(!showInactive && { isActive: true }),
      },
      include: { category: true },
      orderBy: [{ category: { displayOrder: "asc" } }, { itemDescription: "asc" }],
    });

    return NextResponse.json({ items });
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
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { orderCode, ...rest } = parsed.data;

    // Check unique order code if provided
    if (orderCode) {
      const existing = await db.item.findUnique({ where: { orderCode } });
      if (existing) {
        return NextResponse.json(
          { error: "Order code already in use" },
          { status: 409 }
        );
      }
    }

    // Check unique description within category
    const duplicate = await db.item.findFirst({
      where: {
        categoryId: rest.categoryId,
        itemDescription: { equals: rest.itemDescription, mode: "insensitive" },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "An item with this description already exists in this category" },
        { status: 409 }
      );
    }

    const item = await db.item.create({
      data: {
        ...rest,
        ...(orderCode ? { orderCode } : {}),
        createdByUserId: session.userId,
      },
      include: { category: true },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
