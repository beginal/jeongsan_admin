import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RiderRegisterBody = {
  adminId?: string | null;
  branchId?: string | null;
  linkCode?: string | null;
  name?: string;
  phone?: string;
  baeminId?: string;
  password?: string;
  residentNumber?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  taxName?: string;
  taxResidentNumber?: string;
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[public/riders POST] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let body: RiderRegisterBody;
  try {
    body = (await request.json()) as RiderRegisterBody;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  const name = (body.name || "").trim();
  const phone = (body.phone || "").trim();
  const baeminId = (body.baeminId || "").trim();
  const password = (body.password || "").trim();
  const linkCode = (body.linkCode || "").trim();
  const residentNumber = (body.residentNumber || "").trim();
  const bankName = (body.bankName || "").trim();
  const accountHolder = (body.accountHolder || "").trim();
  const accountNumber = (body.accountNumber || "").trim();
  const taxName = (body.taxName || "").trim();
  const taxResidentNumber = (body.taxResidentNumber || "").trim();
  const branchId = (body.branchId || "").trim();
  const adminIdReq = (body.adminId || "").trim();

  if (
    !name ||
    !phone ||
    !branchId ||
    !residentNumber ||
    !password ||
    !bankName ||
    !accountHolder ||
    !accountNumber ||
    !taxName ||
    !taxResidentNumber
  ) {
    return NextResponse.json(
      { error: "필수 정보를 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  if (!adminIdReq || !linkCode) {
    return NextResponse.json(
      { error: "유효한 초대 링크가 필요합니다." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "비밀번호는 8자 이상 입력해 주세요." },
      { status: 400 }
    );
  }

  const normalizedResident = residentNumber.replace(/\D/g, "").slice(0, 13);
  if (!normalizedResident) {
    return NextResponse.json(
      { error: "주민등록번호를 입력해 주세요." },
      { status: 400 }
    );
  }

  const normalizedTaxSsn = taxResidentNumber.replace(/\D/g, "").slice(0, 13);
  if (!normalizedTaxSsn) {
    return NextResponse.json(
      { error: "주민등록번호를 입력해 주세요." },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // adminId 필수
    if (!adminIdReq) {
      return NextResponse.json(
        { error: "유효한 등록 링크 또는 관리자 정보가 필요합니다." },
        { status: 400 }
      );
    }

    // 제공된 초대 링크 검증 (자동 생성 제거)
    const { data: linkRow, error: linkError } = await supabase
      .from("registration_links")
      .select("link_code, admin_id, is_active, new_branch_id, expires_at")
      .eq("link_code", linkCode)
      .eq("admin_id", adminIdReq)
      .eq("is_active", true)
      .maybeSingle();

    if (linkError || !linkRow) {
      return NextResponse.json(
        { error: "유효하지 않은 등록 링크입니다." },
        { status: 400 }
      );
    }

    if (linkRow.expires_at && new Date(linkRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "만료된 등록 링크입니다." },
        { status: 400 }
      );
    }

    // 1) 지사 존재 확인만 선행 (링크 검증은 함수에서 수행)
    const { data: branchExists, error: branchCheckError } = await supabase
      .from("new_branches")
      .select("id, created_by")
      .eq("id", branchId)
      .maybeSingle();

    if (branchCheckError || !branchExists) {
      return NextResponse.json(
        { error: "존재하지 않는 지사입니다." },
        { status: 400 }
      );
    }
    if (String(branchExists.created_by || "") !== adminIdReq) {
      return NextResponse.json(
        { error: "해당 지사를 소유한 관리자 정보가 아닙니다." },
        { status: 400 }
      );
    }

    if (linkRow.new_branch_id && String(linkRow.new_branch_id) !== branchId) {
      return NextResponse.json(
        { error: "등록 링크와 지사 정보가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // 2) 등록 함수 호출 (암호화/검증 처리)
    const phoneDigits = phone.replace(/\D/g, "");
    const accountDigits = accountNumber.replace(/\D/g, "");

    const doRegister = async (codeParam: string | null) =>
      supabase.rpc("register_rider_with_new_branches", {
        link_code_param: codeParam,
        rider_data: {
          name,
          phone: phoneDigits,
          email: null,
          ssn: normalizedResident,
          baeminId: baeminId || null,
          password,
          bankName,
          accountNumber: accountDigits,
          accountHolder,
          taxName,
          taxSsn: normalizedTaxSsn,
        },
        selected_branch_ids: [branchId],
        primary_branch_id_param: branchId,
        client_ip: request.headers.get("x-forwarded-for") || null,
      });

    let { data: registrationResult, error: registrationError } = await doRegister(linkCode);

    const regRow = Array.isArray(registrationResult)
      ? (registrationResult as any[])[0]
      : null;

    if (registrationError || !regRow?.success) {
      const msg = String(regRow?.message || registrationError?.message || "");
      const shouldRetryWithoutLink =
        linkCode != null &&
        (msg.toLowerCase().includes("link") ||
          msg.includes("링크") ||
          msg.toLowerCase().includes("expired"));

      if (shouldRetryWithoutLink) {
        const retry = await doRegister(null);
        registrationResult = retry.data;
        registrationError = retry.error;
      }
    }

    const finalRow = Array.isArray(registrationResult)
      ? (registrationResult as any[])[0]
      : null;

    if (registrationError || !finalRow?.success) {
      console.error("[public/riders POST] registration error:", registrationError, registrationResult);
      return NextResponse.json(
        { error: finalRow?.message || "라이더 신청을 저장하지 못했습니다." },
        { status: 400 }
      );
    }

    // Supabase Auth 계정 생성 (이미 존재하면 비밀번호 갱신)
    try {
      const riderEmail = `rider-${phoneDigits}@riders.local`;
      const { error: createError } = await supabase.auth.admin.createUser({
        email: riderEmail,
        password,
        email_confirm: true,
        user_metadata: {
          role: "rider",
          rider_id: finalRow.rider_id,
          phone: phoneDigits,
        },
      });
      if (createError) {
        const msg = String(createError.message || "").toLowerCase();
        if (msg.includes("already registered")) {
          const { data: usersPage } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const existing = usersPage?.users?.find((u: any) => u.email === riderEmail);
          if (existing?.id) {
            await supabase.auth.admin.updateUserById(existing.id, {
              password,
              email_confirm: true,
              user_metadata: {
                role: "rider",
                rider_id: finalRow.rider_id,
                phone: phoneDigits,
              },
            });
          }
        } else {
          console.error("[public/riders POST] rider auth create error:", createError);
        }
      }
    } catch (authErr) {
      console.error("[public/riders POST] rider auth create exception:", authErr);
    }

    return NextResponse.json({
      ok: true,
      riderId: regRow.rider_id,
      status: "pending",
    });
  } catch (error) {
    console.error("[public/riders POST] Unexpected error:", error);
    return NextResponse.json(
      { error: "라이더 신청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
