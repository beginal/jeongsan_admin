"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

type RentalStatus = "active" | "inactive";

type LeaseRental = {
  id: string;
  plate: string;
  riderName: string;
  riderSuffix: string;
  riderId?: string;
  vehicleType: string;
  contractType: string;
  dailyFee: number;
  status: RentalStatus;
  startDate: string;
  endDate: string;
};

const statusBadge = (status: RentalStatus) =>
  status === "active"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-slate-100 text-slate-600 border-slate-200";

const formatVehicle = (value: string) => {
  const v = (value || "").toLowerCase();
  if (v.includes("젠트")) return "젠트로피";
  if (v.includes("gent") || v.includes("gentry") || v.includes("g") && v.includes("t")) return "젠트로피";
  if (v.includes("pcx")) return "PCX";
  return value || "-";
};

const formatContract = (value: string) => {
  const v = (value || "").toLowerCase();
  if (v === "rent" || v === "렌트") return "렌트";
  if (v === "lease" || v === "리스") return "리스";
  return value || "-";
};

export default function LeaseRentalListPage() {
  const router = useRouter();
  const [rentals, setRentals] = useState<LeaseRental[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/lease-rentals");
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "리스렌탈 목록을 불러오지 못했습니다.");
        }
        if (mounted) setRentals(data.rentals || []);
      } catch (e: any) {
        if (mounted) setError(e.message || "오류가 발생했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="text-[11px] text-muted-foreground">리스·렌탈 관리</div>
          <h1 className="text-lg font-semibold text-foreground">리스렌탈 목록</h1>
          <p className="text-xs text-muted-foreground">
            차량번호, 라이더, 계약 방식, 일 요금, 상태, 계약 기간을 확인하고 수정 페이지로 이동할 수 있습니다.
          </p>
        </div>
        <Link
          href="/lease-rentals/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          + 리스렌탈 추가
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 bg-muted/80 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="border-b border-border px-4 py-2 text-center font-semibold whitespace-nowrap">
                    차량번호
                  </th>
                  <th className="border-b border-border px-4 py-2 text-center font-semibold whitespace-nowrap">
                    라이더
                  </th>
                  <th className="border-b border-border px-4 py-2 text-center font-semibold whitespace-nowrap">
                    차종
                  </th>
                  <th className="border-b border-border px-4 py-2 text-center font-semibold whitespace-nowrap">
                    계약 방식
                  </th>
                  <th className="border-b border-border px-4 py-2 text-center font-semibold whitespace-nowrap">
                    일 요금
                  </th>
                  <th className="border-b border-border px-4 py-2 text-center font-semibold whitespace-nowrap">
                    상태
                  </th>
                  <th className="border-b border-border px-4 py-2 text-center font-semibold whitespace-nowrap">
                    계약 시작일
                  </th>
                  <th className="border-b border-border px-4 py-2 text-center font-semibold whitespace-nowrap">
                    계약 종료일
                  </th>
                </tr>
              </thead>
            <tbody>
              {loading && (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`lease-skel-${idx}`} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, col) => (
                      <td key={col} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {error && !loading && (
                <tr>
                  <td
            colSpan={8}
            className="border-b border-border px-4 py-4 text-center text-xs text-red-600"
          >
            {error}
          </td>
                </tr>
              )}
              {!loading && !error && rentals.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6">
                    <EmptyState
                      title="리스/렌탈 정보가 없습니다"
                      description="차량을 등록하고 라이더에게 배정해 보세요."
                      action={
                        <Link href="/lease-rentals/new">
                          <button className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm hover:border-primary hover:text-primary">
                            새 리스/렌탈 등록
                          </button>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              )}
              {rentals.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-border hover:bg-muted/60"
                  onClick={() => router.push(`/lease-rentals/${r.id}`)}
                >
                  <td className="px-4 py-2 text-center align-middle text-foreground">{r.plate}</td>
                  <td className="px-4 py-2 text-center align-middle text-foreground">
                    {r.riderName}
                    {r.riderSuffix ? (
                      <span className="ml-1 text-[11px] text-muted-foreground">({r.riderSuffix})</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-center align-middle text-foreground">
                    {formatVehicle(r.vehicleType)}
                  </td>
                  <td className="px-4 py-2 text-center align-middle text-foreground">
                    <span className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                      {formatContract(r.contractType)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center align-middle font-semibold text-blue-700">
                    {r.dailyFee.toLocaleString()}원
                  </td>
                  <td className="px-4 py-2 text-center align-middle">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadge(
                        r.status
                      )}`}
                    >
                      {r.status === "active" ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center align-middle text-foreground">{r.startDate}</td>
                  <td className="px-4 py-2 text-center align-middle text-foreground">{r.endDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
