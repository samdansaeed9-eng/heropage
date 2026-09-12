import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_ROUTES = [
  "/profile",
  "/dashboard",
  "/inbox",
  "/pages",
  "/campaigns",
  "/contacts",
  "/templates",
  "/team",
  "/billing",
  "/analytics",
  "/admin",
];

const AUTH_ROUTES = ["/login", "/signup"];

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "super-secret-session-key-change-me-in-production-min-32-chars";
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionToken = req.cookies.get("heropage_session")?.value;

  let isAuthenticated = false;
  if (sessionToken) {
    try {
      await jwtVerify(sessionToken, getSessionSecret());
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Redirect unauthenticated requests away from protected routes
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (isProtected && !isAuthenticated) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated requests away from login/signup
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/profile", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/dashboard/:path*",
    "/inbox/:path*",
    "/pages/:path*",
    "/campaigns/:path*",
    "/contacts/:path*",
    "/templates/:path*",
    "/team/:path*",
    "/billing/:path*",
    "/analytics/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
