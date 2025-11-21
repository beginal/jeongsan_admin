import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizeAdminId(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase().slice(0, 30);
}

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
    email,
    companyName,
    businessNumber,
    phoneNumber,
    password,
    agreePrivacy,
    agreeMarketing,
  } = body as Record<string, unknown>;

  const contactEmail = String(email || "").trim();
  const trimmedName = String(name || "").trim();
  const normalizedPhone = String(phoneNumber || "").replace(/\D/g, "");
  const normalizedBizNo = String(businessNumber || "").replace(/\D/g, "");
  const passwordStr = String(password || "");

  if (
    !trimmedName ||
    !contactEmail ||
    !companyName ||
    !normalizedBizNo ||
    !normalizedPhone ||
    !passwordStr
  ) {
    return NextResponse.json(
      { error: "모든 필수 정보를 입력해주세요." },
      { status: 400 }
    );
  }

  if (passwordStr.length < 8) {
    return NextResponse.json(
      { error: "비밀번호는 8자 이상 입력해주세요." },
      { status: 400 }
    );
  }

  // 이메일 로컬 부분을 기반으로 내부 admin id 생성
  const derivedAdminId = (() => {
    const local = contactEmail.split("@")[0] || "";
    let candidate = normalizeAdminId(local) || normalizeAdminId(trimmedName);
    if (!candidate || candidate.length < 4) {
      candidate = `admin${Math.random().toString(36).slice(2, 6)}`;
    }
    return candidate.slice(0, 30);
  })();

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
      email: contactEmail,
      password: passwordStr,
      options: {
        emailRedirectTo: undefined,
        data: {
          name: trimmedName,
          user_id: derivedAdminId,
          admin_id: derivedAdminId,
          login_email: contactEmail,
          contact_email: contactEmail,
          company_name: companyName,
          business_number: normalizedBizNo,
          phone_number: normalizedPhone,
          marketing_consent: !!agreeMarketing,
        },
      },
    });

    if (error) {
      console.error("[register] Supabase signUp error:", error);
      let message = "회원가입 중 오류가 발생했습니다.";
      if (error.message.toLowerCase().includes("already registered")) {
        message = "이미 사용 중인 아이디입니다. 다른 아이디로 시도해주세요.";
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
