import { NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import { db } from "@/lib/db";
import { getSessionFromCookie, signToken, setAuthCookie } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Password change not available for this account" },
        { status: 400 }
      );
    }

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newHash = await hash(newPassword, 12);
    await db.user.update({
      where: { id: session.userId },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    // Issue new token with mustChangePassword: false
    const newToken = await signToken({
      ...session,
      mustChangePassword: false,
    });
    await setAuthCookie(newToken);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
