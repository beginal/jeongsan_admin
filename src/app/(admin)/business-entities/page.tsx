"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BusinessEntityType = "CORPORATE" | "PERSONAL";

type BusinessEntityRow = {
  id: string;
  name: string;
  type: BusinessEntityType;
  businessNumber: string;
  parentEntityId: string | null;
  riderCount: number;
  branchCount: number;
};

type TreeNode = {
  id: string;
  name: string;
  type: BusinessEntityType;
  riderCount: number;
  branchCount: number;
  children: TreeNode[];
};

function formatBusinessRegNo(raw?: string | null) {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length !== 10) return digits || "";
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export default function BusinessEntitiesPage() {
  const router = useRouter();
  const [entities, setEntities] = useState<BusinessEntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | BusinessEntityType>("all");

  useEffect(() => {
    let cancelled = false;

    async function loadEntities() {
      try {
        setError(null);
        setLoading(true);
        const res = await fetch("/api/business-entities");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data?.error || "사업자 목록을 불러오지 못했습니다."
          );
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        const list = Array.isArray(data.entities) ? data.entities : [];
        setEntities(
          list.map((e: any) => ({
            id: String(e.id),
            name: e.name || "",
            type: (e.type as BusinessEntityType) || "CORPORATE",
            businessNumber: formatBusinessRegNo(e.registration_number_enc),
            parentEntityId: e.parent_entity_id
              ? String(e.parent_entity_id)
              : null,
            riderCount:
              typeof e.rider_count === "number" ? e.rider_count : 0,
            branchCount:
              typeof e.branch_count === "number" ? e.branch_count : 0,
          }))
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "사업자 목록을 불러오지 못했습니다.");
          setEntities([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEntities();
    return () => {
      cancelled = true;
    };
  }, []);

  const treeRoots = useMemo<TreeNode[]>(() => {
    const byId = new Map<string, TreeNode>();
    entities.forEach((e) => {
      byId.set(e.id, {
        id: e.id,
        name: e.name,
        type: e.type,
        riderCount: e.riderCount,
        branchCount: e.branchCount,
        children: [],
      });
    });

    const roots: TreeNode[] = [];
    entities.forEach((e) => {
      const node = byId.get(e.id)!;
      if (e.parentEntityId && byId.has(e.parentEntityId)) {
        byId.get(e.parentEntityId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name, "ko"));
      nodes.forEach((n) => sortTree(n.children));
    };
    sortTree(roots);

    return roots;
  }, [entities]);

  const filteredEntities = useMemo(() => {
    let list = entities;

    if (typeFilter !== "all") {
      list = list.filter((e) => e.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }

    return list;
  }, [entities, search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">사</span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              사업자 관리 / Business Entities
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              사업자 관리
            </h1>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
            onClick={() => router.push("/business-entities/new")}
          >
            + 새 사업자 추가
          </button>
        </div>
      </div>

      {/* Filters card - dashbrd style */}
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        <div className="space-y-3">
          {/* Summary row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              전체 사업자{" "}
              <span className="ml-1 text-foreground">
                {entities.length}곳
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground">
              총 지사{" "}
              {entities
                .reduce((sum, e) => sum + e.branchCount, 0)
                .toLocaleString()}
              곳
            </span>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground">
              총 라이더{" "}
              {entities
                .reduce((sum, e) => sum + e.riderCount, 0)
                .toLocaleString()}
              명
            </span>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full max-w-[220px]">
              <input
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="사업자명 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                🔍
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <div className="rounded-full border border-border bg-background/60 p-0.5 text-[11px] text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${
                    typeFilter === "all"
                      ? "bg-card text-foreground shadow-sm"
                      : ""
                  }`}
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("CORPORATE")}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${
                    typeFilter === "CORPORATE"
                      ? "bg-sky-500 text-white shadow-sm"
                      : ""
                  }`}
                >
                  법인
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("PERSONAL")}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${
                    typeFilter === "PERSONAL"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : ""
                  }`}
                >
                  개인
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 조직 트리 */}
      <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          조직 트리
        </h2>
        <div className="mt-3 max-h-[520px] overflow-y-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
          {treeRoots.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              등록된 사업자가 없습니다.
            </p>
          )}
          {treeRoots.map((node) => (
            <TreeNodeView key={node.id} node={node} />
          ))}
        </div>
      </div>

      {/* 사업자 목록 */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground">
          사업자 목록
        </div>
        <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">유형</th>
                <th className="px-4 py-2">사업자명</th>
                <th className="px-4 py-2">등록번호</th>
                <th className="px-4 py-2 text-right">지사 수</th>
                <th className="px-4 py-2 text-right">라이더 수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card text-xs">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[11px] text-muted-foreground"
                  >
                    사업자 목록을 불러오는 중입니다...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[11px] text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filteredEntities.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-[11px] text-muted-foreground"
                    >
                      조건에 맞는 사업자가 없습니다.
                    </td>
                  </tr>
                )}
              {!loading &&
                !error &&
                filteredEntities.map((e) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() =>
                      router.push(
                        `/business-entities/${encodeURIComponent(
                          e.id
                        )}`
                      )
                    }
                  >
                    <td className="px-4 py-3 align-middle text-xs">
                        <span
                          className={
                            e.type === "CORPORATE"
                              ? "inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
                              : "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                          }
                        >
                          {e.type === "CORPORATE" ? "법인" : "개인"}
                        </span>
                      </td>
                    <td className="px-4 py-3 align-middle text-xs text-foreground">
                      {e.name || "-"}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-muted-foreground">
                      {e.businessNumber || "-"}
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-xs text-muted-foreground">
                      {e.branchCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-xs text-muted-foreground">
                      {e.riderCount.toLocaleString()}
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

function TreeNodeView({ node }: { node: TreeNode }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2">
        <span
          className={
            node.type === "CORPORATE"
              ? "inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
              : "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
          }
        >
          {node.type === "CORPORATE" ? "법인" : "개인"}
        </span>
        <span className="truncate text-xs font-medium text-foreground">
          {node.name}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          지사 {node.branchCount.toLocaleString()} · 라이더{" "}
          {node.riderCount.toLocaleString()}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className="ml-4 mt-0.5 border-l border-border/50 pl-3">
          {node.children.map((child) => (
            <TreeNodeView key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
