import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

type RiderRow = { id: string; verification_status?: string | null; created_at?: string | null };
type SettlementRow = {
  id: string;
  status?: string | null;
  requested_mode?: string | null;
  created_at?: string | null;
  decided_at?: string | null;
};
type BranchRow = { id: string };
type VehicleRow = { id: string; vehicle_assignments?: { is_active?: boolean | null; end_date?: string | null }[] };
type LoanRow = { id: string; total_loan?: number | null; remaining_amount?: number | null; next_payment_date?: string | null };
type PromotionRow = { id: string; status?: string | null; end_date?: string | null; start_date?: string | null };

export async function GET() {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;

  const supabase = auth.serviceSupabase ?? auth.supabase;
  const userId = auth.user.id;
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);
  const todayStr = now.toISOString().slice(0, 10);

  try {
    const [ridersRes, settlementRes, branchesRes, vehiclesRes, loansRes] = await Promise.all([
      supabase.from("riders").select("id, verification_status, created_at"),
      supabase.from("rider_settlement_requests").select("id, status, requested_mode, created_at, decided_at"),
      supabase.from("new_branches").select("id").eq("created_by", userId),
      supabase.from("vehicles").select("id, vehicle_assignments(is_active, end_date)").eq("created_by", userId),
      supabase.from("rider_loan_summaries").select("id, total_loan, remaining_amount, next_payment_date"),
    ]);

    if (ridersRes.error || settlementRes.error || branchesRes.error || vehiclesRes.error || loansRes.error) {
      const err =
        ridersRes.error ||
        settlementRes.error ||
        branchesRes.error ||
        vehiclesRes.error ||
        loansRes.error;
      console.error("[dashboard] query error:", err);
      return NextResponse.json({ error: "대시보드 데이터를 불러오지 못했습니다." }, { status: 500 });
    }

    const riders = (ridersRes.data || []) as RiderRow[];
    const riderCounts = { approved: 0, pending: 0, rejected: 0, newThisWeek: 0 };
    riders.forEach((r) => {
      const status = (r.verification_status || "pending") as "approved" | "pending" | "rejected";
      if (status === "approved") riderCounts.approved += 1;
      else if (status === "rejected") riderCounts.rejected += 1;
      else riderCounts.pending += 1;

      if (r.created_at && new Date(r.created_at) >= weekAgo) {
        riderCounts.newThisWeek += 1;
      }
    });

    const settlement = (settlementRes.data || []) as SettlementRow[];
    const dailyRequests = settlement.filter((s) => s.requested_mode === "daily");
    const pendingDaily = dailyRequests.filter((s) => s.status === "pending").length;
    const approvedDaily = dailyRequests.filter((s) => s.status === "approved").length;
    const slaDays = dailyRequests
      .filter((s) => s.status === "approved" && s.decided_at && s.created_at)
      .map((s) => {
        const created = new Date(s.created_at as string).getTime();
        const decided = new Date(s.decided_at as string).getTime();
        return Math.max(0, (decided - created) / (1000 * 60 * 60 * 24));
      });
    const avgSlaDays = slaDays.length ? Number((slaDays.reduce((a, b) => a + b, 0) / slaDays.length).toFixed(1)) : null;

    const branches = (branchesRes.data || []) as BranchRow[];
    const branchIds = branches.map((b) => b.id);
    let missingPolicy = 0;
    if (branchIds.length > 0) {
      const { data: policies } = await supabase
        .from("branch_settlement_policies")
        .select("branch_id")
        .in("branch_id", branchIds);
      const policySet = new Set((policies || []).map((p: any) => String(p.branch_id)));
      missingPolicy = branchIds.filter((id) => !policySet.has(String(id))).length;
    }

    let promotionIds: string[] = [];
    if (branchIds.length > 0) {
      const { data: promoAssignments, error: promoAssignError } = await supabase
        .from("promotion_branch_assignments")
        .select("promotion_id, branch_id")
        .in("branch_id", branchIds);

      if (promoAssignError) {
        console.error("[dashboard] promotion assignment query error:", promoAssignError);
        return NextResponse.json({ error: "대시보드 데이터를 불러오지 못했습니다." }, { status: 500 });
      }

      promotionIds = Array.from(
        new Set(
          (promoAssignments || [])
            .map((p: any) => String(p.promotion_id))
            .filter(Boolean)
        )
      );
    }

    let promotions: PromotionRow[] = [];
    if (promotionIds.length > 0) {
      const { data: promoRows, error: promotionsError } = await supabase
        .from("promotions")
        .select("id, status, end_date, start_date")
        .in("id", promotionIds);

      if (promotionsError) {
        console.error("[dashboard] promotions query error:", promotionsError);
        return NextResponse.json({ error: "대시보드 데이터를 불러오지 못했습니다." }, { status: 500 });
      }

      promotions = (promoRows || []) as PromotionRow[];
    }

    const vehicles = (vehiclesRes.data || []) as VehicleRow[];
    let activeVehicles = 0;
    let activeAssignments = 0;
    let expiringSoon = 0;
    vehicles.forEach((v) => {
      const assignments = Array.isArray(v.vehicle_assignments) ? v.vehicle_assignments : [];
      const activeList = assignments.filter((a) => a.is_active);
      if (activeList.length > 0) activeVehicles += 1;
      activeAssignments += activeList.length;
      if (
        activeList.some(
          (a) =>
            a.end_date &&
            new Date(a.end_date) >= now &&
            new Date(a.end_date) <= sevenDaysLater
        )
      ) {
        expiringSoon += 1;
      }
    });
    const unassignedVehicles = Math.max(vehicles.length - activeVehicles, 0);

    const loans = (loansRes.data || []) as LoanRow[];
    let totalLoan = 0;
    let remaining = 0;
    let overdue = 0;
    let dueToday = 0;
    loans.forEach((l) => {
      const total = Number(l.total_loan || 0);
      const rem = Number(l.remaining_amount || 0);
      totalLoan += total;
      remaining += rem;
      if (l.next_payment_date) {
        const nextDate = new Date(l.next_payment_date);
        const dateStr = String(l.next_payment_date).slice(0, 10);
        if (dateStr === todayStr) dueToday += 1;
        if (rem > 0 && nextDate < now) overdue += 1;
      }
    });

    const activePromos = promotions.filter((p) => normalizeStatus(p.status) === "active").length;
    const scheduledPromos = promotions.filter((p) => normalizeStatus(p.status) === "scheduled").length;
    const endingSoonPromos = promotions.filter((p) => {
      const status = normalizeStatus(p.status);
      return (
        p.end_date &&
        new Date(p.end_date) >= now &&
        new Date(p.end_date) <= sevenDaysLater &&
        status !== "ended"
      );
    }).length;

    return NextResponse.json({
      riders: {
        total: riders.length,
        approved: riderCounts.approved,
        pending: riderCounts.pending,
        rejected: riderCounts.rejected,
        newThisWeek: riderCounts.newThisWeek,
      },
      settlement: {
        pendingDaily,
        totalDaily: dailyRequests.length,
        approvedDaily,
        avgSlaDays,
      },
      branches: { total: branches.length, missingPolicy },
      vehicles: {
        total: vehicles.length,
        active: activeVehicles,
        activeAssignments,
        unassigned: unassignedVehicles,
        expiringSoon,
      },
      loans: { totalLoan, remaining, overdue, dueToday },
      promotions: {
        active: activePromos,
        scheduled: scheduledPromos,
        endingSoon: endingSoonPromos,
        total: promotions.length,
      },
      risks: {
        missingPolicy,
        unassignedVehicles,
        overdueLoans: overdue,
      },
    });
  } catch (e) {
    console.error("[dashboard] unexpected error:", e);
    return NextResponse.json(
      { error: "대시보드 데이터를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

const normalizeStatus = (status?: string | null) => String(status || "").toLowerCase();
