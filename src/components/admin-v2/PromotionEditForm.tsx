"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassInput } from "@/components/ui/glass/GlassInput";
import { GlassSelect } from "@/components/ui/glass/GlassSelect";
import { GlassTextarea } from "@/components/ui/glass/GlassTextarea";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";
import { DateField } from "@/components/ui/DateField";
import { Switch } from "@/components/ui/Switch";

type PromotionType = "excess" | "milestone" | "milestone_per_unit";
type PromotionStatusDb = "ACTIVE" | "INACTIVE";

type PeakMode = "AND" | "OR";
type PeakSlot =
  | "Breakfast"
  | "Lunch_Peak"
  | "Dinner_Peak"
  | "Post_Lunch"
  | "Post_Dinner";

type PeakCondition = {
  slot: PeakSlot;
  minCount: string;
};

type BranchOption = {
  id: string;
  name: string;
  province?: string;
  district?: string;
  platform?: string;
  corporateName?: string;
  personalName?: string;
};

type SelectedBranch = {
  id: string;
  name: string;
  active: boolean;
};

type PromotionEditFormProps = {
  promotionId?: string;
};

const promotionSchema = z.object({
  name: z.string().trim().min(1, "프로모션명을 입력하세요."),
  type: z.enum(["excess", "milestone", "milestone_per_unit"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  peakMode: z.enum(["AND", "OR"]),
  peakScoreThreshold: z.string().optional(),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

export function PromotionEditForm({ promotionId }: PromotionEditFormProps) {
  const router = useRouter();
  const isCreate = !promotionId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [peakConditions, setPeakConditions] = useState<PeakCondition[]>([]);

  const [configExcess, setConfigExcess] = useState<{
    threshold: string;
    amountPerExcess: string;
    cap?: string;
  }>({ threshold: "", amountPerExcess: "", cap: "" });

  const [configMilestone, setConfigMilestone] = useState<{
    tiers: { threshold: string; amount: string }[];
  }>({ tiers: [{ threshold: "", amount: "" }] });

  const [configPerUnit, setConfigPerUnit] = useState<{
    threshold: string;
    unitSize: string;
    unitAmount: string;
  }>({ threshold: "", unitSize: "", unitAmount: "" });

  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<SelectedBranch[]>([]);
  const [initialAssignedIds, setInitialAssignedIds] = useState<string[]>([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    register,
    handleSubmit: formHandleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: "",
      type: "excess",
      status: "ACTIVE",
      description: "",
      startDate: "",
      endDate: "",
      peakMode: "AND",
      peakScoreThreshold: "0",
    },
  });

  const saving = isSubmitting;
  const name = watch("name");
  const type = watch("type");
  const status = watch("status");
  const description = watch("description");
  const startDate = watch("startDate") || "";
  const endDate = watch("endDate") || "";
  const peakMode = watch("peakMode");
  const peakModeField = register("peakMode");
  const peakScoreThreshold = watch("peakScoreThreshold") ?? "0";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isCreate) {
        // create 모드: 지사 목록만 불러오고 나머지는 비워둠
        setLoading(true);
        try {
          const res = await fetch("/api/branches", { credentials: "include" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data?.error) throw new Error(data?.error || "지사 목록을 불러오지 못했습니다.");
          if (!cancelled) {
            const branches = Array.isArray(data.branches) ? data.branches : [];
            setAvailableBranches(
              branches.map((b: any) => ({
                id: String(b.id),
                name: b.display_name || b.branch_name || b.name || String(b.id),
                province: b.province || "",
                district: b.district || "",
                platform: b.platform || "",
              }))
            );
            setSelectedBranches([]);
            setInitialAssignedIds([]);
          }
        } catch (e: any) {
          if (!cancelled) setError(e.message || "지사 목록을 불러오지 못했습니다.");
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      setError(null);
      setLoading(true);
      try {
        const res = await fetch(
          `/api/promotions/${encodeURIComponent(promotionId!)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.error || "프로모션 정보를 불러오지 못했습니다."
          );
        }
        if (cancelled) return;

        const p = data.promotion as any;
        const cfg = (p?.config ?? {}) as any;

        const modeRaw = String((cfg.peakPrecondition as any)?.mode || "").toUpperCase();
        const resolvedPeakMode: PeakMode = modeRaw === "OR" ? "OR" : "AND";

      reset({
        name: p.name || "",
        type:
          p.type === "milestone_per_unit" || p.type === "milestone" || p.type === "excess"
            ? (p.type as PromotionType)
              : "excess",
          status: p.status === "INACTIVE" ? "INACTIVE" : ("ACTIVE" as PromotionStatusDb),
          description:
            (typeof p.description === "string" && p.description) ||
            (typeof cfg.description === "string" && cfg.description) ||
            "",
          startDate:
            (typeof p.start_date === "string" && p.start_date.slice(0, 10)) ||
            (typeof cfg.startDate === "string" && cfg.startDate.slice(0, 10)) ||
            "",
          endDate:
            (typeof p.end_date === "string" && p.end_date.slice(0, 10)) ||
            (typeof cfg.endDate === "string" && cfg.endDate.slice(0, 10)) ||
            "",
        peakMode: resolvedPeakMode,
        peakScoreThreshold:
          typeof (cfg.peakPrecondition as any)?.minScore === "number"
            ? String((cfg.peakPrecondition as any)?.minScore)
            : typeof (cfg.peakPrecondition as any)?.min_score === "number"
              ? String((cfg.peakPrecondition as any)?.min_score)
              : "0",
      });

        // 피크타임 선행 조건
        const peak = cfg.peakPrecondition as
          | { mode?: string; conditions?: any[] }
          | undefined;
        if (peak && Array.isArray(peak.conditions)) {
          const modeRaw = String(peak.mode || "").toUpperCase();
          setValue("peakMode", modeRaw === "OR" ? "OR" : "AND", { shouldDirty: false });
          const minScoreRaw = (peak as any).minScore ?? (peak as any).min_score;
          const minScoreNum = typeof minScoreRaw === "number" ? minScoreRaw : Number(minScoreRaw);
          setValue(
            "peakScoreThreshold",
            Number.isFinite(minScoreNum) && minScoreNum > 0 ? String(minScoreNum) : "",
            { shouldDirty: false }
          );
          setPeakConditions(
            peak.conditions.map((c: any) => ({
              slot: (c.slot as PeakSlot) || "Breakfast",
              minCount:
                c.minCount != null ? String(c.minCount ?? "") : "",
            }))
          );
        } else {
          setValue("peakMode", "AND", { shouldDirty: true });
          setValue("peakScoreThreshold", "", { shouldDirty: false });
          setPeakConditions([]);
        }

        if (p.type === "excess") {
          setConfigExcess({
            threshold:
              cfg.threshold != null ? String(cfg.threshold ?? "") : "",
            amountPerExcess:
              cfg.amountPerExcess != null
                ? String(cfg.amountPerExcess ?? "")
                : "",
            cap: cfg.cap != null ? String(cfg.cap ?? "") : "",
          });
        } else if (p.type === "milestone") {
          const ms: any[] = Array.isArray(cfg.milestones)
            ? cfg.milestones
            : [];
          const tiers =
            ms.length > 0
              ? ms.map((m) => ({
                threshold:
                  m.threshold != null ? String(m.threshold ?? "") : "",
                amount: m.amount != null ? String(m.amount ?? "") : "",
              }))
              : [{ threshold: "", amount: "" }];
          setConfigMilestone({ tiers });
        } else if (p.type === "milestone_per_unit") {
          const arr: any[] = Array.isArray(cfg.milestonePerUnit)
            ? cfg.milestonePerUnit
            : [];
          const first = arr[0] || {};
          setConfigPerUnit({
            threshold:
              first.threshold != null ? String(first.threshold ?? "") : "",
            unitSize:
              first.unitSize != null ? String(first.unitSize ?? "") : "",
            unitAmount:
              first.unitAmount != null ? String(first.unitAmount ?? "") : "",
          });
        } else {
          setConfigExcess({ threshold: "", amountPerExcess: "", cap: "" });
          setConfigMilestone({ tiers: [{ threshold: "", amount: "" }] });
          setConfigPerUnit({ threshold: "", unitSize: "", unitAmount: "" });
        }

        const assignments = Array.isArray(data.assignments)
          ? data.assignments
          : [];
        const selected: SelectedBranch[] = assignments.map((a: any) => ({
          id: String(a.branch_id),
          name: a.name || String(a.branch_id),
          active: !!a.active,
        }));
        setSelectedBranches(selected);
        setInitialAssignedIds(selected.map((s) => s.id));

        const branches = Array.isArray(data.branches) ? data.branches : [];
        setAvailableBranches(
          branches.map((b: any) => ({
            id: String(b.id),
            name: b.name || String(b.id),
            province: b.province || "",
            district: b.district || "",
            platform: b.platform || "",
            corporateName: b.corporateName || b.corporate_name || "",
            personalName: b.personalName || b.personal_name || "",
          }))
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "프로모션 정보를 불러오지 못했습니다.");
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
  }, [promotionId, isCreate, reset, setValue]);

  const filteredAvailableBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    const selectedIds = new Set(selectedBranches.map((b) => b.id));
    return availableBranches
      .filter((b) => !selectedIds.has(b.id))
      .filter((b) => {
        if (!q) return true;
        const text = `${b.name} ${b.province || ""} ${b.district || ""}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 20);
  }, [availableBranches, selectedBranches, branchSearch]);

  const handleAddBranch = (branch: BranchOption) => {
    setSelectedBranches((prev) => [
      ...prev,
      { id: branch.id, name: branch.name, active: true },
    ]);
  };

  const handleRemoveBranch = (branchId: string) => {
    setSelectedBranches((prev) => prev.filter((b) => b.id !== branchId));
  };

  const onSubmit = formHandleSubmit(async (values) => {
    setError(null);
    try {
      let baseConfig: any;
      if (values.type === "excess") {
        const amt = Number(configExcess.amountPerExcess || 0);
        const threshold = Number(configExcess.threshold || 0);
        if (!amt || !threshold) {
          setError("건당 초과 기준/금액을 입력하세요.");
          return;
        }
        baseConfig = { threshold, amountPerExcess: amt, amount: amt };
        if (configExcess.cap) {
          baseConfig.cap = Number(configExcess.cap);
        }
      } else if (values.type === "milestone") {
        const milestones = configMilestone.tiers
          .filter((t) => t.threshold !== "" && t.amount !== "")
          .map((t) => ({
            threshold: Number(t.threshold || 0),
            amount: Number(t.amount || 0),
          }));
        if (milestones.length === 0) {
          setError("마일스톤 티어를 추가하세요.");
          return;
        }
        baseConfig = { milestones };
      } else {
        const threshold = Number(configPerUnit.threshold || 0);
        const unitSize = Number(configPerUnit.unitSize || 0);
        const unitAmount = Number(configPerUnit.unitAmount || 0);
        if (!threshold || !unitSize || !unitAmount) {
          setError("기준/단위/금액을 모두 입력하세요.");
          return;
        }
        baseConfig = {
          milestonePerUnit: [
            {
              threshold,
              unitSize,
              unitAmount,
            },
          ],
        };
      }

      if (values.description && values.description.trim()) {
        baseConfig.description = values.description.trim();
      }

      const normalizedPeakConds = peakConditions
        .filter((c) => c.slot && c.minCount.trim() !== "")
        .map((c) => ({
          slot: c.slot,
          minCount: Number(c.minCount || 0),
        }));

      if (normalizedPeakConds.length > 0) {
        const minScore =
          peakScoreThreshold && Number(peakScoreThreshold) > 0
            ? Number(peakScoreThreshold)
            : 0;
        baseConfig.peakPrecondition = {
          mode: values.peakMode,
          conditions: normalizedPeakConds,
          ...(minScore ? { minScore } : {}),
        };
      }

      const payload = {
        name: values.name.trim(),
        type: values.type,
        status: values.status,
        config: baseConfig,
        start_date: values.startDate || null,
        end_date: values.endDate || null,
        assignments: selectedBranches.map((b) => ({
          branch_id: b.id,
          is_active: b.active,
          start_date: null,
          end_date: null,
          priority_order: null,
        })),
      };

      if (isCreate) {
        const res = await fetch("/api/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "프로모션을 생성하지 못했습니다.");
        }
        const newId = data.id || "";
        router.push(`/promotions/${encodeURIComponent(newId)}/edit`);
        router.refresh();
        return;
      }

      const patchRes = await fetch(`/api/promotions/${encodeURIComponent(promotionId!)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, initial_assignments: initialAssignedIds }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok || patchData?.error) {
        throw new Error(patchData?.error || "프로모션 정보를 저장하지 못했습니다.");
      }

      const upserts = selectedBranches.map((b) => ({
        branch_id: b.id,
        is_active: b.active,
        start_date: null as string | null,
        end_date: null as string | null,
        priority_order: null as number | null,
      }));

      if (upserts.length > 0) {
        const assignRes = await fetch(
          `/api/promotions/${encodeURIComponent(promotionId!)}/assignments`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(upserts),
          }
        );
        const assignData = await assignRes.json().catch(() => ({}));
        if (!assignRes.ok || assignData?.error) {
          throw new Error(assignData?.error || "프로모션 지사 배정을 저장하지 못했습니다.");
        }
      }

      const removed = initialAssignedIds.filter((id) => !selectedBranches.some((b) => b.id === id));
      if (removed.length > 0) {
        const delRes = await fetch(
          `/api/promotions/${encodeURIComponent(promotionId!)}/assignments`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branch_ids: removed }),
          }
        );
        const delData = await delRes.json().catch(() => ({}));
        if (!delRes.ok || delData?.error) {
          throw new Error(delData?.error || "프로모션 지사 배정을 삭제하지 못했습니다.");
        }
      }

      router.push("/promotions");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "프로모션 정보를 저장하지 못했습니다.");
    }
  });

  const handleDelete = async () => {
    if (isCreate || !promotionId) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/promotions/${encodeURIComponent(promotionId)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(
          data?.error || "프로모션을 삭제하지 못했습니다."
        );
      }
      router.push("/promotions");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "프로모션을 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-6 text-xs text-muted-foreground">
        프로모션 정보를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title={isCreate ? "프로모션 생성" : "프로모션 수정"}
        description={name || "제목 없음"}
        actions={
          <div className="flex items-center gap-2">
            {!isCreate && (
              <GlassButton
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                disabled={saving || deleting}
              >
                삭제
              </GlassButton>
            )}
            <GlassButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push("/promotions")}
              disabled={saving || deleting}
            >
              취소
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="sm" disabled={saving || deleting}>
              {saving ? "저장 중..." : "저장"}
            </GlassButton>
          </div>
        }
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Delete confirmation modal */}
      {!isCreate && showDeleteModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-sm shadow-lg">
            <div className="mb-3 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-xs font-semibold text-red-600">
                !
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  프로모션을 삭제하시겠습니까?
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  삭제 후에는 이 프로모션과 연결된 지사 배정에 영향이 있을 수 있으며,
                  되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <GlassButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                취소
              </GlassButton>
              <GlassButton
                type="button"
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await handleDelete();
                  setShowDeleteModal(false);
                }}
                disabled={deleting}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-4">
          <Section title="기본 정보">
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <GlassInput
                  label="프로모션명"
                  value={name}
                  onChange={(e) => setValue("name", e.target.value, { shouldDirty: true, shouldValidate: true })}
                  placeholder="예: 7월 피크 보너스"
                  error={errors.name?.message}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <GlassSelect
                    label="유형"
                    value={type}
                    onChange={(e) => setValue("type", e.target.value as PromotionType, { shouldDirty: true })}
                    options={[
                      { label: "건수 초과 보상", value: "excess" },
                      { label: "목표 달성 보상", value: "milestone" },
                      { label: "단위당 보상", value: "milestone_per_unit" },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Switch
                    label="활성 상태"
                    description="활성 시 즉시 적용되며, 비활성 시 노출/지급이 중단됩니다."
                    checked={status === "ACTIVE"}
                    onChange={(v) => setValue("status", v ? "ACTIVE" : "INACTIVE", { shouldDirty: true })}
                    onLabel="활성"
                    offLabel="비활성"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label="시작일"
                  value={startDate}
                  onChange={(v) => setValue("startDate", v, { shouldDirty: true })}
                  placeholder="YYYY-MM-DD"
                />
                <DateField
                  label="종료일"
                  value={endDate}
                  onChange={(v) => setValue("endDate", v, { shouldDirty: true })}
                  placeholder="YYYY-MM-DD"
                  min={startDate || undefined}
                />
              </div>
              <div className="space-y-1.5">
                <GlassTextarea
                  label="프로모션 설명"
                  value={description}
                  onChange={(e) => setValue("description", e.target.value, { shouldDirty: true })}
                  placeholder="프로모션 설명 (선택 사항)"
                />
              </div>
            </div>
          </Section>

          <Section title="프로모션 설정">
            <div className="mt-3 space-y-3">
              {type === "excess" && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <GlassInput
                    label="임계치(건수)"
                    value={configExcess.threshold}
                    onChange={(e) =>
                      setConfigExcess((prev) => ({
                        ...prev,
                        threshold: e.target.value,
                      }))
                    }
                    placeholder="예: 100"
                  />
                  <GlassInput
                    label="초과 1건당 금액(+원)"
                    value={configExcess.amountPerExcess}
                    onChange={(e) =>
                      setConfigExcess((prev) => ({
                        ...prev,
                        amountPerExcess: e.target.value,
                      }))
                    }
                    placeholder="예: 1000"
                  />
                  <GlassInput
                    label="상한(옵션)"
                    value={configExcess.cap || ""}
                    onChange={(e) =>
                      setConfigExcess((prev) => ({
                        ...prev,
                        cap: e.target.value,
                      }))
                    }
                    placeholder="예: 50000"
                  />
                </div>
              )}
              {type === "milestone" && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground ml-1">
                    마일스톤 구간
                  </span>
                  {configMilestone.tiers.map((t, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,1fr,auto]"
                    >
                      <GlassInput
                        label="도달 건수"
                        value={t.threshold}
                        onChange={(e) =>
                          setConfigMilestone((prev) => ({
                            tiers: prev.tiers.map((x, i) =>
                              i === idx
                                ? { ...x, threshold: e.target.value }
                                : x
                            ),
                          }))
                        }
                        placeholder="예: 120"
                      />
                      <GlassInput
                        label="지급 금액(+원)"
                        value={t.amount}
                        onChange={(e) =>
                          setConfigMilestone((prev) => ({
                            tiers: prev.tiers.map((x, i) =>
                              i === idx
                                ? { ...x, amount: e.target.value }
                                : x
                            ),
                          }))
                        }
                        placeholder="예: 5000"
                      />
                      <div className="flex items-end pb-0.5">
                        <GlassButton
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-11 px-3 text-[11px]"
                          onClick={() =>
                            setConfigMilestone((prev) => ({
                              tiers: prev.tiers.filter((_, i) => i !== idx),
                            }))
                          }
                          disabled={configMilestone.tiers.length <= 1}
                        >
                          삭제
                        </GlassButton>
                      </div>
                    </div>
                  ))}
                  <GlassButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                    onClick={() =>
                      setConfigMilestone((prev) => ({
                        tiers: [...prev.tiers, { threshold: "", amount: "" }],
                      }))
                    }
                  >
                    + 구간 추가
                  </GlassButton>
                </div>
              )}
              {type === "milestone_per_unit" && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <GlassInput
                    label="시작 건수(임계치)"
                    value={configPerUnit.threshold}
                    onChange={(e) =>
                      setConfigPerUnit((prev) => ({
                        ...prev,
                        threshold: e.target.value,
                      }))
                    }
                    placeholder="예: 100"
                  />
                  <GlassInput
                    label="단위(건)"
                    value={configPerUnit.unitSize}
                    onChange={(e) =>
                      setConfigPerUnit((prev) => ({
                        ...prev,
                        unitSize: e.target.value,
                      }))
                    }
                    placeholder="예: 10"
                  />
                  <GlassInput
                    label="단위당 금액(+원)"
                    value={configPerUnit.unitAmount}
                    onChange={(e) =>
                      setConfigPerUnit((prev) => ({
                        ...prev,
                        unitAmount: e.target.value,
                      }))
                    }
                    placeholder="예: 5000"
                  />
                </div>
              )}
            </div>
          </Section>

      <Section
        title="피크타임 선행 조건 (옵션)"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">조건 결합:</span>
                <div className="inline-flex rounded-lg border border-border bg-background/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setValue("peakMode", "AND", { shouldDirty: true })}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${peakMode === "AND"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    AND (모두 만족)
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("peakMode", "OR", { shouldDirty: true })}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${peakMode === "OR"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    OR (하나라도)
                  </button>
                </div>
              </div>
        }
      >
        <input type="hidden" {...peakModeField} value={peakMode} />
        <div className="mt-3 space-y-3">
          {peakConditions.map((cond, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,1fr,auto]"
                >
                  <GlassSelect
                    label="시간대"
                    value={cond.slot}
                    onChange={(e) =>
                      setPeakConditions((prev) =>
                        prev.map((c, i) =>
                          i === idx ? { ...c, slot: e.target.value as PeakSlot } : c
                        )
                      )
                    }
                    options={[
                      { label: "아침 피크 (Breakfast)", value: "Breakfast" },
                      { label: "점심 피크 (Lunch_Peak)", value: "Lunch_Peak" },
                      { label: "저녁 피크 (Dinner_Peak)", value: "Dinner_Peak" },
                      { label: "점심 이후 (Post_Lunch)", value: "Post_Lunch" },
                      { label: "저녁 이후 (Post_Dinner)", value: "Post_Dinner" },
                    ]}
                  />
                  <GlassInput
                    label="최소 수행 건수"
                    value={cond.minCount}
                    onChange={(e) =>
                      setPeakConditions((prev) =>
                        prev.map((c, i) =>
                          i === idx ? { ...c, minCount: e.target.value } : c
                        )
                      )
                    }
                    placeholder="예: 5"
                  />
                  <div className="flex items-end pb-0.5">
                    <GlassButton
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-11 px-3 text-[11px]"
                      onClick={() =>
                        setPeakConditions((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      삭제
                    </GlassButton>
                  </div>
                </div>
              ))}
              <GlassButton
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                onClick={() =>
                  setPeakConditions((prev) => [
                    ...prev,
                    { slot: "Lunch_Peak", minCount: "" },
                  ])
                }
              >
                + 피크타임 조건 추가
              </GlassButton>

              <div className="space-y-1.5">
                <GlassInput
                  label="필요 피크 점수 (일수)"
                  value={peakScoreThreshold}
                  onChange={(e) =>
                    setValue("peakScoreThreshold", e.target.value.replace(/[^0-9]/g, ""), {
                      shouldDirty: true,
                    })
                  }
                  placeholder="예: 4"
                />
                <p className="text-[11px] text-muted-foreground">
                  조건을 충족한 날짜마다 1점씩 적립됩니다. 입력한 점수 이상일 때만 프로모션이 적용됩니다.
                </p>
              </div>
          </div>
          </Section>

          <Section title="지사 배정">
            <div className="mt-3 space-y-4">
              <div className="space-y-2">
                <GlassInput
                  placeholder="지사명 검색..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                />
                {branchSearch && (
                  <div className="max-h-[160px] overflow-y-auto rounded-md border border-border bg-muted/30 p-2">
                    {filteredAvailableBranches.length === 0 ? (
                      <div className="py-2 text-center text-xs text-muted-foreground">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {filteredAvailableBranches.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleAddBranch(b)}
                            className="flex items-center justify-between rounded-md border border-transparent bg-background px-3 py-2 text-left text-xs shadow-sm hover:border-primary/30 hover:bg-primary/5"
                          >
                            <span className="font-medium text-foreground">
                              {b.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {b.province} {b.district}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  배정된 지사 ({selectedBranches.length})
                </div>
                {selectedBranches.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-muted/20 py-6 text-center text-xs text-muted-foreground">
                    배정된 지사가 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {selectedBranches.map((b) => (
                      <div
                        key={b.id}
                        className={`group relative flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all ${b.active
                          ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{b.name}</span>
                          <span className="text-[10px] opacity-70">
                            {b.active ? "적용 중" : "미적용"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="w-28">
                            <Switch
                              label="적용 여부"
                              checked={b.active}
                              onChange={(v) =>
                                setSelectedBranches((prev) =>
                                  prev.map((x) =>
                                    x.id === b.id ? { ...x, active: v } : x
                                  )
                                )
                              }
                              onLabel="ON"
                              offLabel="OFF"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveBranch(b.id)}
                            className="rounded bg-white/50 p-2 hover:bg-white hover:text-red-600"
                            title="배정 해제"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </form>
  );
}
