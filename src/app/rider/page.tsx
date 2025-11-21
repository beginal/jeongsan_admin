"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { cn } from "@/lib/utils";

type RiderStatus = "approved" | "pending" | "rejected";
type SettlementMode = "daily" | "weekly";

type RiderProfile = {
  id: string;
  name: string;
  phone: string;
  baeminId?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  taxName?: string | null;
  taxResidentNumber?: string | null;
  verificationStatus?: RiderStatus;
  rejectionReason?: string | null;
  branch?: {
    id: string;
    name: string;
    region?: string;
  } | null;
};

type SettlementRequest = {
  id: string;
  requestedMode: SettlementMode;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  requestedAt?: string;
  decidedAt?: string;
};

type SettlementState = {
  mode: SettlementMode;
  pendingRequest: SettlementRequest | null;
};

type LoanSummary = {
  total: number;
  remaining: number;
  paid: number;
  nextPayment?: string | null;
};

const formatPhone = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
};

export default function RiderLandingPage() {
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementState | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, settlementRes, loanRes] = await Promise.all([
          fetch("/api/rider/me", { credentials: "include" }),
          fetch("/api/rider/settlement-request", { credentials: "include" }),
          fetch("/api/loans?riderOnly=true", { credentials: "include" }),
        ]);

        const profileData = await profileRes.json().catch(() => ({}));
        const settlementData = await settlementRes.json().catch(() => ({}));
        const loanData = await loanRes.json().catch(() => ({}));

        if (!profileRes.ok || profileData?.error) {
          throw new Error(profileData?.error || "라이더 정보를 불러오지 못했습니다.");
        }
        if (!settlementRes.ok || settlementData?.error) {
          throw new Error(settlementData?.error || "정산 상태를 불러오지 못했습니다.");
        }
        if (!loanRes.ok || loanData?.error) {
          throw new Error(loanData?.error || "대여금 정보를 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setProfile(profileData.rider as RiderProfile);
          setSettlement(settlementData.settlement as SettlementState);
          if (Array.isArray(loanData.loans) && loanData.loans.length > 0) {
            const first = loanData.loans[0] as any;
            setLoanSummary({
              total: Number(first.totalLoan || first.total || 0),
              remaining: Number(first.remainingAmount || first.remaining || 0),
              paid: Number(first.paidAmount || first.paid || 0),
              nextPayment: first.nextPaymentDate || first.paymentDate || null,
            });
          } else {
            setLoanSummary(null);
          }
          setSettlementError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "라이더 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusMeta = useMemo(() => {
    const status = profile?.verificationStatus ?? "pending";
    if (status === "approved") {
      return {
        state: status,
        label: "승인됨",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
        description: "승인 완료 – 모든 기능을 사용할 수 있습니다.",
      };
    }
    if (status === "rejected") {
      return {
        state: status,
        label: "승인 반려",
        className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        description:
          profile?.rejectionReason ||
          "승인이 반려되었습니다. 담당 지사에 문의해 주세요.",
      };
    }
    return {
      state: "pending" as RiderStatus,
      label: "승인 대기",
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
      description: "승인 완료 후 익일 정산 요청을 보낼 수 있습니다.",
    };
  }, [profile?.verificationStatus, profile?.rejectionReason]);

  const isApproved = statusMeta.state === "approved";

  const pendingRequest = settlement?.pendingRequest;
  const isPendingDaily =
    pendingRequest?.status === "pending" && pendingRequest?.requestedMode === "daily";
  const isPendingWeekly =
    pendingRequest?.status === "pending" && pendingRequest?.requestedMode === "weekly";
  const settlementMode = settlement?.mode ?? "weekly";
  const settlementSummary =
    settlementMode === "daily"
      ? "익일 정산 활성화 상태입니다."
      : "현재 주 정산 주기를 사용 중입니다.";

  const maskedAccount = useMemo(() => {
    if (!profile?.accountNumber) return "-";
    const digits = profile.accountNumber.replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, Math.max(1, digits.length - 4))}****`;
  }, [profile?.accountNumber]);

  const maskedTaxSsn = useMemo(() => {
    const raw = profile?.taxResidentNumber || "";
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "-";
    if (digits.length <= 6) return `${digits}${digits.length > 0 ? "-" : ""}${"*".repeat(Math.max(1, digits.length - 6))}`;
    const after = digits.slice(6);
    return `${digits.slice(0, 6)}-${"*".repeat(Math.max(1, after.length))}`;
  }, [profile?.taxResidentNumber]);

  const refreshSettlement = async () => {
    try {
      const res = await fetch("/api/rider/settlement-request", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "정산 상태를 불러오지 못했습니다.");
      }
      setSettlement(data.settlement as SettlementState);
      setSettlementError(null);
    } catch (e: any) {
      setSettlementError(e.message || "정산 상태를 불러오지 못했습니다.");
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore fetch errors; we'll still redirect
    } finally {
      setActionLoading(false);
      window.location.href = "/login";
    }
  };

  const handleSettlementRequest = async (mode: SettlementMode) => {
    setActionLoading(true);
    setActionMessage(null);
    setSettlementError(null);
    setActionError(null);
    try {
      const res = await fetch("/api/rider/settlement-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "정산 요청을 전송하지 못했습니다.");
      }
      setSettlement(data.settlement as SettlementState);
      setActionMessage(
        mode === "daily"
          ? "익일 정산 요청이 접수되었습니다. 관리자 승인 후 적용됩니다."
          : "주 정산 변경 요청이 접수되었습니다."
      );
    } catch (e: any) {
      setActionError(e.message || "정산 요청을 전송하지 못했습니다.");
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 2500);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await fetch("/api/rider/settlement-request", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "정산 요청을 취소하지 못했습니다.");
      }
      setSettlement(data.settlement as SettlementState);
      setActionMessage("정산 요청을 취소했습니다.");
    } catch (e: any) {
      setActionError(e.message || "정산 요청을 취소하지 못했습니다.");
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 2500);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-6">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">라이더 포털</div>
          <div className="text-xl font-semibold text-foreground">
            {profile?.name || "라이더"}님
          </div>
          <div className="text-sm text-muted-foreground">
            {profile?.branch?.name || "-"} {profile?.branch?.region ? `· ${profile.branch.region}` : ""}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", statusMeta.className)}>
              {statusMeta.label}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {statusMeta.state === "approved" ? settlementSummary : statusMeta.description}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {pendingRequest ? (
            <>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                승인 대기
              </span>
              <GlassButton
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={handleCancelRequest}
                className="text-amber-800 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20"
              >
                요청 취소
              </GlassButton>
            </>
          ) : settlementMode === "weekly" ? (
            <GlassButton
              variant="primary"
              size="sm"
              disabled={!isApproved || isPendingDaily || actionLoading}
              title={
                isApproved ? (isPendingDaily ? "승인 대기 중" : "") : "승인 완료 후 사용 가능합니다."
              }
              onClick={() => handleSettlementRequest("daily")}
            >
              {isPendingDaily ? "승인 대기" : "익일 정산 요청"}
            </GlassButton>
          ) : (
            <GlassButton
              variant="primary"
              size="sm"
              disabled={!isApproved || isPendingWeekly || actionLoading}
              title={
                isApproved ? (isPendingWeekly ? "승인 대기 중" : "") : "승인 완료 후 사용 가능합니다."
              }
              onClick={() => handleSettlementRequest("weekly")}
            >
              {isPendingWeekly ? "주 정산 변경 대기" : "주 정산으로 변경 요청"}
            </GlassButton>
          )}
          <GlassButton
            variant="outline"
            size="sm"
            className="border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            onClick={handleLogout}
            disabled={actionLoading}
          >
            로그아웃
          </GlassButton>
        </div>
      </GlassCard>

      {loading && (
        <GlassCard className="text-sm text-muted-foreground">
          불러오는 중입니다...
        </GlassCard>
      )}
      {error && (
        <GlassCard className="border-red-200 bg-red-50/50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </GlassCard>
      )}
      {settlementError && !loading && (
        <GlassCard className="flex items-start justify-between gap-3 border-red-200 bg-red-50/50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex-1">{settlementError}</div>
          <GlassButton
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-[11px] font-medium underline hover:bg-transparent text-red-700"
            onClick={refreshSettlement}
          >
            다시 불러오기
          </GlassButton>
        </GlassCard>
      )}
      {actionMessage && (
        <GlassCard className="border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">
          {actionMessage}
        </GlassCard>
      )}
      {actionError && (
        <GlassCard className="border-red-200 bg-red-50/50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          {actionError}
        </GlassCard>
      )}

      {profile && !loading && !error && (
        <>
          <GlassCard>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">정산 주기</div>
                <div className="text-sm font-medium text-foreground">
                  {settlementMode === "daily" ? "익일 정산" : "주 정산"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {settlementSummary}
                </div>
              </div>
              {pendingRequest && (
                <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  {pendingRequest.requestedMode === "daily"
                    ? "익일 정산 요청이 승인 대기 중입니다."
                    : "주 정산 변경 요청이 승인 대기 중입니다."}
                </div>
              )}
              {!pendingRequest && settlementMode === "daily" && (
                <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 px-3 py-2 text-[11px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">
                  익일 정산이 적용되었습니다. 필요 시 주 정산으로 전환 요청을 보낼 수 있습니다.
                </div>
              )}
            </div>
          </GlassCard>

          <section className="grid gap-4 md:grid-cols-2">
            <GlassCard title="기본 정보" className="space-y-3">
              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-muted-foreground">이름</span>
                <span className="font-medium text-foreground">{profile.name || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">휴대폰</span>
                <span className="font-medium text-foreground">{formatPhone(profile.phone || "") || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">배민 ID</span>
                <span className="font-medium text-foreground">{profile.baeminId || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">소속 지사</span>
                <span className="font-medium text-foreground">
                  {profile.branch?.name || "-"} {profile.branch?.region ? `(${profile.branch.region})` : ""}
                </span>
              </div>
            </GlassCard>

            <GlassCard title="정산 계좌" className="space-y-3">
              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-muted-foreground">은행</span>
                <span className="font-medium text-foreground">{profile.bankName || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">예금주</span>
                <span className="font-medium text-foreground">{profile.accountHolder || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">계좌번호</span>
                <span className="font-medium text-foreground">{maskedAccount}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                계좌 정보 수정은 담당 지사에 문의해 주세요.
              </p>
            </GlassCard>

            <GlassCard title="원천세 신고 정보" className="space-y-3">
              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-muted-foreground">신고 이름</span>
                <span className="font-medium text-foreground">{profile.taxName || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">주민등록번호</span>
                <span className="font-medium text-foreground">{maskedTaxSsn}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                신고 정보 변경이 필요한 경우 담당 지사에 문의해 주세요.
              </p>
            </GlassCard>
          </section>

          {loanSummary && (
            <GlassCard>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">대여금</div>
                  <div className="text-sm font-semibold text-foreground">
                    잔여 {loanSummary.remaining.toLocaleString()}원
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    총 {loanSummary.total.toLocaleString()}원 · 상환 {loanSummary.paid.toLocaleString()}원
                  </div>
                </div>
                <div className="rounded-full border border-amber-200 bg-amber-50/50 px-3 py-1 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400">
                  {loanSummary.nextPayment
                    ? `다음 납부 예정 ${loanSummary.nextPayment?.split("T")[0]}`
                    : "다음 납부 예정 없음"}
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                대여금 상환 정보에 대해 문의가 필요하면 담당 지사에 연락해 주세요.
              </p>
            </GlassCard>
          )}

          <GlassCard title="정산 내역">
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-muted-foreground">추후 업데이트 예정입니다.</span>
            </div>
            <div className="mt-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
              정산 내역 조회 기능이 곧 제공될 예정입니다.
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
