"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { formatAccountForDisplay, getAccountMaxDigits } from "@/lib/accountFormat";

type BranchOption = {
  id: string;
  name: string;
  province?: string;
  district?: string;
  platform?: string;
  corporateName?: string;
  personalName?: string;
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

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 2)}-${digits.slice(-2)}`;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

function formatSsn(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  if (!digits) return "";
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

export default function RiderPublicRegisterPage() {
  const params = useParams();
  const adminIdRaw = (params as any)?.adminId;
  const adminId = Array.isArray(adminIdRaw)
    ? adminIdRaw[0]
    : (adminIdRaw as string | undefined) || "";

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [residentNumber, setResidentNumber] = useState("");
  const [baeminId, setBaeminId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [taxName, setTaxName] = useState("");
  const [taxResidentNumber, setTaxResidentNumber] = useState("");
  const [taxSameAsBasic, setTaxSameAsBasic] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      setLoadingBranches(true);
      setFetchError(null);
      try {
        const qs = adminId ? `?adminId=${encodeURIComponent(adminId)}` : "";
        const res = await fetch(`/api/branches${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "지사 목록을 불러오지 못했습니다.");
        }
        if (cancelled) return;

        const list = Array.isArray(data.branches) ? data.branches : [];
        const mapped = list.map((b: any) => ({
          id: String(b.id),
          name: b.display_name || b.branch_name || String(b.id),
          province: b.province || "",
          district: b.district || "",
          platform: b.platform || "",
          corporateName: b.corporate_entity_name || undefined,
          personalName: b.personal_entity_name || undefined,
        }));
        setBranches(mapped);
        if (mapped.length > 0) {
          setBranchId(mapped[0].id);
        }
      } catch (e: any) {
        if (!cancelled) {
          setFetchError(e.message || "지사 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoadingBranches(false);
        }
      }
    }

    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [adminId]);

  const platformLabel = (p?: string) => {
    if (p === "coupang") return "쿠팡";
    if (p === "baemin") return "배민";
    return p || "기타";
  };

  const selectedBranchLabel = useMemo(() => {
    const b = branches.find((x) => x.id === branchId);
    if (!b) return "-";
    const region = [b.province, b.district].filter(Boolean).join(" ");
    const owner = [b.corporateName, b.personalName].filter(Boolean).join(" / ");
    return `${b.name} · ${platformLabel(b.platform)}${region ? ` (${region})` : ""}${
      owner ? ` | 사업자: ${owner}` : ""
    }`;
  }, [branches, branchId]);

  const handleAccountNumberChange = (raw: string, bank: string) => {
    const digits = raw.replace(/\D/g, "");
    const maxDigits = bank ? getAccountMaxDigits(bank) : 30;
    const limited = digits.slice(0, maxDigits);
    setAccountNumber(formatAccountForDisplay(limited, bank));
  };

  useEffect(() => {
    if (!bankName && bankOptions.length > 0) {
      setBankName(bankOptions[0]);
    }
  }, [bankName]);

  useEffect(() => {
    if (taxSameAsBasic) {
      setTaxName(name);
      setTaxResidentNumber(residentNumber);
    }
  }, [taxSameAsBasic, name, residentNumber]);

  useEffect(() => {
    if (!bankName) return;
    const digits = accountNumber.replace(/\D/g, "");
    const limited = digits.slice(0, getAccountMaxDigits(bankName));
    setAccountNumber(formatAccountForDisplay(limited, bankName));
  }, [bankName, accountNumber]);

  const validate = () => {
    if (
      !branchId ||
      !name.trim() ||
      !phone.trim() ||
      !password.trim() ||
      !passwordConfirm.trim() ||
      !residentNumber.trim() ||
      !bankName.trim() ||
      !accountHolder.trim() ||
      !accountNumber.trim() ||
      (!taxSameAsBasic && !taxName.trim()) ||
      (!taxSameAsBasic && !taxResidentNumber.trim())
    ) {
      setSubmitError("필수 항목을 모두 입력해 주세요.");
      return false;
    }
    if (password !== passwordConfirm) {
      setSubmitError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return false;
    }
    if (password.trim().length < 8) {
      setSubmitError("비밀번호는 8자 이상 입력해 주세요.");
      return false;
    }
    setSubmitError(null);
    return true;
  };

  const handleConfirmSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const normalizedPhone = formatPhone(phone);
    const normalizedResident = formatSsn(residentNumber);
    const normalizedTax = taxSameAsBasic
      ? normalizedResident
      : formatSsn(taxResidentNumber);
    const taxNameValue = taxSameAsBasic ? name.trim() : taxName.trim();
    const accountDigits = accountNumber.replace(/\D/g, "");

    try {
      const res = await fetch("/api/public/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: adminId || null,
          branchId,
          name: name.trim(),
          phone: normalizedPhone,
          baeminId: baeminId.trim() || null,
          password: password.trim(),
          residentNumber: normalizedResident,
          bankName: bankName.trim(),
          accountHolder: accountHolder.trim(),
          accountNumber: accountDigits,
          taxName: taxNameValue,
          taxResidentNumber: normalizedTax,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "신청을 저장하지 못했습니다.");
      }

      setSubmitted(true);
      setShowConfirm(false);
    } catch (err: any) {
      setSubmitError(err.message || "신청을 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setShowConfirm(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-5 py-10">
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50 px-5 py-6 shadow-sm">
          <div className="text-sm font-semibold text-emerald-800">
            신청이 접수되었어요
          </div>
          <p className="mt-2 text-sm text-emerald-700">
            입력하신 정보가 관리자에게 전달되었습니다. 승인 완료 후 연락을 드리겠습니다.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-5 py-6 shadow-sm text-sm text-muted-foreground">
          <p className="text-xs text-foreground">
            • 승인 상태: 대기중<br />
            • 담당 지사: {selectedBranchLabel}
          </p>
          <p className="mt-3 text-xs">
            문의 사항이 있다면 지사 담당자에게 직접 연락해 주세요.
          </p>
        </div>
      </div>
    );
  }

  const passwordHint = "정산 정보 조회·수정을 위한 비밀번호입니다. 꼭 기억해 주세요.";

  return (
    <>
      <div className="mx-auto min-h-screen max-w-xl px-5 py-10">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Rider Registration
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              라이더 등록 신청
            </h1>
            <p className="text-sm text-muted-foreground">
              소속 지사를 선택하고 정보를 입력해 주세요. 제출 후 관리자 승인까지 상태는 ‘대기’로 유지됩니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {submitError}
              </div>
            )}

            <div className="space-y-4 rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">기본 정보</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    이름<span className="text-red-500">*</span>
                  </label>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    연락처<span className="text-red-500">*</span>
                  </label>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="010-0000-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    주민등록번호<span className="text-red-500">*</span>
                  </label>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={residentNumber}
                    onChange={(e) => setResidentNumber(formatSsn(e.target.value))}
                    placeholder="000000-0000000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    비밀번호<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="정산 정보 확인용 비밀번호 (8자 이상)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    정산 정보 확인·수정 시 사용할 비밀번호입니다. 꼭 기억해 주세요.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    비밀번호 확인<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="비밀번호를 다시 입력"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    배민 ID (선택)
                  </label>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={baeminId}
                    onChange={(e) => setBaeminId(e.target.value)}
                    placeholder="배민 ID"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">계좌 정보</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    은행명<span className="text-red-500">*</span>
                  </label>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={bankName}
                    onChange={(e) => {
                      const next = e.target.value;
                      setBankName(next);
                      handleAccountNumberChange(accountNumber, next);
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
                    예금주<span className="text-red-500">*</span>
                  </label>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    계좌번호<span className="text-red-500">*</span>
                  </label>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={accountNumber}
                    onChange={(e) => handleAccountNumberChange(e.target.value, bankName)}
                    placeholder="000-000-000000"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">원천세 신고 정보</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    신고 이름<span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                      taxSameAsBasic
                        ? "border-border bg-muted/60 text-muted-foreground cursor-not-allowed"
                        : "border-border bg-background text-foreground focus:border-primary"
                    }`}
                    value={taxName}
                    onChange={(e) => {
                      setTaxSameAsBasic(false);
                      setTaxName(e.target.value);
                    }}
                    placeholder="홍길동"
                    disabled={taxSameAsBasic}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    주민등록번호<span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                      taxSameAsBasic
                        ? "border-border bg-muted/60 text-muted-foreground cursor-not-allowed"
                        : "border-border bg-background text-foreground focus:border-primary"
                    }`}
                    value={taxResidentNumber}
                    onChange={(e) => {
                      setTaxSameAsBasic(false);
                      setTaxResidentNumber(formatSsn(e.target.value));
                    }}
                    placeholder="000000-0000000"
                    disabled={taxSameAsBasic}
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-border text-primary accent-primary"
                    checked={taxSameAsBasic}
                    onChange={(e) => setTaxSameAsBasic(e.target.checked)}
                  />
                  기본 정보와 동일
                </label>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  소속 지사
                </h2>
                <div className="text-[11px] text-muted-foreground">
                  선택됨: <span className="text-foreground">{selectedBranchLabel}</span>
                </div>
              </div>

              <div className="max-h-64 overflow-auto rounded-md border border-border bg-muted/30">
                {loadingBranches && (
                  <div className="px-3 py-3 text-[11px] text-muted-foreground">
                    지사 불러오는 중...
                  </div>
                )}
                {!loadingBranches && branches.length === 0 && (
                  <div className="px-3 py-3 text-[11px] text-muted-foreground">
                    선택 가능한 지사가 없습니다.
                  </div>
                )}
                {!loadingBranches &&
                  branches.map((b) => {
                    const region = [b.province, b.district]
                      .filter(Boolean)
                      .join(" ");
                    const owner = [b.corporateName, b.personalName]
                      .filter(Boolean)
                      .join(" / ");
                    return (
                      <label
                        key={b.id}
                        className={`flex cursor-pointer items-start gap-3 border-b border-border/60 px-3 py-2 last:border-b-0 hover:bg-muted/50 ${
                          branchId === b.id ? "bg-primary/5" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="branch"
                          value={b.id}
                          checked={branchId === b.id}
                          onChange={() => setBranchId(b.id)}
                          className="mt-1 h-4 w-4 text-primary accent-primary"
                          disabled={submitting}
                        />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="truncate">{b.name}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                                b.platform === "coupang"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : b.platform === "baemin"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {platformLabel(b.platform)}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {region || "지역 정보 없음"}
                          </div>
                          {owner && (
                            <div className="text-[11px] text-muted-foreground">
                              사업자: {owner}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
              {fetchError && (
                <p className="text-[11px] text-red-600">{fetchError}</p>
              )}
            </div>

            <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-[11px] text-muted-foreground">
              • 제출 후 상태는 “대기”로 표시되며 관리자가 검토 후 승인합니다.<br />
              • 정확한 연락처를 입력해 주세요. 승인 결과 안내에 사용됩니다.<br />
              • 지사 선택이 보이지 않으면 링크가 잘못되었거나 지사가 비활성화되었을 수 있습니다.<br />
              • 주민등록번호/계좌번호 등은 안전하게 저장되며 승인 이후 삭제를 원하시면 관리자에게 문의하세요.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 text-sm">
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
                disabled={submitting || loadingBranches || branches.length === 0}
              >
                {submitting ? "제출 중..." : "신청 제출"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 text-sm shadow-lg">
            <h3 className="text-base font-semibold text-foreground">신청 정보를 제출할까요?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              제출 후 상태는 “대기”로 등록되며 관리자가 승인한 뒤에만 활성화됩니다.
            </p>
            <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">
              <div>이름: <span className="font-medium">{name || "-"}</span></div>
              <div>연락처: <span className="font-medium">{phone || "-"}</span></div>
              <div>주민등록번호: <span className="font-medium">{residentNumber || "-"}</span></div>
              <div>지사: <span className="font-medium">{selectedBranchLabel}</span></div>
            </div>
            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                취소
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
                onClick={handleConfirmSubmit}
                disabled={submitting}
              >
                {submitting ? "제출 중..." : "제출 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
