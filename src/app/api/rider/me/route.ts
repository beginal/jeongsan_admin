import { NextResponse } from "next/server";
import { requireRiderAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireRiderAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase; // 서비스 롤 우선 사용(데이터 노출은 토큰 기반 필터로 제한)
  const token = auth.token;

  try {
    const decoded = decodeJwt(token);
    const user = auth.user;
    const meta = (user?.user_metadata as any) || {};

    // rider_id 메타가 없으면 전화번호로 rider 찾기 → 마지막에 auth user id를 후보로 사용
    let riderId: string | null = meta?.rider_id || null;
    let phoneDigits: string | null =
      meta?.phone || decoded?.phone || decoded?.phone_number || null;
    const tokenEmail = decoded?.email || user?.email;
    if (!phoneDigits && tokenEmail && tokenEmail.startsWith("rider-")) {
      const m = tokenEmail.match(/^rider-(\d{8,11})@/);
      if (m) phoneDigits = m[1];
    }

    if ((!riderId || riderId === user?.id || riderId === decoded?.sub) && phoneDigits) {
      const { data: riderByPhone } = await supabase
        .from("riders")
        .select("id")
        .eq("phone", phoneDigits)
        .maybeSingle();
      riderId = riderByPhone?.id || null;
    }

    // 전화번호로도 찾지 못했을 때만 auth user id를 최후 후보로 시도 (정확 일치만 허용)
    if (!riderId && (user?.id || decoded?.sub)) {
      const candidate = user?.id || decoded?.sub;
      const { data: riderByUserId } = await supabase
        .from("riders")
        .select("id")
        .eq("id", candidate)
        .maybeSingle();
      riderId = riderByUserId?.id || null;
    }

    if (!riderId) {
      return NextResponse.json({ error: "라이더 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const { data: riderRow, error: riderErr } = await supabase
      .from("riders")
      .select(
        "id, name, phone, baemin_id, bank_name, account_holder, verification_status, rejection_reason, approved_at, registration_completed_at"
      )
      .eq("id", riderId)
      .maybeSingle();

    if (riderErr) {
      console.error("[rider/me] rider query error:", riderErr);
      return NextResponse.json(
        { error: "라이더 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }
    if (!riderRow) {
      return NextResponse.json(
        { error: "라이더 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    let branch: any = null;
    try {
      const { data: branchRel } = await supabase
        .from("rider_new_branches")
        .select("new_branch_id, status, new_branches:new_branch_id(id, display_name, branch_name, province, district)")
        .eq("rider_id", riderId)
        .limit(5);

      const activeBranch = Array.isArray(branchRel)
        ? branchRel.find((b: any) => b.status === "active") || branchRel[0]
        : null;
      branch = activeBranch?.new_branches || null;
    } catch {
      branch = null;
    }

    const verificationStatus =
      riderRow.verification_status === "approved" ||
      riderRow.verification_status === "rejected" ||
      riderRow.verification_status === "pending"
        ? riderRow.verification_status
        : "pending";

    let privateInfo: {
      bank_name: string | null;
      account_holder: string | null;
      account_number: string | null;
      tax_name: string | null;
      tax_ssn: string | null;
    } | null = null;

    try {
      const { data: priv } = await supabase
        .rpc("get_rider_private_info", { rider_id_param: riderId })
        .maybeSingle();
      privateInfo = priv as any;
    } catch (privErr) {
      console.error("[rider/me] private info load error:", privErr);
    }

    return NextResponse.json({
      rider: {
        id: riderRow.id,
        name: riderRow.name,
        phone: riderRow.phone,
        baeminId: riderRow.baemin_id,
        bankName: privateInfo?.bank_name ?? riderRow.bank_name,
        accountHolder: privateInfo?.account_holder ?? riderRow.account_holder,
        accountNumber: privateInfo?.account_number ?? null,
        taxName: privateInfo?.tax_name ?? null,
        taxResidentNumber: privateInfo?.tax_ssn ?? null,
        verificationStatus,
        rejectionReason: riderRow.rejection_reason,
        approvedAt: riderRow.approved_at,
        registrationCompletedAt: riderRow.registration_completed_at,
        branch: branch
          ? {
            id: branch.new_branch_id || branch.id,
            name: branch.display_name || branch.branch_name || "",
            region: [branch.province, branch.district].filter(Boolean).join(" "),
          }
          : null,
      },
    });
  } catch (e) {
    console.error("[rider/me] error:", e);
    return NextResponse.json(
      { error: "라이더 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

function decodeJwt(token: string | undefined) {
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
    return payload;
  } catch {
    return null;
  }
}
