"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";

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

export function PromotionEditForm({ promotionId }: PromotionEditFormProps) {
  const router = useRouter();
  const isCreate = !promotionId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<PromotionType>("excess");
  const [status, setStatus] = useState<PromotionStatusDb>("ACTIVE");
  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [peakMode, setPeakMode] = useState<PeakMode>("AND");
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

        setName(p.name || "");
        setType(
          p.type === "milestone_per_unit" ||
            p.type === "milestone" ||
            p.type === "excess"
            ? (p.type as PromotionType)
            : "excess"
        );
        setStatus(
          p.status === "INACTIVE" ? "INACTIVE" : ("ACTIVE" as PromotionStatusDb)
        );
        if (typeof p.description === "string" && p.description) {
          setDescription(p.description);
        } else if (typeof cfg.description === "string" && cfg.description) {
          setDescription(cfg.description);
        } else {
          setDescription("");
        }

        // 기간 설정 (테이블 컬럼 우선, 레거시 config 값은 보조)
        if (typeof p.start_date === "string" && p.start_date) {
          setStartDate(p.start_date.slice(0, 10));
        } else if (typeof cfg.startDate === "string" && cfg.startDate) {
          setStartDate(cfg.startDate.slice(0, 10));
        } else {
          setStartDate("");
        }
        if (typeof p.end_date === "string" && p.end_date) {
          setEndDate(p.end_date.slice(0, 10));
        } else if (typeof cfg.endDate === "string" && cfg.endDate) {
          setEndDate(cfg.endDate.slice(0, 10));
        } else {
          setEndDate("");
        }

        // 피크타임 선행 조건
        const peak = cfg.peakPrecondition as
          | { mode?: string; conditions?: any[] }
          | undefined;
        if (peak && Array.isArray(peak.conditions)) {
          const modeRaw = String(peak.mode || "").toUpperCase();
          setPeakMode(modeRaw === "OR" ? "OR" : "AND");
          setPeakConditions(
            peak.conditions.map((c: any) => ({
              slot: (c.slot as PeakSlot) || "Breakfast",
              minCount:
                c.minCount != null ? String(c.minCount ?? "") : "",
            }))
          );
        } else {
          setPeakMode("AND");
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
  }, [promotionId, isCreate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("프로모션명을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let baseConfig: any;
      if (type === "excess") {
        const amt = Number(configExcess.amountPerExcess || 0);
        baseConfig = {
          threshold: Number(configExcess.threshold || 0),
          amountPerExcess: amt,
          amount: amt,
        };
        if (configExcess.cap) {
          baseConfig.cap = Number(configExcess.cap);
        }
      } else if (type === "milestone") {
        baseConfig = {
          milestones: configMilestone.tiers.map((t) => ({
            threshold: Number(t.threshold || 0),
            amount: Number(t.amount || 0),
          })),
        };
      } else {
        baseConfig = {
          milestonePerUnit: [
            {
              threshold: Number(configPerUnit.threshold || 0),
              unitSize: Number(configPerUnit.unitSize || 0),
              unitAmount: Number(configPerUnit.unitAmount || 0),
            },
          ],
        };
      }

      if (description && description.trim()) {
        baseConfig.description = description.trim();
      }

      const normalizedPeakConds = peakConditions
        .filter((c) => c.slot && c.minCount.trim() !== "")
        .map((c) => ({
          slot: c.slot,
          minCount: Number(c.minCount || 0),
        }));

      if (normalizedPeakConds.length > 0) {
        baseConfig.peakPrecondition = {
          mode: peakMode,
          conditions: normalizedPeakConds,
        };
      }

      if (isCreate) {
        const res = await fetch("/api/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            type,
            status,
            config: baseConfig,
            start_date: startDate || null,
            end_date: endDate || null,
            assignments: selectedBranches.map((b) => ({
              branch_id: b.id,
              is_active: b.active,
              start_date: null,
              end_date: null,
              priority_order: null,
            })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "프로모션을 생성하지 못했습니다.");
        }
      } else {
        const patchRes = await fetch(
          `/api/promotions/${encodeURIComponent(promotionId!)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              type,
              status,
              config: baseConfig,
              start_date: startDate || null,
              end_date: endDate || null,
            }),
          }
        );
        const patchData = await patchRes.json().catch(() => ({}));
        if (!patchRes.ok || patchData?.error) {
          throw new Error(
            patchData?.error || "프로모션 정보를 저장하지 못했습니다."
          );
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
            `/api/promotions/${encodeURIComponent(
              promotionId!
            )}/assignments`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(upserts),
            }
          );
          const assignData = await assignRes.json().catch(() => ({}));
          if (!assignRes.ok || assignData?.error) {
            throw new Error(
              assignData?.error || "프로모션 지사 배정을 저장하지 못했습니다."
            );
          }
        }

        const removed = initialAssignedIds.filter(
          (id) => !selectedBranches.some((b) => b.id === id)
        );
        if (removed.length > 0) {
          const delRes = await fetch(
            `/api/promotions/${encodeURIComponent(
              promotionId!
            )}/assignments`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ branch_ids: removed }),
            }
          );
          const delData = await delRes.json().catch(() => ({}));
          if (!delRes.ok || delData?.error) {
            throw new Error(
              delData?.error || "프로모션 지사 배정을 삭제하지 못했습니다."
            );
          }
        }
      }

      router.push("/promotions");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "프로모션 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 text-xs">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
              {isCreate ? "프로모션 생성" : "프로모션 수정"}
            </span>
            <span className="text-muted-foreground text-xs">{name || "제목 없음"}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isCreate && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              disabled={saving || deleting}
              isLoading={deleting}
            >
              삭제
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push("/promotions")}
            disabled={saving || deleting}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving || deleting} isLoading={saving}>
            저장
          </Button>
        </div>
      </div>

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
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              기본 정보
            </h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  프로모션명
                </label>
                <input
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 7월 피크 보너스"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    유형
                  </label>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as PromotionType)
                    }
                  >
                    <option value="excess">건수 초과 보상</option>
                    <option value="milestone">목표 달성 보상</option>
                    <option value="milestone_per_unit">단위당 보상</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    활성 상태
                  </label>
                  <div className="mt-1 inline-flex rounded-full border border-border bg-background/60 p-0.5 text-[11px] text-muted-foreground">
                    <GlassButton
                      type="button"
                      variant={status === "ACTIVE" ? "primary" : "ghost"}
                      size="sm"
                      className={`h-6 rounded-full px-2.5 text-[11px] ${status !== "ACTIVE" ? "hover:bg-transparent" : ""}`}
                      onClick={() => setStatus("ACTIVE")}
                    >
                      활성
                    </GlassButton>
                    <GlassButton
                      type="button"
                      variant={status === "INACTIVE" ? "primary" : "ghost"}
                      size="sm"
                      className={`h-6 rounded-full px-2.5 text-[11px] ${status !== "INACTIVE" ? "hover:bg-transparent" : ""}`}
                      onClick={() => setStatus("INACTIVE")}
                    >
                      비활성
                    </GlassButton>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label="시작일"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
                <DateField
                  label="종료일"
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="YYYY-MM-DD"
                  min={startDate || undefined}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  프로모션 설명
                </label>
                <textarea
                  className="min-h-[72px] w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="프로모션 설명 (선택 사항)"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              프로모션 설정
            </h2>
            <div className="mt-3 space-y-3">
              {type === "excess" && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      임계치(건수)
                    </label>
                    <input
                      className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={configExcess.threshold}
                      onChange={(e) =>
                        setConfigExcess((prev) => ({
                          ...prev,
                          threshold: e.target.value,
                        }))
                      }
                      placeholder="예: 100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      초과 1건당 금액(+원)
                    </label>
                    <input
                      className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={configExcess.amountPerExcess}
                      onChange={(e) =>
                        setConfigExcess((prev) => ({
                          ...prev,
                          amountPerExcess: e.target.value,
                        }))
                      }
                      placeholder="예: 1000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      상한(옵션)
                    </label>
                    <input
                      className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                </div>
              )}
              {type === "milestone" && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    마일스톤 구간
                  </span>
                  {configMilestone.tiers.map((t, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,1fr,auto]"
                    >
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          도달 건수
                        </label>
                        <input
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          지급 금액(+원)
                        </label>
                        <input
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                      </div>
                      <div className="flex items-end">
                        <GlassButton
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-8 px-3 text-[11px]"
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      시작 임계치
                    </label>
                    <input
                      className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={configPerUnit.threshold}
                      onChange={(e) =>
                        setConfigPerUnit((prev) => ({
                          ...prev,
                          threshold: e.target.value,
                        }))
                      }
                      placeholder="예: 100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      단위 크기
                    </label>
                    <input
                      className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={configPerUnit.unitSize}
                      onChange={(e) =>
                        setConfigPerUnit((prev) => ({
                          ...prev,
                          unitSize: e.target.value,
                        }))
                      }
                      placeholder="예: 10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      단위 금액(+원)
                    </label>
                    <input
                      className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={configPerUnit.unitAmount}
                      onChange={(e) =>
                        setConfigPerUnit((prev) => ({
                          ...prev,
                          unitAmount: e.target.value,
                        }))
                      }
                      placeholder="예: 100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              피크타임 선행 조건
            </h2>
            <div className="mt-3 space-y-3 text-xs">
              <p className="text-[11px] text-muted-foreground">
                선택된 피크타임 구간에서 최소 건수를 충족했을 때만 프로모션이
                적용되도록 설정합니다.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  조건 결합 방식
                </label>
                <div className="mt-1 inline-flex rounded-full border border-border bg-background/60 p-0.5 text-[11px] text-muted-foreground">
                  <GlassButton
                    type="button"
                    variant={peakMode === "AND" ? "primary" : "ghost"}
                    size="sm"
                    className={`h-6 rounded-full px-2.5 text-[11px] ${peakMode !== "AND" ? "hover:bg-transparent" : ""}`}
                    onClick={() => setPeakMode("AND")}
                  >
                    AND (모든 조건 충족)
                  </GlassButton>
                  <GlassButton
                    type="button"
                    variant={peakMode === "OR" ? "primary" : "ghost"}
                    size="sm"
                    className={`h-6 rounded-full px-2.5 text-[11px] ${peakMode !== "OR" ? "hover:bg-transparent" : ""}`}
                    onClick={() => setPeakMode("OR")}
                  >
                    OR (하나라도 충족)
                  </GlassButton>
                </div>
              </div>

              <div className="space-y-2">
                {peakConditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto] items-end gap-2"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        피크타임
                      </label>
                      <select
                        className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={cond.slot}
                        onChange={(e) =>
                          setPeakConditions((prev) =>
                            prev.map((c, i) =>
                              i === idx
                                ? {
                                  ...c,
                                  slot: e.target.value as PeakSlot,
                                }
                                : c
                            )
                          )
                        }
                      >
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch_Peak">Lunch_Peak</option>
                        <option value="Dinner_Peak">Dinner_Peak</option>
                        <option value="Post_Lunch">Post_Lunch</option>
                        <option value="Post_Dinner">Post_Dinner</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        최소 건수
                      </label>
                      <input
                        className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={cond.minCount}
                        onChange={(e) =>
                          setPeakConditions((prev) =>
                            prev.map((c, i) =>
                              i === idx
                                ? { ...c, minCount: e.target.value }
                                : c
                            )
                          )
                        }
                        placeholder="예: 10"
                      />
                    </div>
                    <div className="flex items-end">
                      <GlassButton
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 px-3 text-[11px]"
                        onClick={() =>
                          setPeakConditions((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
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
                      { slot: "Breakfast", minCount: "" },
                    ])
                  }
                >
                  조건 추가
                </GlassButton>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              지사 배정
            </h2>
            <div className="mt-3 space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  지사 검색
                </label>
                <div className="relative">
                  <input
                    className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="지사명, 지역 검색"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                  />
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                    🔍
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      지사 목록
                    </span>
                  </div>
                  <div className="mt-1 max-h-64 overflow-auto rounded-md border border-border bg-muted/40">
                    {filteredAvailableBranches.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                        조건에 맞는 지사가 없습니다.
                      </div>
                    ) : (
                      filteredAvailableBranches.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between border-b border-border/40 px-3 py-2 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium text-foreground">
                              {b.name}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {[b.province, b.district]
                                .filter(Boolean)
                                .join(" ")}
                            </div>
                            {(b.corporateName || b.personalName) && (
                              <div className="truncate text-[11px] text-muted-foreground">
                                {b.corporateName && b.personalName
                                  ? `${b.corporateName} > ${b.personalName}`
                                  : b.corporateName || b.personalName}
                              </div>
                            )}
                          </div>
                          <GlassButton
                            type="button"
                            variant="primary"
                            size="sm"
                            className="ml-2 h-7 px-2 text-[11px]"
                            onClick={() => handleAddBranch(b)}
                          >
                            추가
                          </GlassButton>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      선택된 지사
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedBranches.length}개
                    </span>
                  </div>
                  <div className="mt-1 max-h-64 overflow-auto rounded-md border border-border bg-muted/40">
                    {selectedBranches.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                        선택된 지사가 없습니다.
                      </div>
                    ) : (
                      selectedBranches.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between border-b border-border/40 px-3 py-2 last:border-b-0"
                        >
                          <GlassButton
                            type="button"
                            variant="ghost"
                            className="h-auto justify-start p-0 text-xs font-medium text-foreground hover:bg-transparent hover:underline"
                            onClick={() => router.push(`/branches/${s.id}`)}
                          >
                            {s.name}
                          </GlassButton>
                          <div className="flex items-center gap-2">
                            <GlassButton
                              type="button"
                              variant="outline"
                              size="sm"
                              className={`h-7 px-2 text-[11px] ${s.active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-600"
                                }`}
                              onClick={() =>
                                setSelectedBranches((prev) =>
                                  prev.map((x) =>
                                    x.id === s.id
                                      ? { ...x, active: !x.active }
                                      : x
                                  )
                                )
                              }
                            >
                              {s.active ? "●" : "○"}
                            </GlassButton>
                            <GlassButton
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => handleRemoveBranch(s.id)}
                            >
                              제거
                            </GlassButton>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </form>
  );
}
