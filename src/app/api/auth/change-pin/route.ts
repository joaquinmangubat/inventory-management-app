import { NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import { db } from "@/lib/db";
import { getSessionFromCookie, signToken, setAuthCookie } from "@/lib/auth";
import { changePinSchema } from "@/lib/validations/auth";

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
    const parsed = changePinSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { currentPin, newPin } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { pinHash: true },
    });

    if (!user?.pinHash) {
      return NextResponse.json(
        { error: "PIN change not available for this account" },
        { status: 400 }
      );
    }

    const isValid = await compare(currentPin, user.pinHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current PIN is incorrect" },
        { status: 401 }
      );
    }

    const newHash = await hash(newPin, 12);
    await db.user.update({
      where: { id: session.userId },
      data: { pinHash: newHash, mustChangePassword: false },
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
