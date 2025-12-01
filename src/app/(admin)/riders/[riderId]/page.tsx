import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SensitiveDetailRow } from "@/components/admin-v2/SensitiveDetailRow";
import { RiderDeleteButton } from "@/components/admin-v2/RiderDeleteButton";
import { RiderStatusActions } from "@/components/admin-v2/RiderStatusActions";
import { RiderSettlementCard } from "@/components/admin-v2/RiderSettlementCard";
import { DateField } from "@/components/ui/DateField";

const formatDateOnly = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
};

const formatMoney = (value: number | null | undefined) =>
  typeof value === "number" ? value.toLocaleString("ko-KR") : "-";

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  const num = Number(value) || 0;
  return `${num.toLocaleString("ko-KR")}원`;
};

interface RiderDetailPageProps {
  params: Promise<{ riderId: string }>;
}

export default async function RiderDetailPage({
  params,
}: RiderDetailPageProps) {
  const { riderId } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[rider detail] Supabase env not set");
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("admin_v2_token")?.value;

  if (!token) {
    notFound();
  }

  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: ridersData, error: ridersError } = await supabase
    .rpc("get_riders_for_admin");

  if (ridersError) {
    console.error("[rider detail] get_riders_for_admin error:", ridersError);
    notFound();
  }

  const rider = Array.isArray(ridersData)
    ? (ridersData as any[]).find((r) => String(r.id) === String(riderId))
    : null;

  if (!rider) {
    notFound();
  }

  const { data: branchData } = await supabase
    .from("rider_new_branches")
    .select(
      "new_branch_id, is_primary, status, new_branches:new_branch_id (id, display_name, platform, region, branch_name)"
    )
    .eq("rider_id", rider.id)
    .eq("status", "active");

  const branches =
    branchData?.map((rb: any) => ({
      branchId: rb.new_branch_id,
      name:
        rb.new_branches?.display_name ||
        rb.new_branches?.branch_name ||
        rb.new_branch_id,
      platform: rb.new_branches?.platform || "",
      isPrimary: rb.is_primary,
      status: rb.status,
    })) ?? [];

  const { data: assignmentData } = await supabase
    .from("vehicle_assignments")
    .select(
      "id, start_date, end_date, is_active, vehicles(id, plate_number, model, daily_fee, weekly_fee, color)"
    )
    .eq("rider_id", rider.id)
    .order("start_date", { ascending: false });

  const assignments =
    assignmentData?.map((a: any) => {
      const vehicleRaw = Array.isArray(a.vehicles) ? a.vehicles[0] : a.vehicles;
      return {
        id: a.id,
        startDate: a.start_date,
        endDate: a.end_date,
        isActive: a.is_active,
        vehicle: vehicleRaw
          ? {
              id: vehicleRaw.id,
              plateNumber: vehicleRaw.plate_number,
              model: vehicleRaw.model,
              dailyFee: vehicleRaw.daily_fee,
              weeklyFee: vehicleRaw.weekly_fee,
              color: vehicleRaw.color,
            }
          : null,
      };
    }) ?? [];

  const primaryBranch =
    branches.find((b) => b.isPrimary) || branches[0] || null;

  const { data: loanSummaries } = await supabase
    .from("rider_loan_summaries")
    .select(
      "id, total_loan, paid_amount, remaining_amount, loan_date, next_payment_date, last_paid_at, payment_date"
    )
    .eq("rider_id", rider.id)
    .order("loan_date", { ascending: false });

  const { data: loanScheduleRows } = await supabase
    .from("rider_loans")
    .select("payment_weekday, payment_amount, loan_date")
    .eq("rider_id", rider.id)
    .order("loan_date", { ascending: false })
    .limit(1);

  const currentLoanSchedule = Array.isArray(loanScheduleRows)
    ? loanScheduleRows[0]
    : null;

  const loans =
    loanSummaries?.map((l: any) => ({
      id: l.id as string,
      total: Number(l.total_loan || 0),
      paid: Number(l.paid_amount || 0),
      remaining: Number(l.remaining_amount || 0),
      loanDate: l.loan_date as string,
      nextPayment: (l.next_payment_date as string | null) || null,
      lastPaidAt: (l.last_paid_at as string | null) || null,
      paymentDate: (l.payment_date as string | null) || null,
    })) ?? [];

  const loanTotals = loans.reduce(
    (acc, cur) => {
      acc.total += cur.total;
      acc.remaining += cur.remaining;
      acc.paid += cur.paid;
      return acc;
    },
    { total: 0, remaining: 0, paid: 0 }
  );

  // 정산 히스토리 (일 정산) - rider_id 기준 최근 20건
  const { data: settlementRows } = await supabase
    .from("daily_settlement_results")
    .select(
      `
      id,
      run_id,
      branch_id,
      rider_id,
      license_id,
      rider_name,
      rider_suffix,
      order_count,
      settlement_amount,
      support_total,
      deduction,
      total_settlement,
      mission_total,
      fee,
      employment,
      accident,
      time_insurance,
      retro,
      withholding,
      rent_cost,
      loan_payment,
      next_day_settlement,
      net_payout,
      run:run_id (
        id,
        settlement_date,
        branch_id,
        status,
        confirmed_at
      )
    `
    )
    .eq("rider_id", rider.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const settlements =
    settlementRows?.map((row: any) => ({
      id: row.id,
      branchId: row.branch_id,
      licenseId: row.license_id,
      riderName: row.rider_name,
      riderSuffix: row.rider_suffix,
      orderCount: row.order_count,
      settlementAmount: row.settlement_amount,
      supportTotal: row.support_total,
      deduction: row.deduction,
      totalSettlement: row.total_settlement,
      missionTotal: row.mission_total,
      fee: row.fee,
      employment: row.employment,
      accident: row.accident,
      timeInsurance: row.time_insurance,
      retro: row.retro,
      withholding: row.withholding,
      rentCost: row.rent_cost,
      loanPayment: row.loan_payment,
      nextDaySettlement: row.next_day_settlement,
      netPayout: row.net_payout,
      settlementDate: row.run?.settlement_date || null,
      runStatus: row.run?.status || "-",
      confirmedAt: row.run?.confirmed_at || null,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">
              {rider.name?.slice(0, 1) || "R"}
            </span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              라이더 관리 / {rider.name || riderId}
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {rider.name || riderId}
            </h1>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/riders"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="mr-1 text-[11px]">←</span>
            라이더 목록
          </Link>
          <RiderDeleteButton riderId={String(riderId)} />
          <a
            href={`/riders/${encodeURIComponent(
              String(riderId)
            )}/edit`}
            className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            라이더 수정
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(primaryBranch || branches.length > 0) ? (
          <Link
            href={
              primaryBranch && primaryBranch.branchId
                ? `/branches/${encodeURIComponent(primaryBranch.branchId)}`
                : branches[0]?.branchId
                  ? `/branches/${encodeURIComponent(branches[0].branchId)}`
                  : "/branches"
            }
            className="block rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm transition hover:border-primary/60 hover:bg-primary/5"
          >
            <div className="text-xs font-medium text-muted-foreground">소속 지사</div>
            <div className="mt-2 text-sm font-semibold text-foreground">
              {primaryBranch ? primaryBranch.name : branches[0]?.name || "소속 지사 정보 없음"}
            </div>
            {(primaryBranch || branches[0])?.platform && (
              <p className="mt-1 text-xs text-muted-foreground">
                플랫폼: {(primaryBranch || branches[0])?.platform}
              </p>
            )}
          </Link>
        ) : (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">소속 지사</div>
            <div className="mt-2 text-sm font-semibold text-foreground">소속 지사 정보 없음</div>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            연락처
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {rider.phone || "-"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            이메일: {rider.email || "-"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            상태
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {rider.verification_status === "approved"
              ? "승인됨"
              : rider.verification_status === "rejected"
                ? "반려됨"
                : "대기"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            가입 완료:{" "}
            {formatDateOnly(rider.registration_completed_at)}
          </p>
          <div className="mt-3">
            <RiderStatusActions
              riderId={String(rider.id)}
              currentStatus={
                rider.verification_status === "approved"
                  ? "approved"
                  : rider.verification_status === "rejected"
                  ? "rejected"
                  : "pending"
              }
            />
          </div>
        </div>
      </div>

      <RiderSettlementCard riderId={String(riderId)} />

      <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              저장된 일 정산 내역
            </h2>
            <p className="text-[11px] text-muted-foreground">
              DB에 저장된 일 정산 결과를 라이더 기준으로 보여줍니다. (최근 20건)
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground">
            확정일 기준 최신순
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[1200px] border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-10 bg-muted/70 text-muted-foreground backdrop-blur">
              <tr>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">정산일</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">지사</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">오더수</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">대여금 납부</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">렌트비용</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">익일정산</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">실제 입금액</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">수수료</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">정산금액</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">총 지원금</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">차감내역</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">총 정산금액</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">미션 합계</th>
                <th className="border border-border px-3 py-2 text-center font-semibold whitespace-nowrap">원천세</th>
              </tr>
            </thead>
            <tbody>
              {settlements.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-muted-foreground" colSpan={14}>
                    저장된 정산 내역이 없습니다.
                  </td>
                </tr>
              )}
              {settlements.map((s) => (
                <tr key={s.id} className="bg-background">
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.settlementDate || "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {branches.find((b) => b.branchId === s.branchId)?.name || s.branchId || "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.orderCount?.toLocaleString?.() || s.orderCount || "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.loanPayment ? formatCurrency(s.loanPayment) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.rentCost ? formatCurrency(s.rentCost) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.nextDaySettlement ? formatCurrency(s.nextDaySettlement) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.netPayout ? formatCurrency(s.netPayout) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.fee ? formatCurrency(s.fee) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.settlementAmount ? formatCurrency(s.settlementAmount) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.supportTotal ? formatCurrency(s.supportTotal) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.deduction ? formatCurrency(s.deduction) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.totalSettlement ? formatCurrency(s.totalSettlement) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.missionTotal ? formatCurrency(s.missionTotal) : "-"}
                  </td>
                  <td className="border border-border px-3 py-2 text-center text-foreground whitespace-nowrap">
                    {s.withholding ? formatCurrency(s.withholding) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loans.length > 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                대여금
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-semibold text-sky-800">
                  총 대여금 {formatMoney(loanTotals.total)}원
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">
                  잔여 대여금 {formatMoney(loanTotals.remaining)}원
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-700">
                  상환 대여금 {formatMoney(loanTotals.paid)}원
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {loans.slice(0, 4).map((loan) => (
              <Link
                key={loan.id}
                href={`/loan-management/${encodeURIComponent(loan.id)}`}
                className="group rounded-lg border border-border bg-muted/30 px-3 py-3 transition hover:border-primary/60 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-foreground">
                    {formatMoney(loan.remaining)}원 남음
                  </div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-primary">
                    상세 보기 →
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-card px-2 py-0.5 text-foreground">
                    총 {formatMoney(loan.total)}원
                  </span>
                  <span className="rounded-full bg-card px-2 py-0.5 text-foreground">
                    상환 {formatMoney(loan.paid)}원
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  대여일 {formatDateOnly(loan.loanDate)} · 다음 납부{" "}
                  {loan.nextPayment ? formatDateOnly(loan.nextPayment) : "-"}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            기본 정보
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            <DetailRow label="이름" value={rider.name || "-"} />
            <DetailRow label="전화번호" value={rider.phone || "-"} />
            <DetailRow label="이메일" value={rider.email || "-"} />
            <DetailRow label="배민 ID" value={rider.baemin_id || "-"} />
            <SensitiveDetailRow label="주민등록번호" value={rider.resident_number} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            계좌 정보
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            <DetailRow label="은행명" value={rider.bank_name || "-"} />
            <DetailRow label="예금주" value={rider.account_holder || "-"} />
            <SensitiveDetailRow
              label="계좌번호"
              value={rider.account_number}
              type="account"
              bankName={rider.bank_name}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            원천세 신고 정보
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            <DetailRow label="신고 이름" value={rider.tax_name || rider.name || "-"} />
            <SensitiveDetailRow
              label="주민등록번호(마스킹)"
              value={rider.tax_resident_number}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            소속 지사
          </h2>
          <div className="mt-3 space-y-1.5 text-xs">
            {branches.length === 0 && (
              <p className="text-muted-foreground">소속 지사 정보가 없습니다.</p>
            )}
            {branches.map((b) => (
              <Link
                key={String(b.branchId)}
                href={`/branches/${encodeURIComponent(b.branchId)}`}
                className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 transition hover:border-primary/50 hover:bg-primary/5"
              >
                <div>
                  <div className="text-xs font-medium text-foreground hover:text-primary">
                    {b.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">플랫폼: {b.platform || "-"}</div>
                </div>
                {b.isPrimary && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    대표
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            차량 배정
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            {assignments.length === 0 && (
              <p className="text-muted-foreground">차량 배정 정보가 없습니다.</p>
            )}
            {assignments.map((a) =>
              a.vehicle ? (
                <Link
                  key={a.id}
                  href={`/lease-rentals/${encodeURIComponent(a.vehicle.id)}`}
                  className="block space-y-1 rounded-md border border-border bg-muted/40 px-3 py-2 transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      {`${a.vehicle.model || ""} (${a.vehicle.plateNumber || "-"})`}
                    </span>
                    <span
                      className={
                        a.isActive
                          ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                          : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                      }
                    >
                      {a.isActive ? "활성" : "종료"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.startDate || "-"} ~ {a.endDate || "현재"}
                  </div>
                </Link>
              ) : (
                <div
                  key={a.id}
                  className="space-y-1 rounded-md border border-border bg-muted/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">차량 정보 없음</span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      종료
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.startDate || "-"} ~ {a.endDate || "현재"}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">
        {label}
      </div>
      <div className="flex-1 text-xs text-foreground">{value}</div>
    </div>
  );
}
