import { NextResponse } from "next/server";

import { auth } from "@/auth";

const protectedPrefixes = [
  "/dashboard",
  "/shifts",
  "/analytics",
  "/settings",
  "/api/shifts",
];

export default auth((request) => {
  const isLoggedIn = Boolean(request.auth);
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isLoginRoute = pathname === "/login";

  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    const callbackPath = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("callbackUrl", callbackPath);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/shifts/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/api/shifts/:path*",
    "/login",
  ],
};
