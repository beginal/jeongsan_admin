import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

type AdminAction = "approve" | "reject";

async function getAdminUserId(
  supabase: any,
  token: string
) {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
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
  const effectiveMode = latestApprovedRow?.requested_mode === "daily" ? "daily" : "weekly";

  const serialize = (row: any) =>
    row
      ? {
          id: row.id,
          requestedMode: row.requested_mode,
          status: row.status,
          rejectionReason: row.rejection_reason,
          requestedAt: row.created_at,
          decidedAt: row.decided_at,
          decidedBy: row.decided_by,
        }
      : null;

  return {
    mode: effectiveMode,
    pendingRequest: serialize(pendingRow),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ riderId: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const { riderId } = await params;

  // 관리자가 소유한 라이더/지사인지 확인
  const { data: riderRow } = await supabase
    .from("riders")
    .select("id, created_by")
    .eq("id", riderId)
    .maybeSingle();

  let isOwned = riderRow?.created_by === auth.user.id;

  if (!isOwned) {
    const { data: assignments } = await supabase
      .from("rider_new_branches")
      .select("new_branches: new_branch_id (created_by)")
      .eq("rider_id", riderId)
      .limit(5);
    isOwned = (assignments || []).some(
      (a: any) => a?.new_branches?.created_by === auth.user.id
    );
  }

  if (!isOwned) {
    return NextResponse.json(
      { error: "정산 요청을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  try {
    const settlement = await getSettlementStatus(supabase, riderId);
    return NextResponse.json({ settlement });
  } catch (e) {
    console.error("[admin settlement request] GET error:", e);
    return NextResponse.json(
      { error: "정산 상태를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ riderId: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const adminUserId = auth.user.id;

  const { riderId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action as AdminAction | undefined;
  const rejectionReason = body?.rejectionReason ?? null;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "유효하지 않은 처리 요청입니다." },
      { status: 400 }
    );
  }

  const { data: riderRow } = await supabase
    .from("riders")
    .select("id, created_by")
    .eq("id", riderId)
    .maybeSingle();

  let isOwned = riderRow?.created_by === adminUserId;

  if (!isOwned) {
    const { data: assignments } = await supabase
      .from("rider_new_branches")
      .select("new_branches: new_branch_id (created_by)")
      .eq("rider_id", riderId)
      .limit(5);
    isOwned = (assignments || []).some(
      (a: any) => a?.new_branches?.created_by === adminUserId
    );
  }

  if (!isOwned) {
    return NextResponse.json(
      { error: "정산 요청을 찾을 수 없습니다." },
      { status: 404 }
    );
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
        { error: "대기 중인 정산 요청이 없습니다." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const nextStatus = action === "approve" ? "approved" : "rejected";

    const { error: updateErr } = await supabase
      .from("rider_settlement_requests")
      .update({
        status: nextStatus,
        rejection_reason: action === "reject" ? rejectionReason : null,
        decided_by: adminUserId,
        decided_at: now,
        updated_at: now,
      })
      .eq("id", pending.id);

    if (updateErr) {
      console.error("[admin settlement request] update error:", updateErr);
      return NextResponse.json(
        { error: "정산 요청 상태를 업데이트하지 못했습니다." },
        { status: 500 }
      );
    }

    const settlement = await getSettlementStatus(supabase, riderId);
    return NextResponse.json({ settlement });
  } catch (e) {
    console.error("[admin settlement request] PATCH error:", e);
    return NextResponse.json(
      { error: "정산 요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
