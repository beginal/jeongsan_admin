"use client";

import { useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassInput } from "@/components/ui/glass/GlassInput";
import { GlassSelect } from "@/components/ui/glass/GlassSelect";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";

type FeeType = "per_case" | "percentage" | "";

interface BusinessEntityOption {
  id: string;
  name: string;
  type: "CORPORATE" | "PERSONAL";
  parentEntityId?: string | null;
}

interface ProvinceOption {
  id: number;
  name: string;
}

interface DistrictOption {
  id: number;
  name: string;
  sidoId: number;
}

export interface BranchEditFormProps {
  mode?: "edit" | "create";
  branchId?: string;
  initialPlatform: string;
  initialProvince: string;
  initialDistrict: string;
  initialBranchName: string;
  displayName: string;
  corporateOptions: BusinessEntityOption[];
  personalOptions: BusinessEntityOption[];
  provinceOptions: ProvinceOption[];
  districtOptions: DistrictOption[];
  initialCorporateId: string | null;
  initialPersonalId: string | null;
  initialFeeType: FeeType;
  initialFeeValue: number | null;
}

const branchFormSchema = z
  .object({
    platform: z.enum(["coupang", "baemin"]),
    provinceId: z.string().min(1, "시/도를 선택하세요."),
    districtId: z.string().min(1, "구/시/군을 선택하세요."),
    branchName: z
      .string()
      .trim()
      .min(1, "지사명을 입력하세요."),
    corporateId: z.string().optional().nullable(),
    personalId: z.string().optional().nullable(),
    feeType: z.enum(["per_case", "percentage", ""]).default(""),
    feeValue: z.string().default("").transform((val) => (val ?? "").trim()),
  })
  .superRefine((values, ctx) => {
    if (values.feeType && !values.feeValue) {
      ctx.addIssue({
        code: "custom",
        message: "수수료 값을 입력하세요.",
        path: ["feeValue"],
      });
    }
    if (!values.feeType && values.feeValue) {
      ctx.addIssue({
        code: "custom",
        message: "수수료 유형을 선택하세요.",
        path: ["feeType"],
      });
    }
    if (values.feeValue) {
      const numeric = Number(values.feeValue.replace(/,/g, ""));
      if (Number.isNaN(numeric)) {
        ctx.addIssue({
          code: "custom",
          message: "숫자만 입력하세요.",
          path: ["feeValue"],
        });
      } else if (numeric < 0) {
        ctx.addIssue({
          code: "custom",
          message: "0 이상 입력하세요.",
          path: ["feeValue"],
        });
      }
    }
  });

type BranchFormValues = z.infer<typeof branchFormSchema>;

export function BranchEditForm({
  mode = "edit",
  branchId,
  initialPlatform,
  initialProvince,
  initialDistrict,
  initialBranchName,
  displayName,
  corporateOptions,
  personalOptions,
  provinceOptions,
  districtOptions,
  initialCorporateId,
  initialPersonalId,
  initialFeeType,
  initialFeeValue,
}: BranchEditFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const defaultProvinceId = useMemo(() => {
    const found = provinceOptions.find((p) => p.name === initialProvince);
    return found ? String(found.id) : "";
  }, [initialProvince, provinceOptions]);

  const defaultDistrictId = useMemo(() => {
    const provinceNumeric = Number(
      provinceOptions.find((p) => p.name === initialProvince)?.id
    );
    const found = districtOptions.find(
      (d) =>
        d.name === initialDistrict &&
        (!provinceNumeric || d.sidoId === provinceNumeric)
    );
    return found ? String(found.id) : "";
  }, [districtOptions, initialDistrict, initialProvince, provinceOptions]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema) as Resolver<BranchFormValues>,
    defaultValues: {
      platform: initialPlatform === "baemin" ? "baemin" : "coupang",
      provinceId: defaultProvinceId,
      districtId: defaultDistrictId,
      branchName: initialBranchName,
      corporateId: initialCorporateId ?? "",
      personalId: initialPersonalId ?? "",
      feeType: initialFeeType || "",
      feeValue: initialFeeValue != null ? String(initialFeeValue) : "",
    },
  });

  const selectedProvinceId = watch("provinceId");
  const selectedDistrictId = watch("districtId");
  const selectedCorporateId = watch("corporateId");
  const selectedFeeType = watch("feeType");
  const selectedPlatform = watch("platform");
  const branchName = watch("branchName");
  const saving = isSubmitting;

  const filteredDistricts = useMemo(() => {
    if (!selectedProvinceId) return districtOptions;
    const pid = Number(selectedProvinceId);
    return districtOptions.filter((d) => d.sidoId === pid);
  }, [selectedProvinceId, districtOptions]);

  const filteredPersonalOptions = useMemo(() => {
    if (!selectedCorporateId) {
      // 법인 선택이 안 된 경우, 특정 법인에 종속된 개인( parentEntityId 가 있는 경우 )은 숨김
      return personalOptions.filter((p) => !p.parentEntityId);
    }
    return personalOptions.filter(
      (p) => p.parentEntityId && p.parentEntityId === selectedCorporateId
    );
  }, [selectedCorporateId, personalOptions]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const provinceName =
        provinceOptions.find((p) => String(p.id) === values.provinceId)?.name ?? "";
      const districtName =
        districtOptions.find(
          (d) =>
            String(d.id) === values.districtId &&
            (!values.provinceId || d.sidoId === Number(values.provinceId))
        )?.name ?? "";
      const feeValueNumber =
        values.feeType && values.feeValue
          ? Number(values.feeValue.replace(/,/g, ""))
          : null;

      const body = {
        platform: values.platform,
        province: provinceName,
        district: districtName,
        branchName: values.branchName.trim(),
        corporateEntityId: values.corporateId || null,
        personalEntityId: values.personalId || null,
        feeType: values.feeType || null,
        feeValue: values.feeType ? feeValueNumber : null,
      };

      const isCreate = mode === "create";
      const res = await fetch(isCreate ? "/api/branches" : `/api/branches/${branchId}`, {
        method: isCreate ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          (data && (data.error as string)) ||
          "지사 정보를 저장하지 못했습니다."
        );
      }

      if (isCreate) {
        const newId = data?.id as string | undefined;
        if (newId) {
          router.push(`/branches/${newId}`);
        } else {
          router.push("/branches");
        }
      } else if (branchId) {
        router.push(`/branches/${branchId}`);
      }
      router.refresh();
    } catch (err: any) {
      setSubmitError(err.message || "지사 정보를 저장하지 못했습니다.");
    }
  });

  const handleDelete = async () => {
    if (mode !== "edit" || !branchId) return;
    setSubmitError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data.error as string)) || "지사를 삭제하지 못했습니다."
        );
      }
      router.push("/branches");
      router.refresh();
    } catch (err: any) {
      setSubmitError(err.message || "지사를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const currentProvinceName =
    provinceOptions.find((p) => String(p.id) === selectedProvinceId)?.name ?? "";
  const computedDisplayName =
    (filteredDistricts.find((d) => String(d.id) === selectedDistrictId)?.name ||
      currentProvinceName ||
      "") +
    (branchName ? ` ${branchName}` : "");

  const handleFeeTypeSelect = (type: FeeType) => {
    if (selectedFeeType === type) {
      setValue("feeType", "", { shouldDirty: true, shouldValidate: true });
      setValue("feeValue", "", { shouldDirty: true, shouldValidate: true });
      return;
    }
    setValue("feeType", type, { shouldDirty: true, shouldValidate: true });
  };

  const provinceField = register("provinceId");
  const districtField = register("districtId");
  const corporateField = register("corporateId");
  const personalField = register("personalId");
  const branchNameField = register("branchName");
  const feeValueField = register("feeValue");

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title={mode === "create" ? "새 지사 등록" : "지사 정보 수정"}
        description={
          mode === "create"
            ? "새로운 지사를 등록하고 관리합니다."
            : "지사의 기본 정보와 정산 설정을 수정합니다."
        }
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "지사 관리", href: "/branches" },
          {
            label: mode === "create" ? "새 지사" : "지사 수정",
            href: "#",
          },
        ]}
      />

      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-700 backdrop-blur-sm">
          {submitError}
        </div>
      )}

      {/* 액션 버튼 (상단) */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs">
        {mode === "edit" && branchId && (
          <GlassButton
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            disabled={saving || deleting}
          >
            {deleting ? "삭제 중..." : "지사 삭제"}
          </GlassButton>
        )}
        <div className="ml-auto flex gap-3">
          <GlassButton
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving || deleting}
          >
            취소
          </GlassButton>
          <GlassButton
            type="submit"
            variant="primary"
            disabled={saving || deleting}
          >
            {saving ? "저장 중..." : "저장"}
          </GlassButton>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {mode === "edit" && branchId && showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                !
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  지사를 삭제하시겠습니까?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  삭제 후에는 이 지사와 연결된 데이터에 영향이 있을 수 있으며,
                  되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <GlassButton
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                취소
              </GlassButton>
              <GlassButton
                type="button"
                variant="destructive"
                onClick={async () => {
                  await handleDelete();
                  setShowDeleteModal(false);
                }}
                disabled={deleting}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      <div className="space-y-6">
        {/* 기본 정보 */}
        <Section title="기본 정보">
          <div className="grid gap-6">
            {/* 플랫폼 스위치 - Fixed Segmented Control */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1">
                플랫폼
              </label>
              <div className="flex w-full rounded-xl border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setValue("platform", "coupang", { shouldDirty: true })}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${selectedPlatform === "coupang"
                    ? "bg-background text-blue-600 shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    }`}
                  disabled={saving || deleting}
                >
                  쿠팡
                </button>
                <button
                  type="button"
                  onClick={() => setValue("platform", "baemin", { shouldDirty: true })}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${selectedPlatform === "baemin"
                    ? "bg-background text-teal-600 shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    }`}
                  disabled={saving || deleting}
                >
                  배민
                </button>
              </div>
            </div>

            {/* 시/도, 구/시/군 */}
            <div className="grid grid-cols-2 gap-4">
              <GlassSelect
                label="시/도"
                error={errors.provinceId?.message}
                {...provinceField}
                onChange={(e) => {
                  provinceField.onChange(e);
                  setValue("provinceId", e.target.value, { shouldDirty: true, shouldValidate: true });
                  setValue("districtId", "", { shouldDirty: true, shouldValidate: true });
                }}
                disabled={saving || deleting}
              >
                <option value="">선택</option>
                {provinceOptions.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </GlassSelect>

              <GlassSelect
                label="구/시/군"
                error={errors.districtId?.message}
                {...districtField}
                onChange={(e) => {
                  districtField.onChange(e);
                  setValue("districtId", e.target.value, { shouldDirty: true, shouldValidate: true });
                }}
                disabled={saving || deleting}
              >
                <option value="">선택</option>
                {filteredDistricts.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </GlassSelect>
            </div>

            {/* 지사명 */}
            <GlassInput
              label="지사명"
              placeholder="예: 강남 중앙 1지사"
              error={errors.branchName?.message}
              disabled={saving || deleting}
              {...branchNameField}
            />

            {/* 최종 지사명 (읽기 전용) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1">
                최종 지사명 (자동 생성)
              </label>
              <input
                className="h-11 w-full rounded-xl border-2 border-dashed border-border/60 bg-muted/20 px-4 text-sm text-muted-foreground font-medium"
                value={computedDisplayName || displayName}
                readOnly
                disabled
              />
              <p className="text-[11px] text-muted-foreground ml-1">
                구/시/군 + 지사명이 합쳐진 결과이며 직접 수정할 수 없습니다.
              </p>
            </div>
          </div>
        </Section>

        {/* 소속 정보 */}
        <Section title="소속 정보">
          <div className="grid gap-6">
            <GlassSelect
              label="소속(법인)"
              error={errors.corporateId?.message}
              {...corporateField}
              onChange={(e) => {
                corporateField.onChange(e);
                setValue("personalId", "", { shouldDirty: true, shouldValidate: true });
              }}
              disabled={saving || deleting}
            >
              <option value="">선택 안 함</option>
              {corporateOptions.map((corp) => (
                <option key={corp.id} value={corp.id}>
                  {corp.name}
                </option>
              ))}
            </GlassSelect>

            <GlassSelect
              label="소속(개인)"
              error={errors.personalId?.message}
              {...personalField}
              disabled={saving || deleting}
            >
              <option value="">선택 안 함</option>
              {filteredPersonalOptions.map((pers) => (
                <option key={pers.id} value={pers.id}>
                  {pers.name}
                </option>
              ))}
            </GlassSelect>
          </div>
        </Section>

        {/* 정산 정보 */}
        <Section title="정산 정보">
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1">
                설정된 정산 수수료
              </label>
              <div className="flex gap-3">
                <GlassButton
                  type="button"
                  variant={selectedFeeType === "per_case" ? "primary" : "outline"}
                  onClick={() => handleFeeTypeSelect("per_case")}
                  className="flex-1"
                  disabled={saving || deleting}
                >
                  건당 수수료
                </GlassButton>
                <GlassButton
                  type="button"
                  variant={selectedFeeType === "percentage" ? "primary" : "outline"}
                  onClick={() => handleFeeTypeSelect("percentage")}
                  className="flex-1"
                  disabled={saving || deleting}
                >
                  % 수수료
                </GlassButton>
              </div>
              {selectedFeeType && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="relative">
                    <GlassInput
                      type="text"
                      inputMode="decimal"
                      error={errors.feeValue?.message}
                      disabled={saving || deleting}
                      {...feeValueField}
                      className="pr-16"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-xs font-medium text-muted-foreground">
                        {selectedFeeType === "per_case" ? "원 / 건" : "%"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {!selectedFeeType && (
                <p className="text-[11px] text-muted-foreground ml-1">
                  건당 수수료 또는 % 수수료 중 하나를 선택해 주세요.
                </p>
              )}
              {errors.feeType?.message && (
                <p className="text-[11px] text-red-500 ml-1">{errors.feeType.message}</p>
              )}
            </div>
          </div>
        </Section>
      </div>
    </form>
  );
}
