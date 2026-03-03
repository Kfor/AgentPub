import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Public routes that do not require authentication.
 * These paths (and their sub-paths) are accessible without a session.
 */
const PUBLIC_PATHS = ["/", "/login", "/register", "/marketplace"];

/**
 * Check whether a given pathname matches any of the public paths.
 * Matches exact paths and any sub-paths (e.g., /marketplace/task-123).
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => {
    if (publicPath === "/") {
      return pathname === "/";
    }
    return pathname === publicPath || pathname.startsWith(`${publicPath}/`);
  });
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow API routes — they handle their own authentication
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow Next.js internal routes (static assets, _next, etc.)
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|eot)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protected routes: redirect to login if no session
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  /*
   * Match all routes except:
   * - _next/static (static files)
   * - _next/image (image optimization)
   * - favicon.ico, sitemap.xml, robots.txt
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
