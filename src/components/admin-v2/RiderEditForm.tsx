"use client";

import { useEffect, useState } from "react";
import { RiderStatusActions } from "@/components/admin-v2/RiderStatusActions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatAccountForDisplay, getAccountMaxDigits } from "@/lib/accountFormat";
import { GlassButton } from "../ui/glass/GlassButton";

interface RiderEditFormProps {
  riderId: string;
}

type BranchOption = {
  id: string;
  name: string;
  province: string;
  district: string;
  platform: string;
};

const bankOptions = [
  "국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "농협은행",
  "기업은행",
  "카카오뱅크",
  "토스뱅크",
  "SC제일은행",
  "부산은행",
  "대구은행",
  "수협은행",
  "새마을금고",
];

function formatSsnForInput(raw?: string | null) {
  const s = (raw || "").replace(/\D/g, "").slice(0, 13);
  if (!s) return "";
  if (s.length <= 6) return s;
  return `${s.slice(0, 6)}-${s.slice(6)}`;
}

function formatSsnForDisplay(raw?: string | null) {
  const formatted = formatSsnForInput(raw);
  return formatted || "-";
}

function formatPhone(raw?: string | null) {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";

  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
    if (digits.length <= 9) {
      return `${digits.slice(0, 2)}-${digits.slice(
        2,
        digits.length - 4
      )}-${digits.slice(-4)}`;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(
      6,
      10
    )}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(
    3,
    digits.length - 4
  )}-${digits.slice(-4)}`;
}

export function RiderEditForm({ riderId }: RiderEditFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [residentNumber, setResidentNumber] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [baeminId, setBaeminId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [taxName, setTaxName] = useState("");
  const [taxResidentNumber, setTaxResidentNumber] = useState("");
  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [primaryBranchId, setPrimaryBranchId] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<
    "approved" | "pending" | "rejected"
  >("pending");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/riders/${encodeURIComponent(riderId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.error || "라이더 정보를 불러오지 못했습니다."
          );
        }
        if (cancelled) return;
        const r = data.rider as any;
        setName(r.name || "");
        setResidentNumber(r.resident_number || null);
        setPhone(formatPhone(r.phone || ""));
        setBaeminId(r.baemin_id || "");
        setBankName(r.bank_name || "");
        setAccountHolder(r.account_holder || "");
        setAccountNumber(
          formatAccountForDisplay(r.account_number || "", r.bank_name || "")
        );
        setTaxName(r.tax_name || "");
        const rawTax = (r.tax_resident_number as string | null) || "";
        setTaxResidentNumber(formatSsnForInput(rawTax));
        const vs = r.verification_status as string;
        setVerificationStatus(
          vs === "approved" || vs === "rejected" ? (vs as any) : "pending"
        );

        const assigned: any[] = Array.isArray(data.assignedBranches)
          ? data.assignedBranches
          : [];
        const branches: any[] = Array.isArray(data.branches)
          ? data.branches
          : [];
        setAvailableBranches(
          branches.map((b) => ({
            id: String(b.id),
            name: b.name as string,
            province: b.province as string,
            district: b.district as string,
            platform: b.platform as string,
          }))
        );
        const primary =
          assigned.find((a) => a.isPrimary)?.branchId ||
          assigned[0]?.branchId ||
          null;
        const primaryId = primary ? String(primary) : null;
        setSelectedBranchIds(primaryId ? [primaryId] : []);
        setPrimaryBranchId(primaryId);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "라이더 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [riderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const body: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
        baeminId: baeminId.trim() || null,
        bankName: bankName.trim() || null,
        accountHolder: accountHolder.trim() || null,
        accountNumber: accountNumber.trim() || null,
        taxName: taxName.trim() || null,
        taxResidentNumber: taxResidentNumber.trim() || null,
        branchIds: selectedBranchIds,
        primaryBranchId: primaryBranchId,
        verificationStatus,
      };

      const res = await fetch(`/api/riders/${encodeURIComponent(riderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(
          data?.error || "라이더 정보를 저장하지 못했습니다."
        );
      }

      router.push(`/riders/${encodeURIComponent(riderId)}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "라이더 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleAccountNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const maxDigits = getAccountMaxDigits(bankName);
    const limited = digits.slice(0, maxDigits);
    setAccountNumber(formatAccountForDisplay(limited, bankName));
  };

  const handleTaxResidentChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const limited = digits.slice(0, 13);
    if (!limited) {
      setTaxResidentNumber("");
      return;
    }
    if (limited.length <= 6) {
      setTaxResidentNumber(limited);
    } else {
      setTaxResidentNumber(`${limited.slice(0, 6)}-${limited.slice(6)}`);
    }
  };

  const handlePhoneChange = (raw: string) => {
    setPhone(formatPhone(raw));
  };

  const filteredBranches = availableBranches.filter((b) => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return true;
    const text = `${b.name} ${b.province} ${b.district}`.toLowerCase();
    return text.includes(q);
  });

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-6 text-xs text-muted-foreground">
        라이더 정보를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 text-xs">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">라이더 수정</span>
          <span className="text-muted-foreground text-xs">{name || riderId}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/riders/${encodeURIComponent(riderId)}`)}
            disabled={saving}
          >
            상세 보기
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push("/riders")}
            disabled={saving}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            기본 정보
          </h2>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                이름
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홍길동"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                주민등록번호
              </label>
              <input
                className="h-9 w-full rounded-md border border-dashed border-border bg-muted/40 px-2 text-xs text-muted-foreground"
                value={formatSsnForDisplay(residentNumber)}
                readOnly
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                주민등록번호는 수정할 수 없습니다.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                연락처
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="예: 010-1234-5678"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                배민 ID
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={baeminId}
                onChange={(e) => setBaeminId(e.target.value)}
                placeholder="예: baemin01"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                승인 상태
              </label>
              <RiderStatusActions
                riderId={riderId}
                currentStatus={verificationStatus}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            계좌 정보
          </h2>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                은행명
              </label>
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={bankName}
                onChange={(e) => {
                  const next = e.target.value;
                  setBankName(next);
                  setAccountNumber((prev) =>
                    formatAccountForDisplay(prev.replace(/\D/g, ""), next)
                  );
                }}
              >
                <option value="">은행 선택</option>
                {bankOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                예금주
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="예: 홍길동"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                계좌번호
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={accountNumber}
                onChange={(e) => handleAccountNumberChange(e.target.value)}
                placeholder="숫자만 또는 하이픈 포함 입력"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            원천세 신고 정보
          </h2>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                신고 이름
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                placeholder="예: 홍길동"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                주민등록번호
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={taxResidentNumber}
                onChange={(e) => handleTaxResidentChange(e.target.value)}
                maxLength={14}
                placeholder="예: 991231-1234567"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            소속 지사
          </h2>
          <div className="mt-3 space-y-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                지사 검색
              </label>
              <div className="relative">
                <input
                  className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="지사명, 지역 검색"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                />
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                  🔍
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    지사 목록
                  </span>
                </div>
                <div className="mt-1 max-h-56 overflow-auto rounded-md border border-border bg-muted/40">
                  {filteredBranches.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                      조건에 맞는 지사가 없습니다.
                    </div>
                  ) : (
                    filteredBranches.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between border-b border-border/40 px-3 py-2 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-foreground">
                            {b.name}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {[b.province, b.district]
                              .filter(Boolean)
                              .join(" ")}
                          </div>
                        </div>
                        <GlassButton
                          type="button"
                          variant="outline"
                          size="sm"
                          className="ml-2 h-7 px-2 text-[11px]"
                          onClick={() => {
                            setSelectedBranchIds([b.id]);
                            setPrimaryBranchId(b.id);
                          }}
                        >
                          선택
                        </GlassButton>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    선택된 지사
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedBranchIds.length}개
                  </span>
                </div>
                <div className="mt-1 max-h-56 overflow-auto rounded-md border border-border bg-muted/40">
                  {selectedBranchIds.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                      선택된 지사가 없습니다.
                    </div>
                  ) : (
                    selectedBranchIds.map((id) => {
                      const b = availableBranches.find((br) => br.id === id);
                      if (!b) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between border-b border-border/40 px-3 py-2 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium text-foreground">
                              {b.name}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              플랫폼: {b.platform || "-"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <GlassButton
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() =>
                                setSelectedBranchIds((prev) =>
                                  prev.filter((x) => x !== id)
                                )
                              }
                            >
                              제거
                            </GlassButton>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </form>
  );
}
