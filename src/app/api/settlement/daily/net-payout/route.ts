import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

type PostBody = {
  licenseIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
};

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const userId = auth.user.id;

  const body = (await request.json().catch(() => ({}))) as PostBody;
  const licenseIds = Array.isArray(body.licenseIds)
    ? body.licenseIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const startDate = body.startDate ? String(body.startDate) : null;
  const endDate = body.endDate ? String(body.endDate) : null;

  if (licenseIds.length === 0) {
    return NextResponse.json({ totals: {} });
  }

  try {
    // 소유 지사 ID 확보
    const { data: ownedBranches, error: ownedErr } = await supabase
      .from("new_branches")
      .select("id")
      .eq("created_by", userId);
    if (ownedErr) {
      console.error("[daily/net-payout] owned branches error:", ownedErr);
      return NextResponse.json(
        { error: "지사 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const branchIds = (ownedBranches || []).map((b: any) => String(b.id));
    if (branchIds.length === 0) {
      return NextResponse.json({ totals: {} });
    }

    // 일 정산 저장분에서 라이선스별 실제 입금액 합계 조회
    let query = supabase
      .from("daily_settlement_results")
      .select("license_id, net_payout, next_day_settlement, settlement_date, branch_id")
      .in("license_id", licenseIds)
      .in("branch_id", branchIds);

    if (startDate) query = query.gte("settlement_date", startDate);
    if (endDate) query = query.lte("settlement_date", endDate);

    const { data, error } = await query;
    if (error) {
      console.error("[daily/net-payout] query error:", error);
      return NextResponse.json(
        { error: "익일정산 합계를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const totals: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const lic = String(row.license_id || "").trim();
      if (!lic) return;
      const netPayout =
        row.net_payout != null
          ? Number(row.net_payout)
          : row.next_day_settlement != null
            ? Number(row.next_day_settlement)
            : 0;
      totals[lic] = (totals[lic] || 0) + (Number.isFinite(netPayout) ? netPayout : 0);
    });

    return NextResponse.json({ totals });
  } catch (e) {
    console.error("[daily/net-payout] unexpected error:", e);
    return NextResponse.json(
      { error: "익일정산 합계를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
