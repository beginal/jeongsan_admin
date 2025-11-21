import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const riderToken = cookieStore.get("rider_v2_token")?.value;

  if (!riderToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const decoded = decodeJwt(riderToken);
    const { data: userData, error: userErr } = await supabase.auth.getUser(riderToken);
    const user = userErr ? null : userData.user;
    const meta = (user?.user_metadata as any) || {};

    let riderId = meta?.rider_id || user?.id || decoded?.sub || null;
    let phoneDigits: string | null =
      meta?.phone || decoded?.phone || decoded?.phone_number || null;
    if (!phoneDigits && decoded?.email && decoded.email.startsWith("rider-")) {
      const m = decoded.email.match(/^rider-(\d{8,11})@/);
      if (m) phoneDigits = m[1];
    }

    if (!riderId && phoneDigits) {
      const { data: riderByPhone } = await supabase
        .from("riders")
        .select("id")
        .eq("phone", phoneDigits)
        .maybeSingle();
      riderId = riderByPhone?.id || null;

      if (!riderId && phoneDigits.length >= 4) {
        const suffix = phoneDigits.slice(-4);
        const likePattern = `%${suffix}`;
        const { data: riderByLike } = await supabase
          .from("riders")
          .select("id, phone")
          .ilike("phone", likePattern)
          .limit(1)
          .maybeSingle();
        riderId = riderByLike?.id || null;
      }
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

    return NextResponse.json({
      rider: {
        id: riderRow.id,
        name: riderRow.name,
        phone: riderRow.phone,
        baeminId: riderRow.baemin_id,
        bankName: riderRow.bank_name,
        accountNumber: null,
        accountHolder: riderRow.account_holder,
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
