import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawPhone = String(body.phone || "");
  const password = String(body.password || "");

  const phoneDigits = rawPhone.replace(/\D/g, "").slice(-11);

  if (!phoneDigits || !password) {
    return NextResponse.json(
      { error: "휴대폰 번호와 비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "서버 설정 오류입니다. Supabase 환경 변수를 확인해주세요." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const riderEmail = `rider-${phoneDigits}@riders.local`;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: riderEmail,
      password,
    });

    if (error || !data.session?.access_token) {
      return NextResponse.json(
        { error: "휴대폰 번호 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      user: { id: data.user.id, phone: phoneDigits, role: "rider" },
      expiresAt: data.session.expires_at,
    });

    response.cookies.set("rider_v2_token", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch (e) {
    return NextResponse.json(
      { error: "라이더 로그인을 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
