import { NextResponse } from "next/server";

// Cheap presence-only gate (Edge runtime can't run jsonwebtoken to verify the
// signature) — every Route Handler and the (app) layout independently
// re-verify the JWT server-side before trusting the session.
const COOKIE_NAME = "mp_session";

export function middleware(req) {
  const { pathname } = req.nextUrl;
  // API routes return their own 401 JSON via requireSession() — never redirect them,
  // a fetch() call following an HTML redirect is not something client code can handle.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const hasCookie = !!req.cookies.get(COOKIE_NAME)?.value;
  const isPublic = pathname.startsWith("/login");
  if (!hasCookie && !isPublic && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
