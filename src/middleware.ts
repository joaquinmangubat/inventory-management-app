import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "@/types/auth";

const COOKIE_NAME = "auth-token";
const MAX_AGE = 5400;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

async function refreshToken(session: SessionUser): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

function setTokenCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow auth API routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  const isAuthenticated = !!session;

  const mustChange = session?.mustChangePassword ?? false;

  // Determine the correct change route based on auth type
  const changeRoute =
    session?.authType === "pin" ? "/change-pin" : "/change-password";

  // Login page
  if (pathname === "/login") {
    if (isAuthenticated && !mustChange) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isAuthenticated && mustChange) {
      return NextResponse.redirect(new URL(changeRoute, request.url));
    }
    return NextResponse.next();
  }

  // Change password/pin pages
  if (pathname === "/change-password" || pathname === "/change-pin") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!mustChange) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // All other protected routes
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (mustChange) {
    return NextResponse.redirect(new URL(changeRoute, request.url));
  }

  // Sliding window: refresh JWT on every authenticated request
  const newToken = await refreshToken(session);
  const response = NextResponse.next();
  setTokenCookie(response, newToken);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
