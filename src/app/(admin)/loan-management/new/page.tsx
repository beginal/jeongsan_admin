"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { DateField } from "@/components/ui/DateField";

type RiderOption = {
  id: string;
  name: string;
  phoneSuffix: string;
  branchName: string;
  businessName: string;
};

export default function LoanCreatePage() {
  const router = useRouter();
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [riderSearch, setRiderSearch] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [principal, setPrincipal] = useState("0");
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentDayOfWeek, setPaymentDayOfWeek] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const ridersRes = await fetch("/api/loans/riders");
        const ridersJson = await ridersRes.json().catch(() => ({}));
        const ridersParsed: RiderOption[] = Array.isArray(ridersJson.riders)
          ? ridersJson.riders.map((r: any) => ({
            id: String(r.id),
            name: r.name || "",
            phoneSuffix: r.phoneSuffix || "",
            branchName: r.branchName || "",
            businessName: r.businessName || "",
          }))
          : [];
        setRiders(ridersParsed);
      } catch (e: any) {
        setError(e.message || "대여금 작성에 필요한 데이터를 불러오지 못했습니다.");
      }
    }

    loadData();
  }, []);

  const filteredRiders = useMemo(() => {
    const q = riderSearch.trim().toLowerCase();
    if (!q) return riders;
    return riders.filter((r) =>
      [r.name, r.branchName, r.businessName, r.phoneSuffix].some((v) =>
        (v || "").toLowerCase().includes(q)
      )
    );
  }, [riders, riderSearch]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    if (!selectedRiderId) {
      setError("라이더를 선택하세요.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId: selectedRiderId,
          principalAmount: Number(principal.replace(/,/g, "") || 0),
          loanDate,
          paymentDayOfWeek: paymentDayOfWeek === "" ? null : Number(paymentDayOfWeek),
          paymentAmount: paymentAmount === "" ? null : Number(paymentAmount.replace(/,/g, "") || 0),
          dueDate: dueDate || null,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "생성에 실패했습니다.");
      }
      const data = await res.json().catch(() => ({}));
      const id = data.id as string | undefined;
      router.push(id ? `/loan-management/${id}/edit` : "/loan-management");
    } catch (e: any) {
      setError(e.message || "생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">대여금 관리 / 신규 등록</div>
            <h1 className="text-lg font-semibold text-foreground">대여금 신규 등록</h1>
            <p className="text-xs text-muted-foreground">
              라이더 대여금 기본 정보를 입력하고 저장하세요.
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <GlassButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/loan-management")}
          >
            목록으로
          </GlassButton>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="space-y-3">
          <div className="space-y-1 text-sm">
            <span className="text-[11px] font-semibold text-muted-foreground">라이더 선택</span>
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
                onBlur={() => {
                  setTimeout(() => setDropdownOpen(false), 120);
                }}
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
                        setSelectedRiderId(r.id);
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
            {selectedRiderId && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                선택된 라이더: {riderSearch || ""}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="text-[11px] font-semibold text-muted-foreground">총 대여금</span>
            <input
              type="text"
              value={principal}
              onChange={(e) => setPrincipal(formatInputNumber(e.target.value))}
              onFocus={() => {
                if (principal === "0") setPrincipal("");
              }}
              onBlur={() => {
                if (!principal.trim()) setPrincipal("0");
              }}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-[11px] font-semibold text-muted-foreground">대여 일자</span>
            <DateField value={loanDate} onChange={setLoanDate} required />
          </label>
        </div>

        <div className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[11px] font-semibold text-muted-foreground">납부 스케줄 (선택)</span>
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={paymentDayOfWeek}
                onChange={(e) => setPaymentDayOfWeek(e.target.value)}
              >
                <option value="">설정 안함</option>
                <option value="7">주 정산 시 차감</option>
                <option value="1">월요일</option>
                <option value="2">화요일</option>
                <option value="3">수요일</option>
                <option value="4">목요일</option>
                <option value="5">금요일</option>
                <option value="6">토요일</option>
                <option value="0">일요일</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-[11px] font-semibold text-muted-foreground">회차 납부 금액 (선택)</span>
              <input
                type="text"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(formatInputNumber(e.target.value))}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="예: 50,000원"
              />
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="text-[11px] font-semibold text-muted-foreground">납부 마감일 (선택)</span>
            <DateField value={dueDate} onChange={setDueDate} min={loanDate || undefined} />
          </label>
        </div>

        <label className="space-y-1 text-sm">
          <span className="text-[11px] font-semibold text-muted-foreground">메모</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="대여 조건, 납부 플랜 등 메모를 남겨주세요."
          />
        </label>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <GlassButton
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving}
          >
            {saving ? "저장 중..." : "등록"}
          </GlassButton>
          <span className="text-[11px] text-muted-foreground">
            저장 후 자동으로 수정 화면으로 이동합니다.
          </span>
        </div>
      </form>
    </div>
  );
}
const formatInputNumber = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString();
};
