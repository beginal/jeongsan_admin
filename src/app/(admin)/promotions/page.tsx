"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { Button } from "@/components/ui/Button";

type PromotionStatus = "active" | "scheduled" | "ended";
type PromotionType = "excess" | "milestone" | "milestone_per_unit" | "";

type BranchAssignmentRow = {
  branchId: string;
  name: string;
  active: boolean;
};

type PromotionRow = {
  id: string;
  name: string;
  type: PromotionType;
  status: PromotionStatus;
  branches: BranchAssignmentRow[];
};

type SortKey = "default" | "name" | "type" | "branches";

export default function PromotionsPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | PromotionStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | Exclude<PromotionType, "">>("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPromotions() {
      try {
        const res = await fetch("/api/promotions");
        if (!res.ok) {
          throw new Error("프로모션 목록을 불러오지 못했습니다.");
        }
        const data = (await res.json()) as { promotions?: any[] };
        if (cancelled) return;
        if (Array.isArray(data.promotions)) {
          setPromotions(
            data.promotions.map((p) => ({
              id: String(p.id),
              name: (p.name as string) || "",
              type: (p.type as PromotionType) || "",
              status:
                p.status === "scheduled" || p.status === "ended"
                  ? (p.status as PromotionStatus)
                  : "active",
              branches: Array.isArray(p.branches)
                ? p.branches.map((b: any) => ({
                  branchId: String(b.branchId || b.branch_id || ""),
                  name: (b.name as string) || "",
                  active: !!b.active,
                }))
                : [],
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "프로모션 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPromotions();
    return () => {
      cancelled = true;
    };
  }, []);

  const typeLabel = (type: string) => {
    if (type === "excess") return "건수 초과 보상";
    if (type === "milestone") return "목표 달성 보상";
    if (type === "milestone_per_unit") return "단위당 보상";
    return type || "-";
  };

  const filteredPromotions = useMemo(() => {
    let list = promotions.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && p.type && p.type !== typeFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const branchLabel = p.branches.map((b) => b.name).join(", ");
        const target = `${p.name} ${typeLabel(p.type)} ${branchLabel}`.toLowerCase();
        if (!target.includes(q)) return false;
      }
      return true;
    });

    if (sortKey === "name") {
      list = [...list].sort((a, b) =>
        a.name.localeCompare(b.name, "ko")
      );
    } else if (sortKey === "type") {
      list = [...list].sort((a, b) =>
        typeLabel(a.type).localeCompare(typeLabel(b.type), "ko")
      );
    } else if (sortKey === "branches") {
      list = [...list].sort(
        (a, b) => b.branches.length - a.branches.length
      );
    }

    return list;
  }, [promotions, statusFilter, typeFilter, sortKey, search]);

  const handleDelete = (promotionId: string) => {
    const confirmDelete = window.confirm("정말 이 프로모션을 삭제하시겠습니까?");
    if (!confirmDelete) return;
    setPromotions((prev) => prev.filter((p) => p.id !== promotionId));
  };

  const statusLabel = (status: PromotionStatus) => {
    if (status === "active") return "진행 중";
    if (status === "scheduled") return "예정";
    return "종료";
  };

  const statusClass = (status: PromotionStatus) => {
    if (status === "active") {
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
    if (status === "scheduled") {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">%</span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">프로모션 관리 / Promotions</div>
            <h1 className="text-lg font-semibold text-foreground">프로모션 관리</h1>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <Button variant="primary" size="sm" onClick={() => router.push("/promotions/new")}>
            + 새 프로모션 추가
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              전체 프로모션{" "}
              <span className="ml-1 text-foreground">
                {filteredPromotions.length}개
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full max-w-[220px]">
              <input
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="프로모션명, 배정 지사 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                🔍
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <div className="hidden rounded-full border border-border bg-background/60 p-0.5 sm:flex">
                <GlassButton
                  type="button"
                  variant={typeFilter === "all" ? "primary" : "ghost"}
                  size="sm"
                  className={`h-6 rounded-full px-2.5 text-[11px] ${typeFilter !== "all" ? "hover:bg-transparent" : ""}`}
                  onClick={() => setTypeFilter("all")}
                >
                  전체 유형
                </GlassButton>
                <GlassButton
                  type="button"
                  variant={typeFilter === "excess" ? "primary" : "ghost"}
                  size="sm"
                  className={`h-6 rounded-full px-2.5 text-[11px] ${typeFilter !== "excess" ? "hover:bg-transparent" : ""}`}
                  onClick={() => setTypeFilter("excess")}
                >
                  건수 초과
                </GlassButton>
                <GlassButton
                  type="button"
                  variant={typeFilter === "milestone" ? "primary" : "ghost"}
                  size="sm"
                  className={`h-6 rounded-full px-2.5 text-[11px] ${typeFilter !== "milestone" ? "hover:bg-transparent" : ""}`}
                  onClick={() => setTypeFilter("milestone")}
                >
                  목표 달성
                </GlassButton>
                <GlassButton
                  type="button"
                  variant={typeFilter === "milestone_per_unit" ? "primary" : "ghost"}
                  size="sm"
                  className={`h-6 rounded-full px-2.5 text-[11px] ${typeFilter !== "milestone_per_unit" ? "hover:bg-transparent" : ""}`}
                  onClick={() => setTypeFilter("milestone_per_unit")}
                >
                  단위당 보상
                </GlassButton>
              </div>

              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | PromotionStatus)
                }
              >
                <option value="all">전체 상태</option>
                <option value="active">진행 중</option>
                <option value="scheduled">예정</option>
                <option value="ended">종료</option>
              </select>

              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                value={sortKey}
                onChange={(e) =>
                  setSortKey(e.target.value as SortKey)
                }
              >
                <option value="default">기본 정렬</option>
                <option value="name">프로모션명 (가나다순)</option>
                <option value="type">유형</option>
                <option value="branches">배정 지사 수 (많은 순)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground">
          프로모션 목록
        </div>
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-[11px] uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2">프로모션명</th>
                <th className="px-4 py-2">유형</th>
                <th className="px-4 py-2">상태</th>
                <th className="px-4 py-2">배정 지사</th>
                <th className="px-4 py-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-xs text-muted-foreground"
                  >
                    프로모션 목록을 불러오는 중입니다...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-xs text-muted-foreground"
                  >
                    {error}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filteredPromotions.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-xs text-muted-foreground"
                    >
                      조건에 맞는 프로모션이 없습니다.
                    </td>
                  </tr>
                )}
              {!loading &&
                !error &&
                filteredPromotions.map((promotion) => (
                  <tr
                    key={promotion.id}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() =>
                      router.push(`/promotions/${promotion.id}/edit`)
                    }
                  >
                    <td className="px-4 py-3 align-middle text-sm text-foreground">
                      {promotion.name}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-muted-foreground">
                      {typeLabel(promotion.type)}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass(
                          promotion.status
                        )}`}
                      >
                        {statusLabel(promotion.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-muted-foreground">
                      {promotion.branches.length === 0 ? (
                        "-"
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {promotion.branches.map((b) => (
                            <GlassButton
                              key={b.branchId + b.name}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/branches/${b.branchId}`);
                              }}
                              className={`h-5 rounded-full px-2 text-[10px] ${b.active
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-600"
                                }`}
                            >
                              {b.name}
                            </GlassButton>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-xs">
                      <div
                        className="inline-flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(`/promotions/${promotion.id}/edit`)}
                        >
                          수정
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(promotion.id)}>
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
