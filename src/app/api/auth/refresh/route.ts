import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "서버 설정 오류입니다. Supabase 환경 변수를 확인해주세요." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("admin_v2_refresh")?.value;
  const accessToken = cookieStore.get("admin_v2_token")?.value;
  const accessExp = decodeExp(accessToken);
  const nowSec = Math.floor(Date.now() / 1000);

  if (!refreshToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session?.access_token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const refreshedAccess = data.session.access_token;
    const refreshedRefresh = data.session.refresh_token;
    const refreshedExp =
      typeof data.session.expires_at === "number"
        ? data.session.expires_at
        : decodeExp(refreshedAccess);

    if (!refreshedExp) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = NextResponse.json({
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
      },
      expiresAt: refreshedExp,
    });

    response.cookies.set("admin_v2_token", refreshedAccess, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    if (refreshedRefresh) {
      response.cookies.set("admin_v2_refresh", refreshedRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
    }

    return response;
  } catch (e) {
    console.error("[auth/refresh] error:", e);
    if (accessExp && accessExp > nowSec + 60) {
      return NextResponse.json({ expiresAt: accessExp });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

function decodeExp(token?: string): number | null {
  if (!token) return null;
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
