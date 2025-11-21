"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MinusCircle } from "lucide-react";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { DateField } from "@/components/ui/DateField";

type RiderOption = {
  id: string;
  name: string;
  phoneSuffix: string;
  branchName: string;
  businessName: string;
};

type DeductionStatus = "scheduled" | "deducted" | "cancelled";
type DeductionApplyTo = "weekly" | "daily";

type DeductionRow = {
  id: string;
  riderId: string;
  riderName: string;
  phoneSuffix: string;
  branchName: string;
  businessName: string;
  amount: number;
  reason: string;
  applyTo: DeductionApplyTo;
  applyAt?: string;
  status: DeductionStatus;
  createdAt: string;
};

const formatCurrency = (v: number) => Number(v || 0).toLocaleString();
const formatNumberInput = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString();
};

const statusLabel: Record<DeductionStatus, string> = {
  scheduled: "예정",
  deducted: "차감 완료",
  cancelled: "취소",
};

const statusClass: Record<DeductionStatus, string> = {
  scheduled: "bg-amber-50 text-amber-700 border border-amber-200",
  deducted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border border-slate-200 line-through",
};

export default function UncollectedDeductionsPage() {
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [riderSearch, setRiderSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<RiderOption | null>(null);

  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [applyTo, setApplyTo] = useState<DeductionApplyTo>("weekly");
  const [applyAt, setApplyAt] = useState("");
  const [deductions, setDeductions] = useState<DeductionRow[]>(() => [
    {
      id: "demo-1",
      riderId: "r1",
      riderName: "김라이더",
      phoneSuffix: "1234",
      branchName: "강남 1센터",
      businessName: "정산 법인",
      amount: 150000,
      reason: "지난주 미차감",
      applyTo: "weekly",
      applyAt: "2025-02-02",
      status: "scheduled",
      createdAt: "2025-01-15",
    },
    {
      id: "demo-2",
      riderId: "r2",
      riderName: "박배송",
      phoneSuffix: "9988",
      branchName: "송파 센터",
      businessName: "",
      amount: 70000,
      reason: "정산 오류 재차감",
      applyTo: "weekly",
      applyAt: "2025-01-29",
      status: "deducted",
      createdAt: "2025-01-10",
    },
  ]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRiders() {
      setLoadingRiders(true);
      setError(null);
      try {
        const res = await fetch("/api/loans/riders");
        if (!res.ok) {
          throw new Error("라이더 목록을 불러오지 못했습니다.");
        }
        const data = await res.json();
        const parsed: RiderOption[] = Array.isArray(data.riders)
          ? data.riders.map((r: any) => ({
            id: String(r.id),
            name: r.name || "",
            phoneSuffix: r.phoneSuffix || "",
            branchName: r.branchName || "",
            businessName: r.businessName || "",
          }))
          : [];
        setRiders(parsed);
      } catch (e: any) {
        setError(e.message || "라이더 목록을 불러오지 못했습니다.");
      } finally {
        setLoadingRiders(false);
      }
    }
    loadRiders();
  }, []);

  const filteredRiders = useMemo(() => {
    const q = riderSearch.trim().toLowerCase();
    if (!q) return riders;
    return riders.filter((r) =>
      [r.name, r.branchName, r.businessName, r.phoneSuffix]
        .filter(Boolean)
        .some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [riders, riderSearch]);

  const handleAdd = () => {
    setError(null);
    if (!selectedRider) {
      setError("라이더를 선택하세요.");
      return;
    }
    const amountNum = Number(amountInput.replace(/,/g, "") || 0);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("차감 금액을 확인하세요.");
      return;
    }
    const entry: DeductionRow = {
      id: crypto.randomUUID(),
      riderId: selectedRider.id,
      riderName: selectedRider.name,
      phoneSuffix: selectedRider.phoneSuffix,
      branchName: selectedRider.branchName,
      businessName: selectedRider.businessName,
      amount: amountNum,
      reason: reason || "미차감 반영",
      applyTo,
      applyAt: applyAt || undefined,
      status: "scheduled",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setDeductions((prev) => [entry, ...prev]);
    setAmountInput("");
    setReason("");
    setApplyAt("");
  };

  const updateStatus = (id: string, status: DeductionStatus) => {
    setDeductions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
  };

  const displayed = useMemo(() => {
    return deductions.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  }, [deductions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MinusCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">미차감 / Uncollected deductions</div>
            <h1 className="text-lg font-semibold text-foreground">미차감 관리</h1>
            <p className="text-xs text-muted-foreground">
              미차감 금액을 등록해 다음 정산(주/일)에 반영하거나 수동 입금·차감을 관리합니다.
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {loadingRiders ? "라이더 불러오는 중..." : `${deductions.length}건`}
        </div>
      </div>

      {/* 입력 카드 */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">미차감 등록</div>
          <div className="text-[11px] text-muted-foreground">다음 정산에 차감할 금액을 입력</div>
        </div>

        <div className="space-y-1 text-sm">
          <span className="text-[11px] font-semibold text-muted-foreground">라이더</span>
          <div className="relative">
            <input
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="라이더명/지사/사업자/뒷번호 검색"
              value={riderSearch}
              onChange={(e) => {
                setRiderSearch(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
            />
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card shadow-lg">
                {filteredRiders.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">검색된 라이더가 없습니다.</div>
                )}
                {filteredRiders.map((r) => (
                  <GlassButton
                    type="button"
                    key={r.id}
                    variant="ghost"
                    onClick={() => {
                      setSelectedRider(r);
                      setRiderSearch(r.name);
                      setDropdownOpen(false);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted h-auto rounded-none"
                  >
                    <span className="font-medium text-foreground">
                      {r.name} {r.phoneSuffix ? `(${r.phoneSuffix})` : ""}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {r.businessName ? `${r.businessName} · ` : ""}
                      {r.branchName || "지사 정보 없음"}
                    </span>
                  </GlassButton>
                ))}
              </div>
            )}
          </div>
          {selectedRider && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              선택된 라이더: {selectedRider.name} {selectedRider.phoneSuffix ? `(${selectedRider.phoneSuffix})` : ""}
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-[11px] font-semibold text-muted-foreground">차감 금액</span>
            <input
              type="text"
              value={amountInput}
              onChange={(e) => setAmountInput(formatNumberInput(e.target.value))}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="예: 50,000원"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[11px] font-semibold text-muted-foreground">적용 정산</span>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={applyTo}
              onChange={(e) => setApplyTo(e.target.value as DeductionApplyTo)}
            >
              <option value="weekly">주 정산</option>
              <option value="daily">일 정산</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[11px] font-semibold text-muted-foreground">적용 기준일(선택)</span>
            <DateField
              value={applyAt}
              onChange={setApplyAt}
              placeholder="다음 정산일"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm">
          <span className="text-[11px] font-semibold text-muted-foreground">사유</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="예: 지난 주차 미차감, 정산 오류 재차감 등"
          />
        </label>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <GlassButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAdd}
          >
            등록
          </GlassButton>
        </div>
      </div>

      {/* 목록 */}
      <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-center font-semibold">라이더</th>
              <th className="px-4 py-3 text-center font-semibold">차감 금액</th>
              <th className="px-4 py-3 text-center font-semibold">적용</th>
              <th className="px-4 py-3 text-center font-semibold">기준일</th>
              <th className="px-4 py-3 text-center font-semibold">사유</th>
              <th className="px-4 py-3 text-center font-semibold">상태</th>
              <th className="px-4 py-3 text-center font-semibold">생성일</th>
              <th className="px-4 py-3 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayed.map((d) => (
              <tr key={d.id} className={d.status === "cancelled" ? "bg-muted/40 line-through text-muted-foreground" : ""}>
                <td className="px-4 py-3 text-center text-foreground">
                  <div className="font-semibold text-foreground">
                    {d.riderName} {d.phoneSuffix ? `(${d.phoneSuffix})` : ""}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {d.businessName ? `${d.businessName} · ` : ""}
                    {d.branchName || "-"}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-foreground">
                  {formatCurrency(d.amount)}원
                </td>
                <td className="px-4 py-3 text-center text-foreground">
                  {d.applyTo === "weekly" ? "주 정산" : "일 정산"}
                </td>
                <td className="px-4 py-3 text-center text-foreground">{d.applyAt || "-"}</td>
                <td className="px-4 py-3 text-center text-foreground">
                  <div className="whitespace-pre-wrap text-xs">{d.reason || "-"}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass[d.status]}`}>
                    {statusLabel[d.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-foreground">{d.createdAt}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
                    {d.status !== "deducted" && (
                      <GlassButton
                        type="button"
                        variant={d.status === "cancelled" ? "outline" : "destructive"}
                        size="sm"
                        onClick={() => updateStatus(d.id, d.status === "cancelled" ? "scheduled" : "cancelled")}
                        className={`h-7 px-3 text-[11px] ${d.status === "cancelled"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                            : ""
                          }`}
                      >
                        {d.status === "cancelled" ? "복구" : "취소"}
                      </GlassButton>
                    )}
                    {d.status === "scheduled" && (
                      <GlassButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(d.id, "deducted")}
                        className="h-7 bg-primary/10 px-3 text-[11px] text-primary hover:bg-primary/20"
                      >
                        차감완료
                      </GlassButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  등록된 미차감 항목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
