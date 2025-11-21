"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassInput } from "@/components/ui/glass/GlassInput";
import { GlassSelect } from "@/components/ui/glass/GlassSelect";
import { GlassButton } from "@/components/ui/glass/GlassButton";

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

  const [platform, setPlatform] = useState<"coupang" | "baemin">(
    initialPlatform === "baemin" ? "baemin" : "coupang"
  );
  const [provinceId, setProvinceId] = useState<string>(() => {
    const found = provinceOptions.find((p) => p.name === initialProvince);
    return found ? String(found.id) : provinceOptions[0]?.id?.toString() ?? "";
  });
  const [districtId, setDistrictId] = useState<string>(() => {
    const provinceNumeric = Number(
      provinceOptions.find((p) => p.name === initialProvince)?.id ??
      provinceOptions[0]?.id
    );
    const found = districtOptions.find(
      (d) =>
        d.name === initialDistrict &&
        (!provinceNumeric || d.sidoId === provinceNumeric)
    );
    return found ? String(found.id) : "";
  });
  const [branchName, setBranchName] = useState(initialBranchName);
  const [corporateId, setCorporateId] = useState<string>(
    initialCorporateId ?? ""
  );
  const [personalId, setPersonalId] = useState<string>(
    initialPersonalId ?? ""
  );
  const [feeType, setFeeType] = useState<FeeType>(initialFeeType ?? "");
  const [feeValue, setFeeValue] = useState<string>(
    initialFeeValue != null ? String(initialFeeValue) : ""
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredDistricts = useMemo(() => {
    if (!provinceId) return districtOptions;
    const pid = Number(provinceId);
    return districtOptions.filter((d) => d.sidoId === pid);
  }, [provinceId, districtOptions]);

  const filteredPersonalOptions = useMemo(() => {
    if (!corporateId) {
      // 법인 선택이 안 된 경우, 특정 법인에 종속된 개인( parentEntityId 가 있는 경우 )은 숨김
      return personalOptions.filter((p) => !p.parentEntityId);
    }
    return personalOptions.filter(
      (p) => p.parentEntityId && p.parentEntityId === corporateId
    );
  }, [corporateId, personalOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const body = {
        platform,
        province:
          provinceOptions.find((p) => String(p.id) === provinceId)?.name ?? "",
        district:
          filteredDistricts.find((d) => String(d.id) === districtId)?.name ??
          "",
        branchName: branchName.trim(),
        corporateEntityId: corporateId || null,
        personalEntityId: personalId || null,
        feeType: feeType || null,
        feeValue:
          feeType && feeValue !== ""
            ? Number(feeValue.replace(/,/g, ""))
            : null,
      };

      const isCreate = mode === "create";

      const res = await fetch(isCreate ? "/api/branches" : `/api/branches/${branchId}`, {
        method: isCreate ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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
      setError(err.message || "지사 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !branchId) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data.error as string)) ||
          "지사를 삭제하지 못했습니다."
        );
      }
      router.push("/branches");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "지사를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const currentProvinceName =
    provinceOptions.find((p) => String(p.id) === provinceId)?.name ?? "";
  const computedDisplayName =
    (filteredDistricts.find((d) => String(d.id) === districtId)?.name ||
      currentProvinceName ||
      "") +
    (branchName ? ` ${branchName}` : "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-700 backdrop-blur-sm">
          {error}
        </div>
      )}

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
        <GlassCard title="기본 정보">
          <div className="grid gap-6">
            {/* 플랫폼 스위치 */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block ml-1">
                플랫폼
              </label>
              <div className="flex w-full rounded-xl border border-border bg-muted/30 p-1 text-xs">
                <GlassButton
                  type="button"
                  variant="ghost"
                  onClick={() => setPlatform("coupang")}
                  className={`flex-1 rounded-lg px-3 py-2 font-medium h-auto ${platform === "coupang"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/25 hover:bg-primary/90"
                    : "bg-white text-foreground hover:bg-muted"
                    }`}
                >
                  쿠팡
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="ghost"
                  onClick={() => setPlatform("baemin")}
                  className={`flex-1 rounded-lg px-3 py-2 font-medium h-auto ${platform === "baemin"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/25 hover:bg-primary/90"
                    : "bg-white text-foreground hover:bg-muted"
                    }`}
                >
                  배민
                </GlassButton>
              </div>
            </div>

            {/* 시/도, 구/시/군 */}
            <div className="grid grid-cols-2 gap-4">
              <GlassSelect
                label="시/도"
                value={provinceId}
                onChange={(e) => {
                  setProvinceId(e.target.value);
                  setDistrictId("");
                }}
              >
                {provinceOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </GlassSelect>

              <GlassSelect
                label="구/시/군"
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
              >
                <option value="">선택</option>
                {filteredDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </GlassSelect>
            </div>

            {/* 지사명 */}
            <GlassInput
              label="지사명"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="예: 강남 중앙 1지사"
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
        </GlassCard>

        {/* 소속 정보 */}
        <GlassCard title="소속 정보">
          <div className="grid gap-6">
            <GlassSelect
              label="소속(법인)"
              value={corporateId}
              onChange={(e) => {
                setCorporateId(e.target.value);
                setPersonalId("");
              }}
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
              value={personalId}
              onChange={(e) => setPersonalId(e.target.value)}
            >
              <option value="">선택 안 함</option>
              {filteredPersonalOptions.map((pers) => (
                <option key={pers.id} value={pers.id}>
                  {pers.name}
                </option>
              ))}
            </GlassSelect>
          </div>
        </GlassCard>

        {/* 정산 정보 */}
        <GlassCard title="정산 정보">
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1">
                설정된 정산 수수료
              </label>
              <div className="flex gap-3">
                <GlassButton
                  type="button"
                  variant="ghost"
                  onClick={() => setFeeType("per_case")}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-medium h-auto ${feeType === "per_case"
                    ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/25 hover:bg-primary/90"
                    : "border-border bg-white text-foreground hover:bg-muted"
                    }`}
                >
                  건당 수수료
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="ghost"
                  onClick={() => setFeeType("percentage")}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-medium h-auto ${feeType === "percentage"
                    ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/25 hover:bg-primary/90"
                    : "border-border bg-white text-foreground hover:bg-muted"
                    }`}
                >
                  % 수수료
                </GlassButton>
              </div>
              {feeType && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="relative">
                    <GlassInput
                      type="number"
                      min={0}
                      step={feeType === "per_case" ? 1 : 0.1}
                      value={feeValue}
                      onChange={(e) => setFeeValue(e.target.value)}
                      className="pr-16"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-xs font-medium text-muted-foreground">
                        {feeType === "per_case" ? "원 / 건" : "%"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {!feeType && (
                <p className="text-[11px] text-muted-foreground ml-1">
                  건당 수수료 또는 % 수수료 중 하나를 선택해 주세요.
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between border-t border-border/50 pt-6 text-xs">
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
    </form>
  );
}
