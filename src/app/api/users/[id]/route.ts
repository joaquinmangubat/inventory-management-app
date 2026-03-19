import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validations/users";

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  authType: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export async function GET(
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
    const user = await db.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { fullName, email, isActive } = parsed.data;

    // Prevent owner from deactivating their own account
    if (id === session.userId && isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Check email uniqueness if changing
    if (email && email !== existing.email) {
      const emailTaken = await db.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(email !== undefined && { email }),
        ...(isActive !== undefined && { isActive }),
      },
      select: userSelect,
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
