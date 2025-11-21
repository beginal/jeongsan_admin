'use client';

import { useEffect, useState } from "react";

type SettlementMode = "daily" | "weekly";

type PendingRequest = {
  id: string;
  requestedMode: SettlementMode;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
};

type SettlementState = {
  mode: SettlementMode;
  pendingRequest: PendingRequest | null;
};

interface RiderSettlementCardProps {
  riderId: string;
}

export function RiderSettlementCard({ riderId }: RiderSettlementCardProps) {
  const [state, setState] = useState<SettlementState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderId]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/riders/${encodeURIComponent(riderId)}/settlement-request`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "정산 상태를 불러오지 못했습니다.");
      }
      setState(data.settlement as SettlementState);
    } catch (e: any) {
      setError(e.message || "정산 상태를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (!state?.pendingRequest) return;
    let rejectionReason: string | null = null;
    if (action === "reject") {
      rejectionReason = window.prompt("반려 사유를 입력하세요.") || null;
    }
    setActionLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/riders/${encodeURIComponent(riderId)}/settlement-request`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "정산 요청을 처리하지 못했습니다.");
      }
      setState(data.settlement as SettlementState);
      setActionMessage(
        action === "approve" ? "승인 완료: 정산 주기가 업데이트되었습니다." : "반려 처리되었습니다."
      );
      setTimeout(() => setActionMessage(null), 2500);
    } catch (e: any) {
      setError(e.message || "정산 요청을 처리하지 못했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const pending = state?.pendingRequest;
  const mode = state?.mode ?? "weekly";

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">정산 주기</div>
          <div className="text-sm font-semibold text-foreground">
            {mode === "daily" ? "익일 정산" : "주 정산"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {mode === "daily" ? "익일 정산이 적용된 라이더입니다." : "현재 주 정산 주기입니다."}
          </div>
        </div>
        {loading ? (
          <div className="text-[11px] text-muted-foreground">불러오는 중...</div>
        ) : pending ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
              승인 대기
            </span>
            <span>
              요청: {pending.requestedMode === "daily" ? "익일 정산 전환" : "주 정산 전환"}
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">대기 중인 요청 없음</div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}
      {actionMessage && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
          {actionMessage}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={refresh}
          className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 font-medium text-foreground hover:bg-muted"
          disabled={loading}
        >
          새로고침
        </button>
        {pending && (
          <>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleAction("approve")}
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              승인
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleAction("reject")}
              className="inline-flex h-8 items-center rounded-md border border-red-200 bg-red-50 px-3 font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              반려
            </button>
          </>
        )}
      </div>
    </div>
  );
}
