import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/auth", "/api/auth", "/api/v1"];

/**
 * Multipart parse routes are excluded from the matcher so Edge middleware
 * does not buffer upload bodies (avoids Failed to fetch / truncated FormData).
 * Auth is enforced in each route via requireRole().
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/bulk-upload/parse$|api/bulk-upload/parse-single$|api/knowledge/.+/add-document/parse$).*)",
  ],
};
