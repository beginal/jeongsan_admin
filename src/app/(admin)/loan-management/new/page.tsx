"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassInput } from "@/components/ui/glass/GlassInput";
import { GlassSelect } from "@/components/ui/glass/GlassSelect";
import { GlassTextarea } from "@/components/ui/glass/GlassTextarea";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";

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
      <PageHeader
        title="대여금 신규 등록"
        description="라이더 대여금 기본 정보를 입력하고 저장하세요."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "대여금 관리", href: "/loan-management" },
          { label: "신규 등록", href: "#" },
        ]}
        icon={<Wallet className="h-5 w-5" />}
        actions={
          <GlassButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/loan-management")}
          >
            목록으로
          </GlassButton>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="기본 정보">
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1">라이더 선택</label>
              <div className="relative">
                <input
                  className="h-11 w-full rounded-xl border border-border bg-background/50 px-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
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
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
                    {filteredRiders.length === 0 && (
                      <div className="px-4 py-3 text-sm text-muted-foreground">검색된 라이더가 없습니다.</div>
                    )}
                    {filteredRiders.map((r) => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => {
                          setSelectedRiderId(r.id);
                          setRiderSearch(r.name);
                          setDropdownOpen(false);
                        }}
                        className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                      >
                        <span className="font-medium text-foreground">
                          {r.name} {r.phoneSuffix ? `(${r.phoneSuffix})` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {r.businessName ? `${r.businessName} · ` : ""}
                          {r.branchName || "지사 정보 없음"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedRiderId && (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  선택된 라이더: <span className="font-medium text-foreground">{riderSearch || ""}</span>
                </div>
              )}
            </div>

            <GlassInput
              label="총 대여금"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              required
              placeholder="0"
            />

            <GlassInput
              type="date"
              label="대여 일자"
              value={loanDate}
              onChange={(e) => setLoanDate(e.target.value)}
              required
            />
          </div>
        </Section>

        <Section title="상환 설정">
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <GlassSelect
                label="납부 스케줄 (선택)"
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
              </GlassSelect>

              <GlassInput
                label="회차 납부 금액 (선택)"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
              />
            </div>

            <GlassInput
              type="date"
              label="납부 마감일 (선택)"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={loanDate || undefined}
            />

            <GlassTextarea
              label="메모"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="대여 조건, 납부 플랜 등 메모를 남겨주세요."
              rows={4}
            />
          </div>
        </Section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-700 backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-muted-foreground">
            저장 후 자동으로 수정 화면으로 이동합니다.
          </span>
          <GlassButton
            type="submit"
            variant="primary"
            disabled={saving}
          >
            {saving ? "저장 중..." : "등록"}
          </GlassButton>
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
