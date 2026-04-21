import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";
import type { AuthType, UserRole } from "@/types/auth";

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
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    const { email, credential } = parsed.data;

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        authType: true,
        passwordHash: true,
        pinHash: true,
        isActive: true,
        mustChangePassword: true,
        sessionVersion: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const hashToVerify =
      user.authType === "password" ? user.passwordHash : user.pinHash;

    if (!hashToVerify) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await compare(credential, hashToVerify);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      fullName: user.fullName,
      mustChangePassword: user.mustChangePassword,
      authType: user.authType as AuthType,
      sessionVersion: user.sessionVersion,
    });

    await setAuthCookie(token);
    resetRateLimit(ip);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        authType: user.authType,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
