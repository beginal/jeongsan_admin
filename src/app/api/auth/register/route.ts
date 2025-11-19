import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const {
    name,
    username,
    email,
    companyName,
    businessNumber,
    phoneNumber,
    password,
    agreePrivacy,
    agreeMarketing,
  } = body as Record<string, unknown>;

  if (
    !name ||
    !username ||
    !email ||
    !companyName ||
    !businessNumber ||
    !phoneNumber ||
    !password
  ) {
    return NextResponse.json(
      { error: "모든 필수 정보를 입력해주세요." },
      { status: 400 }
    );
  }

  if (!agreePrivacy) {
    return NextResponse.json(
      { error: "개인정보 수집 및 이용에 동의해야 회원가입이 가능합니다." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[register] Supabase env not set");
    return NextResponse.json(
      { error: "서버 설정 오류입니다. Supabase 환경 변수를 확인해주세요." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: String(email),
      password: String(password),
      options: {
        emailRedirectTo: undefined,
        data: {
          name,
          user_id: username,
          company_name: companyName,
          business_number: businessNumber,
          phone_number: phoneNumber,
          marketing_consent: !!agreeMarketing,
        },
      },
    });

    if (error) {
      console.error("[register] Supabase signUp error:", error);
      let message = "회원가입 중 오류가 발생했습니다.";
      if (error.message.toLowerCase().includes("already registered")) {
        message = "이미 가입된 이메일입니다. 로그인 페이지에서 로그인을 진행해주세요.";
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "회원가입 중 알 수 없는 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[register] Unexpected error:", e);
    return NextResponse.json(
      { error: "회원가입 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

