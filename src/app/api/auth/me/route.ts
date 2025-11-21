import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const token = auth.token;
  const expiresAt = decodeExp(token);

  try {
    const user = auth.user;

    const { id, email, user_metadata } = user;
    const name =
      (user_metadata?.name as string | undefined) ||
      (email ? email.split("@")[0] : "관리자");

    return NextResponse.json({
      id,
      email,
      name,
      expiresAt,
    });
  } catch (e) {
    console.error("[auth/me] Unexpected error:", e);
    return NextResponse.json(
      { error: "사용자 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

function decodeExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64.padEnd(
      payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
      "="
    );
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    const payload = JSON.parse(
      decodeURIComponent(
        json
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
    );
    if (typeof payload.exp === "number") return payload.exp;
    return null;
  } catch {
    return null;
  }
}
