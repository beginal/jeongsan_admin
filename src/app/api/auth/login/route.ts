import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const rawIdentifier = String(body.email || (body as any).identifier || "").trim();
  const password = String(body.password || "");

  if (!rawIdentifier || !password) {
    return NextResponse.json(
      { error: "이메일과 비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }

  if (!rawIdentifier.includes("@")) {
    return NextResponse.json(
      { error: "올바른 이메일을 입력해주세요." },
      { status: 400 }
    );
  }

  const loginEmail = rawIdentifier;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[login] Supabase env not set");
    return NextResponse.json(
      { error: "서버 설정 오류입니다. Supabase 환경 변수를 확인해주세요." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      console.error("[login] Supabase signIn error:", error);
      let message = "로그인 중 오류가 발생했습니다.";
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        message = "이메일 또는 비밀번호가 올바르지 않습니다.";
      }
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (!data.user || !data.session?.access_token) {
      return NextResponse.json(
        { error: "로그인 중 알 수 없는 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // Supabase에서 발급한 access_token 자체가 JWT이므로, 이를 admin_v2_token으로 그대로 사용
    const response = NextResponse.json({
      user: { id: data.user.id, email: data.user.email, role: "admin" },
      expiresAt: data.session.expires_at,
    });

    response.cookies.set("admin_v2_token", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // access token은 1시간, 만료 전 refresh로 연장
    });

    if (data.session.refresh_token) {
      response.cookies.set("admin_v2_refresh", data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 14, // 2주
      });
    }

    return response;
  } catch (e) {
    console.error("[login] Unexpected error:", e);
    return NextResponse.json(
      { error: "로그인 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
