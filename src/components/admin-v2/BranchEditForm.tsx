"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Delete confirmation modal */}
      {mode === "edit" && branchId && showDeleteModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-sm shadow-lg">
            <div className="mb-3 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-xs font-semibold text-red-600">
                !
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  지사를 삭제하시겠습니까?
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  삭제 후에는 이 지사와 연결된 데이터에 영향이 있을 수 있으며,
                  되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
                disabled={deleting}
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDelete();
                  setShowDeleteModal(false);
                }}
                className="inline-flex h-8 items-center rounded-md bg-red-600 px-4 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                disabled={deleting}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            기본 정보
          </h2>

          <div className="mt-3 space-y-3">
            {/* 플랫폼 스위치 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block">
                플랫폼
              </label>
              <div className="flex w-full rounded-full border border-border bg-muted/60 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPlatform("coupang")}
                  className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1 ${
                    platform === "coupang"
                      ? "bg-sky-500 text-white shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  쿠팡
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform("baemin")}
                  className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1 ${
                    platform === "baemin"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  배민
                </button>
              </div>
            </div>

            {/* 시/도, 구/시/군 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  시/도
                </label>
                <select
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  구/시/군
                </label>
                <select
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                >
                  <option value="">선택</option>
                  {filteredDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 지사명 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                지사명
              </label>
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="예: 강남 중앙 1지사"
              />
            </div>

            {/* 최종 지사명 (읽기 전용) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                최종 지사명 (자동 생성)
              </label>
              <input
                className="h-9 w-full rounded-md border border-dashed border-border bg-muted/40 px-2 text-xs text-muted-foreground"
                value={computedDisplayName || displayName}
                readOnly
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                구/시/군 + 지사명이 합쳐진 결과이며 직접 수정할 수 없습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 소속 정보 */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            소속 정보
          </h2>

          <div className="mt-3 space-y-3">
            {/* 소속(법인) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                소속(법인)
              </label>
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              </select>
            </div>

            {/* 소속(개인) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                소속(개인)
              </label>
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={personalId}
                onChange={(e) => setPersonalId(e.target.value)}
              >
                <option value="">선택 안 함</option>
                {filteredPersonalOptions.map((pers) => (
                  <option key={pers.id} value={pers.id}>
                    {pers.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 정산 정보 */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            정산 정보
          </h2>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                설정된 정산 수수료
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFeeType("per_case")}
                  className={`inline-flex flex-1 items-center justify-center rounded-md border px-2 py-1 text-[11px] ${
                    feeType === "per_case"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  건당 수수료
                </button>
                <button
                  type="button"
                  onClick={() => setFeeType("percentage")}
                  className={`inline-flex flex-1 items-center justify-center rounded-md border px-2 py-1 text-[11px] ${
                    feeType === "percentage"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  % 수수료
                </button>
              </div>
              {feeType && (
                <div className="mt-2">
                  <div className="relative">
                    <input
                      className="h-9 w-full rounded-md border border-border bg-background px-2 pr-16 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      type="number"
                      min={0}
                      step={feeType === "per_case" ? 1 : 0.1}
                      value={feeValue}
                      onChange={(e) => setFeeValue(e.target.value)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <span className="text-xs text-muted-foreground">
                        {feeType === "per_case" ? "원 / 건" : "%"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {!feeType && (
                <p className="text-[11px] text-muted-foreground">
                  건당 수수료 또는 % 수수료 중 하나를 선택해 주세요.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
        {mode === "edit" && branchId && (
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex h-8 items-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            disabled={saving || deleting}
          >
            {deleting ? "삭제 중..." : "지사 삭제"}
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
            disabled={saving || deleting}
          >
            취소
          </button>
          <button
            type="submit"
            className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            disabled={saving || deleting}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </form>
  );
}
