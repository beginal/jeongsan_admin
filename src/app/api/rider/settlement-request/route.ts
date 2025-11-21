import { NextRequest, NextResponse } from "next/server";
import { requireRiderAuth } from "@/lib/auth";

type SettlementMode = "daily" | "weekly";

function isValidMode(mode: any): mode is SettlementMode {
  return mode === "daily" || mode === "weekly";
}

function serializeRequest(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    requestedMode: row.requested_mode as SettlementMode,
    status: row.status as "pending" | "approved" | "rejected",
    rejectionReason: row.rejection_reason || null,
    requestedAt: row.created_at,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
  };
}

async function resolveRiderId(
  supabase: any,
  user: any,
  token: string
) {
  const meta = (user?.user_metadata as any) || {};
  let riderId = meta?.rider_id || null;
  let phoneDigits: string | null =
    meta?.phone || meta?.phone_number || user?.phone || null;
  if (!phoneDigits && user.email && user.email.startsWith("rider-")) {
    const m = user.email.match(/^rider-(\d{8,11})@/);
    if (m) phoneDigits = m[1];
  }
  if ((!riderId || riderId === user?.id) && phoneDigits) {
    const { data: riderByPhone } = await supabase
      .from("riders")
      .select("id")
      .eq("phone", phoneDigits)
      .maybeSingle();

    riderId = (riderByPhone as any)?.id || riderId;

    if (!riderId && phoneDigits.length >= 6) {
      const fuzzyPattern = `%${phoneDigits.split("").join("%")}%`;
      const { data: riderByFuzzy } = await supabase
        .from("riders")
        .select("id")
        .ilike("phone", fuzzyPattern)
        .limit(1)
        .maybeSingle();
      riderId = (riderByFuzzy as any)?.id || riderId;
    }

    if (!riderId && phoneDigits.length >= 4) {
      const suffix = phoneDigits.slice(-4);
      const likePattern = `%${suffix}`;
      const { data: riderByLike } = await supabase
        .from("riders")
        .select("id, phone")
        .ilike("phone", likePattern)
        .limit(1)
        .maybeSingle();
      riderId = (riderByLike as any)?.id || riderId;
    }
  }
  if (!riderId && user?.id) {
    const { data: riderByUserId } = await supabase
      .from("riders")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    riderId = (riderByUserId as any)?.id || riderId;
  }
  return { riderId, phone: phoneDigits };
}

async function getSettlementStatus(
  supabase: any,
  riderId: string
) {
  const { data: pending } = await supabase
    .from("rider_settlement_requests")
    .select(
      "id, rider_id, requested_mode, status, rejection_reason, decided_at, decided_by, created_at"
    )
    .eq("rider_id", riderId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestApproved } = await supabase
    .from("rider_settlement_requests")
    .select("id, requested_mode, decided_at, created_at")
    .eq("rider_id", riderId)
    .eq("status", "approved")
    .order("decided_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pendingRow = pending as any;
  const latestApprovedRow = latestApproved as any;
  const effectiveMode: SettlementMode =
    latestApprovedRow?.requested_mode === "daily" ? "daily" : "weekly";

  return {
    mode: effectiveMode,
    pendingRequest: serializeRequest(pendingRow),
  };
}

export async function GET() {
  const auth = await requireRiderAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const { riderId } = await resolveRiderId(supabase, auth.user, auth.token);

  if (!riderId) {
    return NextResponse.json({ error: "라이더 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const settlement = await getSettlementStatus(supabase, riderId);
    return NextResponse.json({ settlement });
  } catch (e) {
    console.error("[rider/settlement-request] GET error:", e);
    return NextResponse.json(
      { error: "정산 상태를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRiderAuth();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => ({}));
  const mode = body?.mode;

  if (!isValidMode(mode)) {
    return NextResponse.json(
      { error: "유효하지 않은 정산 요청 유형입니다." },
      { status: 400 }
    );
  }

  const supabase = auth.serviceSupabase ?? auth.supabase;
  const { riderId } = await resolveRiderId(supabase, auth.user, auth.token);

  if (!riderId) {
    return NextResponse.json({ error: "라이더 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const { data: riderRow } = await supabase
      .from("riders")
      .select("verification_status, created_by")
      .eq("id", riderId)
      .maybeSingle();

    if (!riderRow) {
      return NextResponse.json({ error: "라이더 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (riderRow.verification_status !== "approved") {
      return NextResponse.json(
        { error: "승인 완료 후 정산 요청을 보낼 수 있습니다." },
        { status: 403 }
      );
    }

    const current = await getSettlementStatus(supabase, riderId);

    if (current.pendingRequest) {
      return NextResponse.json(
        { error: "이미 처리 대기 중인 정산 요청이 있습니다." },
        { status: 400 }
      );
    }

    if (current.mode === mode) {
      return NextResponse.json(
        { error: "이미 동일한 정산 주기를 사용 중입니다." },
        { status: 400 }
      );
    }

    const insertPayload = {
      rider_id: riderId,
      requested_mode: mode,
      status: "pending",
      requested_by: "rider",
      rejection_reason: null,
      decided_at: null,
      decided_by: null,
      updated_at: new Date().toISOString(),
      created_by: riderRow.created_by ?? null,
    };

    const { error: insertErr } = await supabase
      .from("rider_settlement_requests")
      .insert(insertPayload);

    if (insertErr) {
      console.error("[rider/settlement-request] insert error:", insertErr);
      return NextResponse.json(
        { error: "정산 요청을 저장하지 못했습니다." },
        { status: 500 }
      );
    }

    const settlement = await getSettlementStatus(supabase, riderId);
    return NextResponse.json({ settlement });
  } catch (e) {
    console.error("[rider/settlement-request] POST error:", e);
    return NextResponse.json(
      { error: "정산 요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const auth = await requireRiderAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const { riderId } = await resolveRiderId(supabase, auth.user, auth.token);

  if (!riderId) {
    return NextResponse.json({ error: "라이더 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const { data: pending } = await supabase
      .from("rider_settlement_requests")
      .select("id")
      .eq("rider_id", riderId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pending) {
      return NextResponse.json(
        { error: "취소할 대기 요청이 없습니다." },
        { status: 400 }
      );
    }

    const { error: deleteErr } = await supabase
      .from("rider_settlement_requests")
      .delete()
      .eq("id", pending.id);

    if (deleteErr) {
      console.error("[rider/settlement-request] delete error:", deleteErr);
      return NextResponse.json(
        { error: "정산 요청을 취소하지 못했습니다." },
        { status: 500 }
      );
    }

    const settlement = await getSettlementStatus(supabase, riderId);
    return NextResponse.json({ settlement });
  } catch (e) {
    console.error("[rider/settlement-request] DELETE error:", e);
    return NextResponse.json(
      { error: "정산 요청 취소 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
