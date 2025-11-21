"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPhone } from "@/lib/phone";
import { badgeToneClass, getSettlementRequestStatusMeta } from "@/lib/status";

type SettlementMode = "daily" | "weekly";

type RequestRow = {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  riderStatus: string;
  requestedMode: SettlementMode;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
};

export default function RiderSettlementRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [rows]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rider/settlement-requests");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "익일정산 목록을 불러오지 못했습니다.");
      }
      setRows(Array.isArray(data.requests) ? data.requests : []);
    } catch (e: any) {
      setError(e.message || "익일정산 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (row: RequestRow, action: "approve" | "reject") => {
    if (action === "approve" && row.status === "approved") return;
    let rejectionReason: string | null = null;
    if (action === "reject") {
      rejectionReason = window.prompt("반려 사유를 입력하세요.") || null;
    }
    setActionLoadingId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/riders/${encodeURIComponent(row.riderId)}/settlement-request`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "정산 요청을 처리하지 못했습니다.");
      }
      await load();
    } catch (e: any) {
      setError(e.message || "정산 요청을 처리하지 못했습니다.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            라이더 관리 / 익일정산
          </div>
          <h1 className="text-lg font-semibold text-foreground">익일정산 목록</h1>
          <p className="text-sm text-muted-foreground">
            익일 정산을 신청했거나 적용 중인 라이더 목록입니다. 상태를 확인하고 필요 시 상세에서 처리하세요.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/riders"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            라이더 목록
          </Link>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            새로고침
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          불러오는 중입니다...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && sortedRows.length === 0 && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
          익일 정산을 신청하거나 적용 중인 라이더가 없습니다.
        </div>
      )}

      {!loading && !error && sortedRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">라이더</th>
                <th className="px-4 py-3 text-left font-medium">전화번호</th>
                <th className="px-4 py-3 text-left font-medium">요청</th>
                <th className="px-4 py-3 text-left font-medium">상태</th>
                <th className="px-4 py-3 text-left font-medium">신청일</th>
                <th className="px-4 py-3 text-left font-medium">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedRows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => router.push(`/riders/${encodeURIComponent(row.riderId)}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{row.riderName}</div>
                    <div className="text-[11px] text-muted-foreground">{row.riderStatus}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatPhone(row.riderPhone) || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {row.requestedMode === "daily" ? "익일 정산 요청" : "주 정산 변경"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const meta = getSettlementRequestStatusMeta(row.status);
                      return (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${badgeToneClass(meta.tone)}`}
                        >
                          {meta.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.status === "approved" ? (
                      <div className="text-[11px] text-muted-foreground">승인 처리 완료</div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={actionLoadingId === row.id}
                          onClick={() => handleAction(row, "approve")}
                          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === row.id}
                          onClick={() => handleAction(row, "reject")}
                          className="inline-flex h-8 items-center rounded-md border border-red-200 bg-red-50 px-3 text-[11px] font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          반려
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
