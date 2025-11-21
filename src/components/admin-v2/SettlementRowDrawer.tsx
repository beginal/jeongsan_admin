"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

export type SettlementDetailRow = {
  licenseId: string;
  riderName: string;
  riderSuffix: string;
  branchName: string;
  orderCount: number;
  settlementAmount?: number;
  supportTotal?: number;
  deduction?: number;
  totalSettlement?: number;
  overallTotal?: number;
  fee?: number;
  loanPayment?: number;
  rentCostValue?: number;
  employment?: number;
  accident?: number;
  timeInsurance?: number;
  retro?: number;
  withholding?: number;
  promoBasis?: string;
  promoAmount?: number;
  peakScore?: string;
  matchedRiderName?: string;
};

type SettlementRowDrawerProps = {
  open: boolean;
  row: SettlementDetailRow | null;
  variant: "daily" | "weekly";
  missionDates?: string[];
  missionTotals?: Record<string, Record<string, number>>;
  onClose: () => void;
  onClosed?: () => void;
};

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null) return "-";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "-";
  return `${num.toLocaleString()}원`;
};

const formatCurrencyWithSign = (value?: number | null) => {
  if (value === undefined || value === null) return { text: "-", negative: false };
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return { text: "-", negative: false };
  return { text: `${num.toLocaleString()}원`, negative: num < 0 };
};

const formatMissionLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${mm}/${dd}(${weekday})`;
};

type StatItem = {
  label: string;
  text: string;
  highlight?: boolean;
  negative?: boolean;
};

const StatCard = ({ label, text, highlight, negative }: StatItem) => (
  <div
    className={`rounded-lg border border-border bg-background px-3 py-2 shadow-sm ${
      highlight ? "ring-1 ring-primary/30" : ""
    }`}
  >
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div
      className={`text-sm font-semibold ${
        negative ? "text-red-600 dark:text-red-300" : highlight ? "text-primary" : "text-foreground"
      }`}
    >
      {text}
    </div>
  </div>
);

const SectionLabel = ({ children }: { children: string }) => (
  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</div>
);

export default function SettlementRowDrawer({
  open,
  row,
  variant,
  missionDates = [],
  missionTotals = {},
  onClose,
  onClosed,
}: SettlementRowDrawerProps) {
  const [mounted, setMounted] = useState(open);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setAnimate(true));
    } else if (mounted) {
      setAnimate(false);
      const timer = setTimeout(() => {
        setMounted(false);
        onClosed?.();
      }, 260);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, mounted, onClosed]);

  useEffect(() => {
    if (!mounted) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mounted, onClose]);

  const missionList = useMemo(() => {
    if (!row || missionDates.length === 0) return [];
    return missionDates
      .map((date) => ({
        date,
        label: formatMissionLabel(date),
        amount: missionTotals?.[date]?.[row.licenseId] || 0,
      }))
      .filter((item) => item.amount);
  }, [missionDates, missionTotals, row]);

  const missionTotal = useMemo(
    () => missionList.reduce((acc, cur) => acc + (cur.amount || 0), 0),
    [missionList]
  );

  if (!mounted || !row) return null;

  const mainTotals: StatItem[] =
    variant === "weekly"
      ? [
          {
            label: "최종 합계",
            ...formatCurrencyWithSign(row.overallTotal ?? row.totalSettlement),
            highlight: true,
          },
          { label: "총 정산금액", ...formatCurrencyWithSign(row.totalSettlement) },
          { label: "프로모션/미션 합계", ...formatCurrencyWithSign((row.promoAmount || 0) + missionTotal) },
          { label: "원천세 (3.3%)", ...formatCurrencyWithSign(row.withholding) },
        ]
      : [
          { label: "총 정산금액", ...formatCurrencyWithSign(row.totalSettlement), highlight: true },
          { label: "정산금액", ...formatCurrencyWithSign(row.settlementAmount) },
          { label: "지원/미션 합계", ...formatCurrencyWithSign((row.supportTotal || 0) + missionTotal) },
          { label: "원천세 (3.3%)", ...formatCurrencyWithSign(row.withholding) },
        ];

  const incomeStats: StatItem[] = [
    { label: "정산금액", ...formatCurrencyWithSign(row.settlementAmount) },
    { label: "총 지원금", ...formatCurrencyWithSign(row.supportTotal) },
    variant === "weekly" ? { label: "프로모션 합계", ...formatCurrencyWithSign(row.promoAmount) } : null,
    {
      label: "미션 합계",
      ...formatCurrencyWithSign(missionTotal || null),
    },
  ].filter(Boolean) as StatItem[];

  const deductionStats: StatItem[] = [
    variant === "daily" ? { label: "대여금 납부", ...formatCurrencyWithSign(row.loanPayment) } : null,
    { label: "렌트/대여료", ...formatCurrencyWithSign(row.rentCostValue) },
    { label: "수수료", ...formatCurrencyWithSign(row.fee) },
    { label: "차감내역", ...formatCurrencyWithSign(row.deduction) },
    { label: "고용보험", ...formatCurrencyWithSign(row.employment) },
    { label: "산재보험", ...formatCurrencyWithSign(row.accident) },
    { label: "시간제보험", ...formatCurrencyWithSign(row.timeInsurance) },
    { label: "보험료 소급", ...formatCurrencyWithSign(row.retro) },
    { label: "원천세 (3.3%)", ...formatCurrencyWithSign(row.withholding) },
  ].filter(Boolean) as StatItem[];

  const promoLines = (row.promoBasis || "").split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 m-0 flex !mt-0">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`relative ml-auto flex h-full w-full max-w-xl transform flex-col border-l border-border bg-card shadow-2xl mt-5 pb-5 transition-all duration-300 rounded-tl-[10px] ${
          animate ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-3 pb-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">정산 상세 보기</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-foreground">{row.riderName}</span>
              <span className="rounded-full border border-border px-2 py-[3px] text-[11px] text-muted-foreground">
                뒷번호 {row.riderSuffix}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">라이선스 {row.licenseId}</span>
              <span className="rounded-full border border-border px-2 py-1 text-foreground/80">지사 {row.branchName}</span>
              <span className="rounded-full border border-border px-2 py-1 text-foreground">
                오더 {row.orderCount.toLocaleString()}건
              </span>
              {row.matchedRiderName && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                  매칭 {row.matchedRiderName}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-7">
          <div className="space-y-2">
            <SectionLabel>정산 합계</SectionLabel>
            <div className="grid grid-cols-1 gap-3">
              {mainTotals.map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  text={stat.text}
                  highlight={stat.highlight}
                  negative={stat.negative}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>수입 · 지원</SectionLabel>
            <div className="grid grid-cols-1 gap-3">
              {incomeStats.map((stat) => (
                <StatCard key={stat.label} label={stat.label} text={stat.text} negative={stat.negative} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>공제 · 비용</SectionLabel>
            <div className="grid grid-cols-1 gap-3">
              {deductionStats.map((stat) => (
                <StatCard key={stat.label} label={stat.label} text={stat.text} negative={stat.negative} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>미션 / 프로모션</SectionLabel>
            <div className="rounded-lg border border-border bg-background p-3 text-xs text-foreground">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>미션 합계</span>
                <span
                  className={`font-semibold ${
                    missionTotal < 0 ? "text-red-600 dark:text-red-300" : "text-foreground"
                  }`}
                >
                  {missionTotal ? formatCurrency(missionTotal) : "-"}
                </span>
              </div>
              {missionList.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {missionList.map((m) => (
                    <div key={m.date} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
                      <span className="text-[11px] text-muted-foreground">{m.label}</span>
                      <span
                        className={`text-sm font-semibold ${
                          m.amount < 0 ? "text-red-600 dark:text-red-300" : "text-purple-700 dark:text-purple-200"
                        }`}
                      >
                        {formatCurrency(m.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                  적용된 미션 금액이 없습니다.
                </div>
              )}

              {variant === "weekly" && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>프로모션 합계</span>
                    <span
                      className={`text-sm font-semibold ${
                        (row.promoAmount || 0) < 0 ? "text-red-600 dark:text-red-300" : "text-blue-700 dark:text-blue-200"
                      }`}
                    >
                      {formatCurrency(row.promoAmount)}
                    </span>
                  </div>
                  {promoLines.length > 0 ? (
                    <ul className="space-y-1">
                      {promoLines.map((line, idx) => (
                        <li key={`${line}-${idx}`} className="rounded-md border border-border px-2 py-1 text-[11px]">
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                      설정된 프로모션 요약이 없습니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>기타 정보</SectionLabel>
            <div className="rounded-lg border border-border bg-background p-3 text-xs text-foreground">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">오더 수</span>
                <span className="text-sm font-semibold text-foreground">{row.orderCount.toLocaleString()} 건</span>
              </div>
              {variant === "weekly" && row.peakScore && row.peakScore !== "-" && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">피크 스코어</span>
                  <span className="text-sm font-semibold text-foreground">{row.peakScore}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
