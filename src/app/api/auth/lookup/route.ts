import { NextResponse } from "next/server";

export async function POST() {
  // Always return success — never reveals whether an account exists.
  // Auth-type branching is handled server-side in /api/auth/login.
  return NextResponse.json({ success: true });
}
