"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BusinessEntityType = "CORPORATE" | "PERSONAL";

type CorporateOption = {
  id: string;
  name: string;
  regNo: string;
};

interface BusinessEntityCreateFormProps {
  corporateOptions: CorporateOption[];
}

function formatBusinessNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function BusinessEntityCreateForm({
  corporateOptions,
}: BusinessEntityCreateFormProps) {
  const router = useRouter();
  const [type, setType] = useState<BusinessEntityType>("CORPORATE");
  const [name, setName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: any = {
        name: name.trim(),
        type,
        registrationNumber: regNo.trim(),
      };
      if (type === "PERSONAL") {
        payload.parentEntityId = parentId || null;
      }

      const res = await fetch("/api/business-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error || !data?.id) {
        throw new Error(
          data?.error || "사업자를 생성하지 못했습니다."
        );
      }

      router.push(
        `/business-entities/${encodeURIComponent(data.id)}`
      );
      router.refresh();
    } catch (e: any) {
      setError(e.message || "사업자를 생성하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="block text-xs font-medium text-muted-foreground">
                사업자 유형
              </label>
              <div className="mt-1 inline-flex rounded-full border border-border bg-background/60 p-0.5 text-[11px] text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setType("CORPORATE")}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${
                    type === "CORPORATE"
                      ? "bg-sky-500 text-white shadow-sm"
                      : ""
                  }`}
                  disabled={saving}
                >
                  법인
                </button>
                <button
                  type="button"
                  onClick={() => setType("PERSONAL")}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${
                    type === "PERSONAL"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : ""
                  }`}
                  disabled={saving}
                >
                  개인
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                사업자명
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 정산봇 주식회사"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                사업자등록번호
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={regNo}
                onChange={(e) =>
                  setRegNo(formatBusinessNumber(e.target.value))
                }
                placeholder="예: 000-00-00000"
              />
              <p className="text-[11px] text-muted-foreground">
                숫자만 입력해도 자동으로 형식이 맞춰집니다.
              </p>
            </div>

            {type === "PERSONAL" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  상위 법인
                </label>
                <select
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">상위 법인 없음</option>
                  {corporateOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.regNo ? ` (${c.regNo})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  개인 사업자인 경우 상위 법인을 연결할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
          onClick={() => router.push("/business-entities")}
          disabled={saving}
        >
          취소
        </button>
        <button
          type="submit"
          className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "생성 중..." : "생성"}
        </button>
      </div>
    </form>
  );
}
