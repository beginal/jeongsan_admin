"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";

type BusinessEntityType = "CORPORATE" | "PERSONAL";

type CorporateOption = {
  id: string;
  name: string;
  regNo: string;
};

interface BusinessEntityEditFormProps {
  entityId: string;
  initialName: string;
  initialType: BusinessEntityType;
  initialRegNo: string;
  initialParentId: string | null;
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

export function BusinessEntityEditForm({
  entityId,
  initialName,
  initialType,
  initialRegNo,
  initialParentId,
  corporateOptions,
}: BusinessEntityEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [regNo, setRegNo] = useState(initialRegNo);
  const [parentId, setParentId] = useState(initialParentId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: any = {
        name: name.trim(),
        registrationNumber: regNo.trim(),
      };

      if (initialType === "PERSONAL") {
        payload.parentEntityId = parentId || null;
      } else {
        payload.parentEntityId = null;
      }

      const res = await fetch(
        `/api/business-entities/${encodeURIComponent(entityId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(
          data?.error || "사업자 정보를 저장하지 못했습니다."
        );
      }

      router.push(
        `/business-entities/${encodeURIComponent(entityId)}`
      );
      router.refresh();
    } catch (e: any) {
      setError(e.message || "사업자 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = initialType === "CORPORATE" ? "법인" : "개인";

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
              <div className="mt-1 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                <span
                  className={
                    initialType === "CORPORATE"
                      ? "inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
                      : "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                  }
                >
                  {typeLabel}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  유형은 변경할 수 없습니다.
                </span>
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

            {initialType === "PERSONAL" && (
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
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
        <GlassButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              `/business-entities/${encodeURIComponent(entityId)}`
            )
          }
          disabled={saving}
        >
          취소
        </GlassButton>
        <GlassButton
          type="submit"
          variant="primary"
          size="sm"
          disabled={saving}
        >
          {saving ? "저장 중..." : "저장"}
        </GlassButton>
      </div>
    </form>
  );
}
