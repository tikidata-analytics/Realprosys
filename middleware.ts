import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const SESSION_COOKIE = "realprosys_session";
const NEXTAUTH_SESSION_COOKIE = "next-auth.session-token";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/share",
  "/api/share",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Try NextAuth session token first
  const nextAuthSession = req.cookies.get(NEXTAUTH_SESSION_COOKIE);
  if (nextAuthSession) {
    // NextAuth v5 JWT session — decode without verification (NextAuth validates on API route side)
    try {
      const payload = await verifyToken(nextAuthSession.value);
      if (payload) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("x-user-id", payload.userId);
        requestHeaders.set("x-token-version", String(payload.tokenVersion ?? 1));
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    } catch {
      // fall through to legacy cookie check
    }
  }

  // Legacy session cookie
  const session = req.cookies.get(SESSION_COOKIE);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = await verifyToken(session.value);
  if (!payload) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-token-version", String(payload.tokenVersion));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
