import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET() {
  // getSessionFromCookie() handles DB validation + sliding window token refresh
  const session = await getSessionFromCookie();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({ user: session });
}
