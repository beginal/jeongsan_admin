"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

type LoanRow = {
  id: string;
  riderId: string;
  riderName: string;
  branchName: string;
  totalLoan: number;
  remainingAmount: number;
  paidAmount: number;
  loanDate: string;
  paymentDate: string | null;
};

const formatCurrency = (v: number) => v.toLocaleString();
const formatDate = (v: string | null) => (v ? String(v).split("T")[0] : "-");

export default function LoanManagementPage() {
  const [search, setSearch] = useState("");
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/loans");
      if (!res.ok) {
        throw new Error("대여금 데이터를 불러오지 못했습니다.");
      }
      const data = (await res.json()) as { loans?: LoanRow[] };
      setLoans(Array.isArray(data.loans) ? data.loans : []);
    } catch (e: any) {
      setError(e.message || "대여금 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return loans;
    return loans.filter((l) => l.riderName.toLowerCase().includes(q));
  }, [loans, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, cur) => {
          acc.total += cur.totalLoan;
          acc.remaining += cur.remainingAmount;
          acc.paid += cur.paidAmount;
          return acc;
        },
        { total: 0, remaining: 0, paid: 0 }
      ),
    [filtered]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">자금 관리 / Loan</div>
            <h1 className="text-lg font-semibold text-foreground">대여금 관리</h1>
            <p className="text-xs text-muted-foreground">
              라이더 대여금, 상환 진행 상황, 다음 납부 일정을 한 곳에서 관리합니다.
            </p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <div className="relative">
            <input
              className="h-9 rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="라이더명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
              🔍
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={loadLoans} disabled={loading} isLoading={loading}>
            새로고침
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.location.href = "/loan-management/new"}>
            + 대여금 추가
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full bg-card px-2 py-0.5 text-muted-foreground">
          총 {filtered.length}명
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
          총 대여금 {formatCurrency(totals.total)}원
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
          잔여 {formatCurrency(totals.remaining)}원
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
          납부 완료 {formatCurrency(totals.paid)}원
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">라이더명</th>
              <th className="px-4 py-3 text-left font-semibold">지사</th>
              <th className="px-4 py-3 text-right font-semibold">총 대여금</th>
              <th className="px-4 py-3 text-right font-semibold">잔여 금액</th>
              <th className="px-4 py-3 text-right font-semibold">납부 완료 금액</th>
              <th className="px-4 py-3 text-center font-semibold">대여 일자</th>
              <th className="px-4 py-3 text-center font-semibold">납부일</th>
              <th className="px-4 py-3 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`loan-skel-${idx}`} className="animate-pulse">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-16 mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-20 mx-auto" /></td>
                  </tr>
                ))
              : filtered.map((loan) => (
              <tr
                key={loan.id}
                className="hover:bg-muted/40 cursor-pointer"
                onClick={() => (window.location.href = `/loan-management/${loan.id}/edit`)}
              >
                <td className="px-4 py-3 font-medium text-foreground">{loan.riderName}</td>
                <td className="px-4 py-3 text-left text-muted-foreground">{loan.branchName || "-"}</td>
                <td className="px-4 py-3 text-right text-foreground">
                  {formatCurrency(loan.totalLoan)}원
                </td>
                <td className="px-4 py-3 text-right text-amber-700">
                  {formatCurrency(loan.remainingAmount)}원
                </td>
                <td className="px-4 py-3 text-right text-emerald-700">
                  {formatCurrency(loan.paidAmount)}원
                </td>
                <td className="px-4 py-3 text-center text-foreground">{formatDate(loan.loanDate)}</td>
                <td className="px-4 py-3 text-center text-foreground">{formatDate(loan.paymentDate)}</td>
                <td className="px-4 py-3 text-center text-[11px] text-muted-foreground">
                  행 클릭으로 수정
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6">
                  <EmptyState
                    title={loading ? "불러오는 중" : "검색된 대여금이 없습니다"}
                    description={loading ? "데이터를 불러오고 있습니다." : "필터를 다시 설정하거나 신규 대여금을 등록해 주세요."}
                    action={
                      !loading && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => (window.location.href = "/loan-management/new")}
                        >
                          새 대여금 등록
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
