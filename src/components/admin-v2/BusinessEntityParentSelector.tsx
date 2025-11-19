"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CorporateOption {
  id: string;
  name: string;
  regNo: string;
}

interface BusinessEntityParentSelectorProps {
  entityId: string;
  currentParentId: string | null;
  options: CorporateOption[];
}

export function BusinessEntityParentSelector({
  entityId,
  currentParentId,
  options,
}: BusinessEntityParentSelectorProps) {
  const router = useRouter();
  const [value, setValue] = useState<string>(currentParentId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (next: string) => {
    setValue(next);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/business-entities/${encodeURIComponent(entityId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentEntityId: next || null,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(
          data?.error || "상위 법인을 변경하지 못했습니다."
        );
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message || "상위 법인을 변경하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <select
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
      >
        <option value="">상위 법인 없음</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.regNo ? ` (${c.regNo})` : ""}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-[11px] text-red-600">{error}</p>
      )}
    </div>
  );
}

