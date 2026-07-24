import { NextRequest, NextResponse } from "next/server";
import { verify } from "@/lib/auth";

const PUBLIC_PATHS = ["/", "/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/me", "/api/activities", "/api/tours"];
const ADMIN_PATHS = ["/admin"];
const GUIDE_PATHS = ["/tours/new"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith("/api/tours/") && req.method === "GET");
  const token = req.cookies.get("ah_token")?.value;
  const session = token ? verify(token) : null;

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (ADMIN_PATHS.some(p => pathname.startsWith(p)) && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (GUIDE_PATHS.some(p => pathname.startsWith(p)) && session?.role !== "GUIDE" && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
