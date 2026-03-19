import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailLookupSchema } from "@/lib/validations/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const parsed = emailLookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { authType: true, fullName: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "No active account found with this email" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      authType: user.authType,
      fullName: user.fullName,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
