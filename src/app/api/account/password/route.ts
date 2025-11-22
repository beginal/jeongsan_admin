import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(request: Request) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => ({}));
  const newPassword = String(body.newPassword || "");
  const currentPassword = String(body.currentPassword || "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase 환경 변수를 확인해주세요." },
      { status: 500 }
    );
  }

  if (!currentPassword) {
    return NextResponse.json(
      { error: "현재 비밀번호를 입력하세요." },
      { status: 400 }
    );
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "비밀번호는 8자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  try {
    const email = auth.user.email;
    if (!email) {
      return NextResponse.json(
        { error: "세션 정보를 확인할 수 없습니다." },
        { status: 400 }
      );
    }

    // 현재 비밀번호 재검증 (별도 클라이언트)
    const verifyClient = createClient(supabaseUrl, supabaseAnonKey);
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      return NextResponse.json(
        { error: "현재 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 비밀번호 변경 (service role 우선)
    if (auth.serviceSupabase) {
      const { error } = await auth.serviceSupabase.auth.admin.updateUserById(
        auth.user.id,
        { password: newPassword }
      );
      if (error) {
        return NextResponse.json(
          { error: error.message || "비밀번호를 변경하지 못했습니다." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    const { error } = await auth.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "비밀번호를 변경하지 못했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "비밀번호를 변경하지 못했습니다." },
      { status: 500 }
    );
  }
}
