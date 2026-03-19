import { NextResponse } from "next/server";
import { getSessionFromCookie, signToken, setAuthCookie } from "@/lib/auth";

export async function GET() {
  const session = await getSessionFromCookie();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Sliding window: refresh token with new expiry
  const newToken = await signToken(session);
  await setAuthCookie(newToken);

  return NextResponse.json({ user: session });
}
