"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";

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
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        type: z.enum(["CORPORATE", "PERSONAL"]),
        name: z.string().trim().min(1, "사업자명을 입력하세요."),
        registrationNumber: z
          .string()
          .trim()
          .transform((v) => v.replace(/\s+/g, ""))
          .superRefine((v, ctx) => {
            const digits = v.replace(/\D/g, "");
            if (digits.length !== 10) {
              ctx.addIssue({
                code: "custom",
                message: "10자리 사업자등록번호를 입력하세요.",
              });
            }
          }),
        parentEntityId: z.string().optional(),
      }),
    []
  );

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit: formHandleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "CORPORATE",
      name: "",
      registrationNumber: "",
      parentEntityId: "",
    },
  });

  const type = watch("type");
  const saving = isSubmitting;

  const onSubmit = formHandleSubmit(async (values) => {
    setError(null);
    try {
      const payload = {
        name: values.name.trim(),
        type: values.type,
        registrationNumber: formatBusinessNumber(values.registrationNumber).trim(),
        parentEntityId: values.type === "PERSONAL" ? values.parentEntityId || null : null,
      };

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
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
                <GlassButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue("type", "CORPORATE", { shouldDirty: true });
                    setValue("parentEntityId", "", { shouldDirty: true });
                  }}
                  className={`h-auto rounded-full px-2.5 py-0.5 text-[11px] hover:bg-transparent ${type === "CORPORATE"
                    ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/25 hover:bg-primary/90"
                    : "bg-white text-foreground hover:bg-muted"
                    }`}
                  disabled={saving}
                >
                  법인
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setValue("type", "PERSONAL", { shouldDirty: true })}
                  className={`h-auto rounded-full px-2.5 py-0.5 text-[11px] hover:bg-transparent ${type === "PERSONAL"
                    ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/25 hover:bg-primary/90"
                    : "bg-white text-foreground hover:bg-muted"
                    }`}
                  disabled={saving}
                >
                  개인
                </GlassButton>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                사업자명
              </label>
              <input
                className={`h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${errors.name ? "border-red-300 focus:border-red-400 focus:ring-red-300/60" : ""
                  }`}
                placeholder="예: 정산봇 주식회사"
                disabled={saving}
                {...register("name")}
              />
              {errors.name?.message && (
                <p className="text-[11px] text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                사업자등록번호
              </label>
              <input
                className={`h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${errors.registrationNumber ? "border-red-300 focus:border-red-400 focus:ring-red-300/60" : ""
                  }`}
                placeholder="예: 000-00-00000"
                disabled={saving}
                {...register("registrationNumber")}
                onChange={(e) => {
                  const formatted = formatBusinessNumber(e.target.value);
                  setValue("registrationNumber", formatted, { shouldDirty: true, shouldValidate: true });
                }}
              />
              {errors.registrationNumber?.message && (
                <p className="text-[11px] text-red-500">
                  {errors.registrationNumber.message}
                </p>
              )}
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
                  disabled={saving}
                  {...register("parentEntityId")}
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
        <GlassButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/business-entities")}
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
          {saving ? "생성 중..." : "생성"}
        </GlassButton>
      </div>
    </form>
  );
}
