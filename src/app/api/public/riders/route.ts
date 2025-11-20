import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RiderRegisterBody = {
  adminId?: string | null;
  branchId?: string | null;
  name?: string;
  phone?: string;
  baeminId?: string;
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
  const residentNumber = (body.residentNumber || "").trim();
  const bankName = (body.bankName || "").trim();
  const accountHolder = (body.accountHolder || "").trim();
  const accountNumber = (body.accountNumber || "").trim();
  const taxName = (body.taxName || "").trim();
  const taxResidentNumber = (body.taxResidentNumber || "").trim();
  const branchId = (body.branchId || "").trim();
  const adminId = (body.adminId || "").trim();

  if (
    !name ||
    !phone ||
    !branchId ||
    !residentNumber ||
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
    let linkCode: string | null = adminId || null;

    // adminId가 넘어오면 해당 관리자의 활성 링크 코드 조회
    if (adminId) {
      const { data: links, error: linkError } = await supabase
        .from("registration_links")
        .select("link_code")
        .eq("admin_id", adminId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (linkError) {
        console.error("[public/riders POST] registration_links error:", linkError);
        return NextResponse.json(
          { error: "등록 링크를 확인하지 못했습니다." },
          { status: 400 }
        );
      }

      if (links && links.length > 0) {
        linkCode = String(links[0].link_code);
      }
    }

    // 1) 지사 존재 확인만 선행 (링크 검증은 함수에서 수행)
    const { data: branchExists, error: branchCheckError } = await supabase
      .from("new_branches")
      .select("id")
      .eq("id", branchId)
      .maybeSingle();

    if (branchCheckError || !branchExists) {
      return NextResponse.json(
        { error: "존재하지 않는 지사입니다." },
        { status: 400 }
      );
    }

    // 2) 등록 함수 호출 (암호화/검증 처리)
    const phoneDigits = phone.replace(/\D/g, "");
    const accountDigits = accountNumber.replace(/\D/g, "");

    const { data: registrationResult, error: registrationError } = await supabase
      .rpc("register_rider_with_new_branches", {
        link_code_param: linkCode,
        rider_data: {
          name,
          phone: phoneDigits,
          email: null,
          ssn: normalizedResident,
          baeminId: baeminId || null,
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

    const regRow = Array.isArray(registrationResult)
      ? (registrationResult as any[])[0]
      : null;

    if (registrationError || !regRow?.success) {
      console.error("[public/riders POST] registration error:", registrationError, regRow);
      return NextResponse.json(
        { error: regRow?.message || "라이더 신청을 저장하지 못했습니다." },
        { status: 400 }
      );
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
