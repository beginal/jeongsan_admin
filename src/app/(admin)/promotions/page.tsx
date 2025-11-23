"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Percent } from "lucide-react";
import { fetchJson } from "@/lib/api";

type PromotionStatus = "active" | "scheduled" | "ended";
type PromotionType = "excess" | "milestone" | "milestone_per_unit" | "";
type SortKey = "default" | "name" | "type" | "branches";

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

export default function PromotionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | PromotionStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | Exclude<PromotionType, "">>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  const { data, isLoading, isFetching, error } = useQuery<{ promotions?: any[] }, Error>({
    queryKey: ["promotions"],
    queryFn: () => fetchJson("/api/promotions"),
    staleTime: 30_000,
    retry: 1,
  });

  const typeLabel = (type: string) => {
    if (type === "excess") return "건수 초과 보상";
    if (type === "milestone") return "목표 달성 보상";
    if (type === "milestone_per_unit") return "단위당 보상";
    return type || "-";
  };

  const promotions: PromotionRow[] = useMemo(() => {
    const list = Array.isArray(data?.promotions) ? data?.promotions : [];
    return list.map((p) => ({
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
    }));
  }, [data?.promotions]);

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
        a.name.localeCompare(b.name, "ko", { sensitivity: "base" })
      );
    } else if (sortKey === "type") {
      list = [...list].sort((a, b) =>
        typeLabel(a.type).localeCompare(typeLabel(b.type), "ko", { sensitivity: "base" })
      );
    } else if (sortKey === "branches") {
      list = [...list].sort((a, b) => b.branches.length - a.branches.length);
    }

    return list;
  }, [promotions, statusFilter, typeFilter, search, sortKey]);

  const handleDelete = useCallback(async (promotionId: string) => {
    const confirmDelete = window.confirm("정말 이 프로모션을 삭제하시겠습니까?");
    if (!confirmDelete) return;
    setActionId(promotionId);
    try {
      const res = await fetch(`/api/promotions/${encodeURIComponent(promotionId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "프로모션을 삭제하지 못했습니다.");
      }
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    } catch (e: any) {
      alert(e.message || "프로모션을 삭제하지 못했습니다.");
    } finally {
      setActionId(null);
    }
  }, [queryClient]);

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

  const columns = useMemo<ColumnDef<PromotionRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "프로모션명",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: "type",
        header: "유형",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{typeLabel(row.original.type)}</span>,
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(row.original.status)}`}>
            {statusLabel(row.original.status)}
          </span>
        ),
      },
      {
        id: "branches",
        header: "배정 지사",
        cell: ({ row }) =>
          row.original.branches.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.original.branches.slice(0, 3).map((b) => (
                <span key={b.branchId} className="inline-flex items-center rounded-full bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {b.name || "지사"}
                </span>
              ))}
              {row.original.branches.length > 3 && (
                <span className="text-[11px] text-muted-foreground">+{row.original.branches.length - 3}</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">작업</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <GlassButton
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/promotions/${encodeURIComponent(row.original.id)}`);
              }}
            >
              상세
            </GlassButton>
            <GlassButton
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              disabled={actionId === row.original.id}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.original.id);
              }}
            >
              삭제
            </GlassButton>
          </div>
        ),
      },
    ],
    [router, handleDelete, actionId]
  );

  const table = useReactTable({
    data: filteredPromotions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const isBusy = isLoading || isFetching;
  const loading = isBusy;
  const errorMessage = error?.message || null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="프로모션 목록"
        description="프로모션 목록 / Promotions"
        icon={<Percent className="h-5 w-5" />}
        actions={
          <GlassButton variant="primary" size="sm" onClick={() => router.push("/promotions/new")}>
            + 새 프로모션 추가
          </GlassButton>
        }
      />

      <Section>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              전체 프로모션{" "}
              <span className="ml-1 text-foreground">
                {filteredPromotions.length}개
              </span>
            </span>
            {isBusy && (
              <span className="text-[11px] text-primary">불러오는 중...</span>
            )}
            {errorMessage && (
              <span className="text-[11px] text-red-600">{errorMessage}</span>
            )}
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
      </Section>

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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-8 w-20" /></td>
                  </tr>
                ))
              )}
              {!loading && errorMessage && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center"
                  >
                    <EmptyState
                      title="오류 발생"
                      description={errorMessage}
                      icon={<span className="text-2xl">⚠️</span>}
                      action={
                        <GlassButton size="sm" onClick={() => window.location.reload()}>
                          다시 시도
                        </GlassButton>
                      }
                    />
                  </td>
                </tr>
              )}
              {!loading &&
                !errorMessage &&
                filteredPromotions.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12"
                    >
                      <EmptyState
                        title="프로모션이 없습니다"
                        description={search ? "검색 조건에 맞는 프로모션을 찾을 수 없습니다." : "등록된 프로모션이 없습니다. 새로운 프로모션을 등록해보세요."}
                        action={
                          !search && (
                            <GlassButton variant="primary" size="sm" onClick={() => router.push("/promotions/new")}>
                              + 새 프로모션 추가
                            </GlassButton>
                          )
                        }
                      />
                    </td>
                  </tr>
                )}
              {!loading &&
                !errorMessage &&
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
                        <GlassButton
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(`/promotions/${promotion.id}/edit`)}
                        >
                          수정
                        </GlassButton>
                        <GlassButton variant="destructive" size="sm" onClick={() => handleDelete(promotion.id)}>
                          삭제
                        </GlassButton>
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
