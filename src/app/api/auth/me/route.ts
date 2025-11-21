import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_v2_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expiresAt = decodeExp(token);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[auth/me] Supabase env not set");
    return NextResponse.json(
      { error: "서버 설정 오류입니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      // 토큰 만료(bad_jwt)는 정상적인 케이스이므로 조용히 401만 반환
      const code = (error as any)?.code;
      if (code && code !== "bad_jwt") {
        console.error("[auth/me] getUser error:", error);
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, email, user_metadata } = data.user;
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
