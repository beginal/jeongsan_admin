import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로: 로그인/회원가입/라이더 등록/정적 파일
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/rider") || // 라이더 포털
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const adminToken = request.cookies.get("admin_v2_token")?.value;
  const riderToken = request.cookies.get("rider_v2_token")?.value;

  // 라이더 전용 경로
  if (pathname.startsWith("/rider")) {
    if (riderToken) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 관리자 보호 영역
  if (!adminToken) {
    // rider 토큰만 있는 경우 rider 포털로 보냄
    if (riderToken) {
      return NextResponse.redirect(new URL("/rider", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Supabase access_token 자체가 JWT이므로, 만료 여부만 간단히 확인
  if (isTokenExpired(adminToken)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("session", "expired");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|login|signup|_next/static|_next/image|favicon.ico).*)",
  ],
};

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = decodeJwtPayload(payloadBase64);
    if (!payloadJson || typeof payloadJson.exp !== "number") return false;
    const now = Math.floor(Date.now() / 1000);
    return payloadJson.exp < now;
  } catch {
    return false;
  }
}

function decodeJwtPayload(base64: string): any | null {
  try {
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    const json = decodeURIComponent(
      decoded
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
