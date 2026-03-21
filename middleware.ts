import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/shifts",
  "/analytics",
  "/calendar",
  "/schedule",
  "/goals",
  "/settings",
  "/api/shifts",
  "/api/goals",
  "/api/account",
  "/api/settings",
];

const sessionCookieNames = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export default function middleware(request: NextRequest) {
  const isLoggedIn = sessionCookieNames.some((cookieName) =>
    Boolean(request.cookies.get(cookieName)?.value),
  );
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    const callbackPath = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("callbackUrl", callbackPath);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/shifts/:path*",
    "/analytics/:path*",
    "/calendar/:path*",
    "/schedule/:path*",
    "/goals/:path*",
    "/settings/:path*",
    "/api/shifts/:path*",
    "/api/goals/:path*",
    "/api/account/:path*",
    "/api/settings/:path*",
    "/login",
    "/signup",
  ],
};
