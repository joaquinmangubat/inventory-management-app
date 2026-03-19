import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { createUserSchema } from "@/lib/validations/users";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        authType: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
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
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { fullName, email, role, credential } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const authType = role === "staff" ? "pin" : "password";
    const credentialHash = await hash(credential, 12);

    const user = await db.user.create({
      data: {
        fullName,
        email,
        role,
        authType,
        ...(authType === "pin"
          ? { pinHash: credentialHash }
          : { passwordHash: credentialHash }),
        mustChangePassword: true,
        createdByUserId: session.userId,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        authType: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
