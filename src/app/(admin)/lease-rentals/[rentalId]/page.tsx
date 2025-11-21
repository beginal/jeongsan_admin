"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { showToast } from "@/components/ui/Toast";
import { DateField } from "@/components/ui/DateField";

type RentalStatus = "active" | "inactive";

type LeaseRental = {
  id: string;
  plate: string;
  riderId: string | null;
  riderName: string;
  riderPhone?: string;
  vehicleType: string;
  color?: string;
  contractType: string;
  dailyFee: number | string;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  assignmentId?: string | null;
  insuranceCompany?: string;
  insuranceAge?: string;
};

const contractOptions = ["렌트", "리스"] as const;
const INSURANCE_OPTIONS = [
  "삼성화재",
  "현대해상",
  "DB손해보험",
  "KB손해보험",
  "메리츠화재",
  "한화손해보험",
  "흥국화재",
  "롯데손해보험",
  "AXA손해보험",
  "캐롯손해보험",
];
const INSURANCE_AGE_OPTIONS = ["21", "26", "30", "35"] as const;
type RiderOption = { id: string; name: string; suffix: string; phone: string };

export default function LeaseRentalEditPage() {
  const router = useRouter();
  const params = useParams();
  const rentalId = params?.rentalId as string;
  const [form, setForm] = useState<LeaseRental | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riderOptions, setRiderOptions] = useState<RiderOption[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rentalRes, riderRes] = await Promise.all([
          fetch(`/api/lease-rentals/${encodeURIComponent(rentalId)}`, {
            credentials: "include",
          }),
          fetch("/api/lease-rentals/riders", { credentials: "include" }),
        ]);

        const rentalData = await rentalRes.json().catch(() => ({}));
        const riderData = await riderRes.json().catch(() => ({}));

        if (!rentalRes.ok || rentalData?.error) {
          throw new Error(rentalData?.error || "리스렌탈 정보를 불러오지 못했습니다.");
        }
        if (!riderRes.ok || riderData?.error) {
          throw new Error(riderData?.error || "라이더 목록을 불러오지 못했습니다.");
        }
        if (mounted) {
          setForm({
            ...rentalData.rental,
            dailyFee: rentalData.rental?.dailyFee != null ? String(rentalData.rental.dailyFee) : "",
            insuranceAge: rentalData.rental?.insuranceAge || "",
            insuranceCompany: rentalData.rental?.insuranceCompany || "",
          });
          setRiderOptions(
            (riderData.riders || []).map((r: any) => ({
              id: r.id,
              name: r.name,
              phone: r.phone,
              suffix: r.suffix,
            }))
          );
        }
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
  }, [rentalId]);

  const handleChange = (key: keyof LeaseRental, value: any) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    fetch(`/api/lease-rentals/${encodeURIComponent(rentalId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plate: form.plate,
        riderId: form.riderId,
        vehicleType: form.vehicleType,
        color: form.color,
        contractType: form.contractType,
        dailyFee: Number(String(form.dailyFee || "").replace(/,/g, "")) || 0,
        insuranceCompany: form.insuranceCompany,
        insuranceAge: form.insuranceAge,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "저장에 실패했습니다.");
        }
        showToast("저장되었습니다.", "success");
        router.push("/lease-rentals");
      })
      .catch((e: any) => {
        const msg = e.message || "저장에 실패했습니다.";
        setError(msg);
        showToast(msg, "error");
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="text-[11px] text-muted-foreground">리스·렌탈 관리</div>
          <h1 className="text-lg font-semibold text-foreground">리스렌탈 수정</h1>
          <p className="text-xs text-muted-foreground">
            차량번호, 라이더, 차종, 계약 방식, 일 요금, 상태, 계약 기간을 수정합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="h-9 rounded-md border border-border px-3 text-muted-foreground hover:bg-muted"
            onClick={() => router.back()}
          >
            목록으로
          </button>
          <button
            type="button"
            className="h-9 rounded-md bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            onClick={handleSave}
            disabled={saving || loading || !form}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading || !form ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          불러오는 중...
        </div>
      ) : (
        <div className="space-y-4">
          <SectionCard title="차량 정보">
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="차량번호"
                value={form.plate}
                onChange={(v) => handleChange("plate", v)}
              />
              <SelectField
                label="차종"
                value={form.vehicleType}
                options={["젠트로피", "PCX"].map((c) => ({ label: c, value: c }))}
                onChange={(v) => handleChange("vehicleType", v)}
              />
              <Field
                label="색상"
                value={form.color || ""}
                onChange={(v) => handleChange("color", v)}
              />
            </div>
          </SectionCard>

          <SectionCard title="계약 정보">
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="라이더"
                value={form.riderId || ""}
                options={riderOptions.map((r) => ({
                  label: `${r.name}${r.suffix ? ` (${r.suffix})` : ""}`,
                  value: r.id,
                }))}
                onChange={(v) => handleChange("riderId", v)}
                placeholder="라이더 선택"
              />
              <SelectField
                label="계약 방식"
                value={form.contractType}
                options={contractOptions.map((c) => ({ label: c, value: c }))}
                onChange={(v) => handleChange("contractType", v)}
              />
              <CurrencyField
                label="일 요금"
                value={form.dailyFee}
                onChange={(v) => handleChange("dailyFee", v)}
                trailing="원"
              />
              <DateField
                label="계약 시작일"
                value={form.startDate}
                onChange={(v) => handleChange("startDate", v)}
                required
              />
              <DateField
                label="계약 종료일"
                value={form.endDate}
                onChange={(v) => handleChange("endDate", v)}
                min={form.startDate || undefined}
              />
              <div className="md:col-span-2">
                <StatusSwitch
                  label="상태"
                  value={form.status === "active"}
                  onChange={(v) => handleChange("status", v ? "active" : "inactive")}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="보험 정보">
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="보험사"
                value={form.insuranceCompany || ""}
                onChange={(v) => handleChange("insuranceCompany", v)}
                options={INSURANCE_OPTIONS.map((c) => ({ label: c, value: c }))}
                placeholder="보험사 선택"
              />
              <SelectField
                label="보험 연령"
                value={form.insuranceAge || ""}
                onChange={(v) => handleChange("insuranceAge", v)}
                options={INSURANCE_AGE_OPTIONS.map((c) => ({ label: c, value: c }))}
                placeholder="연령 선택"
              />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  trailing,
  helper,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number" | "date";
  trailing?: string;
  helper?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
        />
        {trailing && <span className="text-[11px] text-muted-foreground">{trailing}</span>}
      </div>
      {helper && <span className="text-[11px] text-muted-foreground">{helper}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-foreground outline-none shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {placeholder && !value && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  trailing,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  trailing?: string;
}) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const formatted = digits === "" ? "" : new Intl.NumberFormat("ko-KR").format(Number(digits));

  const handleInput = (val: string) => {
    const onlyDigits = val.replace(/\D/g, "");
    onChange(onlyDigits);
  };

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
        <input
          type="text"
          inputMode="numeric"
          value={formatted}
          onChange={(e) => handleInput(e.target.value)}
          className="h-8 w-full bg-transparent text-foreground outline-none"
        />
        {trailing && <span className="text-[11px] text-muted-foreground">{trailing}</span>}
      </div>
    </label>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatusSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`flex h-10 w-full items-center justify-between rounded-md border px-3 transition ${
          value
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-border bg-background text-muted-foreground"
        }`}
      >
        <span className="text-xs font-medium">{value ? "활성" : "비활성"}</span>
        <span
          className={`inline-flex h-5 w-10 items-center rounded-full border transition ${
            value ? "border-emerald-400 bg-emerald-300/70" : "border-border bg-muted"
          }`}
        >
          <span
            className={`ml-1 h-4 w-4 rounded-full bg-white shadow transition ${
              value ? "translate-x-4" : ""
            }`}
          />
        </span>
      </button>
    </div>
  );
}
