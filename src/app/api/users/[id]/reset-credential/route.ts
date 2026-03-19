import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { resetCredentialSchema } from "@/lib/validations/users";

export async function POST(
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

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = resetCredentialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { newCredential } = parsed.data;

    // Validate format based on auth type
    if (user.authType === "pin") {
      if (!/^\d{4,6}$/.test(newCredential)) {
        return NextResponse.json(
          { error: "PIN must be 4–6 digits" },
          { status: 400 }
        );
      }
    } else {
      if (newCredential.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
    }

    const credentialHash = await hash(newCredential, 12);

    await db.user.update({
      where: { id },
      data: {
        ...(user.authType === "pin"
          ? { pinHash: credentialHash }
          : { passwordHash: credentialHash }),
        mustChangePassword: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
