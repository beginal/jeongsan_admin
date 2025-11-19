import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 로그인/회원가입, API, 정적 리소스는 제외하고
  // 나머지 모든 경로를 관리자 보호 영역으로 처리
  const token = request.cookies.get("admin_v2_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Supabase access_token 자체가 JWT이므로, 만료 여부만 간단히 확인
  if (isTokenExpired(token)) {
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
