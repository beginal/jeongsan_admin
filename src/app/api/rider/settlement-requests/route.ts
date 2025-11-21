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
  const adminToken = cookieStore.get("admin_v2_token")?.value;

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("rider_settlement_requests")
      .select(
        "id, rider_id, requested_mode, status, rejection_reason, created_at, decided_at, riders:rider_id (id, name, phone, verification_status)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin settlement requests] query error:", error);
      return NextResponse.json(
        { error: "정산 신청 목록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    // 라이더별로 정렬 후 최신 daily 요청 상태를 결정
    const grouped: Record<string, any[]> = {};
    for (const row of data || []) {
      const riderId = row.rider_id;
      if (!riderId) continue;
      grouped[riderId] = grouped[riderId] || [];
      grouped[riderId].push(row);
    }

    const requests: any[] = [];

    for (const riderId of Object.keys(grouped)) {
      const list = grouped[riderId].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      const latestRequest = list[0];
      const pendingDaily = list.find(
        (r) => r.requested_mode === "daily" && r.status === "pending"
      );
      const latestApprovedDaily = list.find(
        (r) => r.requested_mode === "daily" && r.status === "approved"
      );

      // 현재 익일 정산으로 전환 예정/적용 중인지 판단
      const isCurrentlyDaily =
        pendingDaily != null ||
        (latestRequest?.requested_mode === "daily" && latestRequest?.status === "approved");

      if (!isCurrentlyDaily) continue;

      const chosen = pendingDaily ?? latestApprovedDaily ?? latestRequest;

      requests.push({
        id: chosen.id,
        riderId: chosen.rider_id,
        riderName: chosen.riders?.name || "이름 미등록",
        riderPhone: chosen.riders?.phone || "",
        riderStatus: chosen.riders?.verification_status || "pending",
        requestedMode: chosen.requested_mode,
        status: chosen.status,
        rejectionReason: chosen.rejection_reason,
        createdAt: chosen.created_at,
        decidedAt: chosen.decided_at,
      });
    }

    requests.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return NextResponse.json({ requests });
  } catch (e) {
    console.error("[admin settlement requests] unexpected error:", e);
    return NextResponse.json(
      { error: "정산 신청 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
