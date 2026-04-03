import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { SessionUser } from "@/types/auth";

const COOKIE_NAME = "auth-token";

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

  // Sliding window is handled inside getSessionFromCookie() on each API call.
  return NextResponse.next();
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
