"use client";

import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarClock,
  Clock4,
  CheckCircle2,
  ClipboardList,
  Map,
  Megaphone,
  ShieldAlert,
  Truck,
  UserCheck,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import { DashboardStats } from "@/components/admin-v2/DashboardStats";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { fetchJson } from "@/lib/api";
import { formatKRW } from "@/lib/format";

type DashboardData = {
  riders: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    newThisWeek: number;
  };
  settlement: {
    pendingDaily: number;
    totalDaily: number;
    approvedDaily: number;
    avgSlaDays: number | null;
  };
  branches: { total: number; missingPolicy: number };
  vehicles: {
    total: number;
    active: number;
    activeAssignments: number;
    unassigned: number;
    expiringSoon: number;
  };
  loans: {
    totalLoan: number;
    remaining: number;
    overdue: number;
    dueToday: number;
  };
  promotions: { active: number; scheduled: number; endingSoon: number; total: number };
  risks: { missingPolicy: number; unassignedVehicles: number; overdueLoans: number };
};

type ActionItem = {
  title: string;
  value: string;
  detail: string;
  href: string;
};

type MiniStat = {
  label: string;
  value: string;
  tone?: "positive" | "warning" | "danger" | "muted";
  helper?: string;
};

const toneClass = (tone: MiniStat["tone"]) => {
  if (tone === "positive") return "text-emerald-600";
  if (tone === "warning") return "text-amber-600";
  if (tone === "danger") return "text-red-600";
  return "text-muted-foreground";
};

const formatCount = (v: number | null | undefined, unit: string) =>
  typeof v === "number" ? `${v.toLocaleString("ko-KR")}${unit}` : `0${unit}`;

export default function AdminV2DashboardPage() {
  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery<DashboardData, Error>({
    queryKey: ["dashboard"],
    queryFn: () => fetchJson<DashboardData>("/api/dashboard", { cache: "no-store" }),
    staleTime: 30_000,
    retry: 1,
  });

  const isBusy = isLoading || isFetching;
  const errorMessage = error?.message ?? null;
  const dashboard = data ?? null;

  const approvalRate = useMemo(() => {
    if (!dashboard) return null;
    if (dashboard.riders.total === 0) return 0;
    return Math.round((dashboard.riders.approved / dashboard.riders.total) * 100);
  }, [dashboard]);

  const stats = useMemo(
    () => [
      {
        label: "승인 라이더",
        value: formatCount(dashboard?.riders.approved, "명"),
        change: dashboard ? `신규 ${formatCount(dashboard.riders.newThisWeek, "명")}` : "불러오는 중",
        trend: "up" as const,
        icon: <UserCheck className="h-5 w-5" />,
      },
      {
        label: "대기 라이더",
        value: formatCount(dashboard?.riders.pending, "명"),
        change: dashboard ? `전체 ${formatCount(dashboard.riders.total, "명")}` : "불러오는 중",
        trend: dashboard && dashboard.riders.pending > 0 ? ("down" as const) : ("neutral" as const),
        icon: <Clock4 className="h-5 w-5" />,
      },
      {
        label: "익일 정산 대기",
        value: formatCount(dashboard?.settlement.pendingDaily, "건"),
        change: dashboard ? `총 요청 ${formatCount(dashboard.settlement.totalDaily, "건")}` : "불러오는 중",
        trend: dashboard && dashboard.settlement.pendingDaily > 0 ? ("up" as const) : ("neutral" as const),
        icon: <CalendarClock className="h-5 w-5" />,
      },
      {
        label: "대여금 잔액",
        value: formatKRW(dashboard?.loans.remaining),
        change: dashboard ? `연체 ${formatCount(dashboard.loans.overdue, "명")}` : "불러오는 중",
        trend: dashboard && dashboard.loans.overdue > 0 ? ("down" as const) : ("neutral" as const),
        icon: <Wallet className="h-5 w-5" />,
      },
      {
        label: "지사",
        value: `${dashboard?.branches.total?.toLocaleString("ko-KR") ?? 0}곳`,
        change:
          dashboard && dashboard.branches.missingPolicy > 0
            ? `정산 정책 미설정 ${dashboard.branches.missingPolicy}곳`
            : "정책 연결",
        trend: dashboard && dashboard.branches.missingPolicy > 0 ? ("down" as const) : ("neutral" as const),
        icon: <Building2 className="h-5 w-5" />,
      },
      {
        label: "배정 차량",
        value: `${dashboard?.vehicles.active?.toLocaleString("ko-KR") ?? 0}대`,
        change: dashboard ? `배정률 ${calcRate(dashboard.vehicles.active, dashboard.vehicles.total)}%` : "불러오는 중",
        trend: "neutral" as const,
        icon: <Truck className="h-5 w-5" />,
      },
      {
        label: "진행 프로모션",
        value: `${dashboard?.promotions.active?.toLocaleString("ko-KR") ?? 0}건`,
        change: dashboard ? `예정 ${dashboard.promotions.scheduled}건` : "불러오는 중",
        trend: "up" as const,
        icon: <Megaphone className="h-5 w-5" />,
      },
      {
        label: "품질 경보",
        value: `${calcRiskTotal(dashboard)}`,
        change: dashboard
          ? `정책 ${dashboard.risks.missingPolicy} · 미배정 ${dashboard.risks.unassignedVehicles}`
          : "불러오는 중",
        trend: dashboard && calcRiskTotal(dashboard) > 0 ? ("down" as const) : ("neutral" as const),
        icon: <ShieldAlert className="h-5 w-5" />,
      },
    ],
    [dashboard]
  );

  const actionItems: ActionItem[] = useMemo(
    () => [
      {
        title: "승인 대기 라이더",
        value: formatCount(dashboard?.riders.pending, "명"),
        detail: dashboard ? `이번 주 신규 ${formatCount(dashboard.riders.newThisWeek, "명")}` : "불러오는 중",
        href: "/riders?status=pending",
      },
      {
        title: "익일 정산 승인/반려",
        value: formatCount(dashboard?.settlement.pendingDaily, "건"),
        detail: dashboard?.settlement.avgSlaDays
          ? `SLA ${dashboard.settlement.avgSlaDays.toFixed(1)}일`
          : "SLA 계산 중",
        href: "/settlement-requests",
      },
      {
        title: "대여금 연체/오늘 납부",
        value: dashboard
          ? `${formatCount(dashboard.loans.overdue, "명")}`
          : "불러오는 중",
        detail: dashboard ? `오늘 납부 예정 ${formatCount(dashboard.loans.dueToday, "명")}` : "불러오는 중",
        href: "/loan-management",
      },
      {
        title: "차량 배정 만료 예정",
        value: formatCount(dashboard?.vehicles.expiringSoon, "대"),
        detail: dashboard ? `미배정 ${formatCount(dashboard.vehicles.unassigned, "대")}` : "불러오는 중",
        href: "/lease-rentals",
      },
      {
        title: "종료 임박 프로모션",
        value: formatCount(dashboard?.promotions.endingSoon, "건"),
        detail: dashboard ? `진행 ${formatCount(dashboard.promotions.active, "건")}` : "불러오는 중",
        href: "/promotions",
      },
    ],
    [dashboard]
  );

  const onboardingStats: MiniStat[] = useMemo(
    () => [
      {
        label: "이번 주 가입",
        value: formatCount(dashboard?.riders.newThisWeek, "명"),
        helper: dashboard ? `전체 ${formatCount(dashboard.riders.total, "명")}` : undefined,
      },
      {
        label: "승인율",
        value: approvalRate != null ? `${approvalRate}%` : "0%",
        tone: approvalRate != null && approvalRate >= 80 ? "positive" : "warning",
        helper: "목표 80%",
      },
      {
        label: "반려",
        value: formatCount(dashboard?.riders.rejected, "명"),
        tone: dashboard && dashboard.riders.rejected > 0 ? "warning" : "muted",
        helper: "사유 관리 필요",
      },
      {
        label: "대기",
        value: formatCount(dashboard?.riders.pending, "명"),
        tone: dashboard && dashboard.riders.pending > 0 ? "danger" : "muted",
        helper: "승인 처리",
      },
    ],
    [dashboard, approvalRate]
  );

  const settlementStats: MiniStat[] = useMemo(
    () => [
      {
        label: "익일정산 비중",
        value: dashboard ? calcRate(dashboard.settlement.totalDaily, dashboard.riders.total) + "%" : "0%",
        helper: "주정산 대비",
      },
      {
        label: "승인 SLA",
        value: dashboard?.settlement.avgSlaDays
          ? `${dashboard.settlement.avgSlaDays.toFixed(1)}일`
          : "계산 중",
        tone: dashboard && dashboard.settlement.avgSlaDays && dashboard.settlement.avgSlaDays <= 1 ? "positive" : "warning",
        helper: "목표 1일",
      },
      {
        label: "대기",
        value: formatCount(dashboard?.settlement.pendingDaily, "건"),
        tone: dashboard && dashboard.settlement.pendingDaily > 0 ? "warning" : "muted",
      },
      {
        label: "승인",
        value: formatCount(dashboard?.settlement.approvedDaily, "건"),
        tone: "positive",
      },
    ],
    [dashboard]
  );

  const branchStats: MiniStat[] = useMemo(
    () => [
      { label: "지사", value: `${dashboard?.branches.total ?? 0}곳` },
      { label: "정산 정책 미설정", value: `${dashboard?.branches.missingPolicy ?? 0}곳`, tone: dashboard && dashboard.branches.missingPolicy > 0 ? "warning" : "muted" },
      { label: "배정 차량", value: `${dashboard?.vehicles.active ?? 0}대`, helper: `총 ${dashboard?.vehicles.total ?? 0}대` },
      { label: "미배정 차량", value: `${dashboard?.vehicles.unassigned ?? 0}대`, tone: dashboard && dashboard.vehicles.unassigned > 0 ? "danger" : "muted" },
    ],
    [dashboard]
  );

  const promoStats: MiniStat[] = useMemo(
    () => [
      { label: "진행", value: formatCount(dashboard?.promotions.active, "건"), tone: "positive" },
      { label: "예정", value: formatCount(dashboard?.promotions.scheduled, "건") },
      {
        label: "종료 임박",
        value: formatCount(dashboard?.promotions.endingSoon, "건"),
        tone: dashboard && dashboard.promotions.endingSoon > 0 ? "warning" : "muted",
      },
      { label: "총 합", value: formatCount(dashboard?.promotions.total, "건"), helper: "상태별 합계" },
    ],
    [dashboard]
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="운영 대시보드"
        description="라이더 · 정산 · 지사 · 운영 현황을 한눈에 보고 바로 조치하세요."
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1 text-foreground">
              기본 기간: 최근 7일
            </span>
            <span className="hidden sm:inline text-muted-foreground">·</span>
            <span className="rounded-full border border-dashed border-border px-3 py-1">
              차트/표는 추후 실제 데이터 연결
            </span>
            {isBusy && (
              <span className="rounded-full bg-muted px-3 py-1 text-foreground">
                데이터 갱신 중...
              </span>
            )}
          </div>
        }
      />

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <DashboardStats stats={stats} />

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <GlassCard
            title="오늘 처리할 일"
            icon={<ClipboardList className="h-4 w-4" />}
            action={
              <Link
                href="/riders"
                className="text-xs font-semibold text-primary hover:underline"
              >
                전체 보기
              </Link>
            }
          >
            <div className="divide-y divide-border/60">
              {actionItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex flex-col gap-1 py-3 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between md:gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {item.value}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-primary">
                    바로가기 →
                  </span>
                </Link>
              ))}
            </div>
          </GlassCard>

          <GlassCard
            title="라이더 온보딩 & 정산"
            icon={<BadgeCheck className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>데이터 소스: riders, rider_settlement_requests</span>
              </div>
            }
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-3 flex items-center justify-between text-sm font-semibold text-foreground">
                  가입/승인 흐름
                  <Link
                    href="/riders"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    라이더 관리
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {onboardingStats.map((stat) => (
                    <MiniStatBlock key={stat.label} stat={stat} />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-3 flex items-center justify-between text-sm font-semibold text-foreground">
                  정산 요청/SLA
                  <Link
                    href="/settlement-requests"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    익일정산
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {settlementStats.map((stat) => (
                    <MiniStatBlock key={stat.label} stat={stat} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <PlaceholderTile
                title="가입→승인 전환 퍼널"
                description="일/주간 전환율, 이탈 사유"
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <PlaceholderTile
                title="지사별 라이더 분포"
                description="platform/지역별 라이더 수"
                icon={<Map className="h-4 w-4" />}
              />
              <PlaceholderTile
                title="정산 모드 추이"
                description="daily vs weekly 변화"
                icon={<Activity className="h-4 w-4" />}
              />
            </div>
          </GlassCard>

          <GlassCard
            title="운영 리소스 (지사·차량·대여금)"
            icon={<Truck className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>데이터 소스: new_branches_with_stats, vehicles, rider_loan_summaries</span>
              </div>
            }
          >
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
                  지사/사업자
                  <Link
                    href="/branches"
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    지사 보기
                  </Link>
                </div>
                <div className="grid gap-2">
                  {branchStats.map((stat) => (
                    <MiniStatLine key={stat.label} stat={stat} />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
                  차량/배정
                  <Link
                    href="/lease-rentals"
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    차량 관리
                  </Link>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <MiniLine label="총 차량 · 배정률" value={`${dashboard?.vehicles.total ?? 0}대 · ${calcRate(dashboard?.vehicles.active, dashboard?.vehicles.total)}%`} />
                  <MiniLine label="미배정 차량" value={`${dashboard?.vehicles.unassigned ?? 0}대`} tone={dashboard && dashboard.vehicles.unassigned > 0 ? "warning" : undefined} />
                  <MiniLine label="만료 임박(7일)" value={`${dashboard?.vehicles.expiringSoon ?? 0}대`} tone={dashboard && dashboard.vehicles.expiringSoon > 0 ? "danger" : undefined} />
                  <MiniLine label="배정 건수" value={`${dashboard?.vehicles.activeAssignments ?? 0}건`} />
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
                  대여금/현금흐름
                  <Link
                    href="/loan-management"
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    대여금 관리
                  </Link>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <MiniLine label="잔액" value={formatKRW(dashboard?.loans.remaining)} />
                  <MiniLine label="총 대여금" value={formatKRW(dashboard?.loans.totalLoan)} />
                  <MiniLine label="연체" value={`${dashboard?.loans.overdue ?? 0}명`} tone={dashboard && dashboard.loans.overdue > 0 ? "danger" : undefined} />
                  <MiniLine label="오늘 납부 예정" value={`${dashboard?.loans.dueToday ?? 0}명`} tone={dashboard && dashboard.loans.dueToday > 0 ? "warning" : undefined} />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard
            title="프로모션 / 캠페인"
            icon={<Megaphone className="h-4 w-4" />}
            action={
              <Link
                href="/promotions"
                className="text-xs font-semibold text-primary hover:underline"
              >
                프로모션 관리
              </Link>
            }
          >
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {promoStats.map((stat) => (
                  <MiniStatBlock key={stat.label} stat={stat} />
                ))}
              </div>
              <PlaceholderTile
                title="지사별 활성 여부"
                description="배정/비배정 지사, 플랫폼별 효과"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <PlaceholderTile
                title="성과 요약"
                description="전환/매출 기여 추적 그래프"
                icon={<BarChart3 className="h-4 w-4" />}
              />
            </div>
          </GlassCard>

          <GlassCard
            title="운영 위험 & 품질 경보"
            icon={<AlertTriangle className="h-4 w-4" />}
            action={
              <span className="text-[11px] text-muted-foreground">
                데이터 소스: riders, new_branches, vehicle_assignments
              </span>
            }
          >
            <ul className="space-y-3 text-sm">
              <RiskRow label="정산 정책 미설정 지사" value={`${dashboard?.risks.missingPolicy ?? 0}곳`} tone={dashboard && dashboard.risks.missingPolicy > 0 ? "warning" : undefined} />
              <RiskRow label="미배정 차량" value={`${dashboard?.risks.unassignedVehicles ?? 0}대`} tone={dashboard && dashboard.risks.unassignedVehicles > 0 ? "danger" : undefined} />
              <RiskRow label="대여금 연체" value={`${dashboard?.risks.overdueLoans ?? 0}건`} tone={dashboard && dashboard.risks.overdueLoans > 0 ? "danger" : undefined} />
              <RiskRow label="배정 종료 임박 차량" value={`${dashboard?.vehicles.expiringSoon ?? 0}대`} tone={dashboard && dashboard.vehicles.expiringSoon > 0 ? "warning" : undefined} />
              <RiskRow label="기타 데이터 품질 체크" value="확인 필요" tone="warning" />
            </ul>
            <p className="mt-4 text-[11px] text-muted-foreground">
              위 항목은 데이터 품질/보안 체크리스트입니다. 조건과 기준은 운영 룰에 맞게 조정해 주세요.
            </p>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}

function MiniStatBlock({ stat }: { stat: MiniStat }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/60 p-3">
      <div className="text-[11px] text-muted-foreground">{stat.label}</div>
      <div className={`text-base font-semibold ${toneClass(stat.tone)}`}>
        {stat.value}
      </div>
      {stat.helper && (
        <div className="text-[11px] text-muted-foreground">{stat.helper}</div>
      )}
    </div>
  );
}

function PlaceholderTile({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
      <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="text-xs text-muted-foreground">{description}</div>
      <div className="mt-2 text-[11px] text-muted-foreground/80">
        차트/테이블 연결 예정
      </div>
    </div>
  );
}

function MiniStatLine({ stat }: { stat: MiniStat }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div className="text-muted-foreground">{stat.label}</div>
      <div className={`text-right text-sm font-semibold ${toneClass(stat.tone)}`}>
        {stat.value}
        {stat.helper && (
          <div className="text-[11px] text-muted-foreground">{stat.helper}</div>
        )}
      </div>
    </div>
  );
}

function MiniLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function RiskRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-muted-foreground";
  return (
    <li className="flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${color}`}>●</span>
        <span className="text-foreground">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </li>
  );
}

const calcRate = (part?: number | null, total?: number | null) => {
  if (!total || total <= 0 || !part) return 0;
  return Math.round((part / total) * 100);
};

const calcRiskTotal = (data: DashboardData | null) => {
  if (!data) return 0;
  return (
    (data.risks.missingPolicy || 0) +
    (data.risks.unassignedVehicles || 0) +
    (data.risks.overdueLoans || 0)
  );
};
