"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassInput } from "@/components/ui/glass/GlassInput";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";
import { BriefcaseBusiness } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
      <PageHeader
        title="사업자 목록"
        description="법인 및 개인 사업자 목록을 조회하고 조직 구조를 확인합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "사업자 목록", href: "#" },
        ]}
        icon={<BriefcaseBusiness className="h-5 w-5" />}
        actions={
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => router.push("/business-entities/new")}
          >
            + 새 사업자 추가
          </GlassButton>
        }
      />

      <Section className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium">
              전체 <span className="text-foreground">{entities.length}곳</span>
            </span>
            <span>·</span>
            <span>
              총 지사 <span className="text-foreground">{entities.reduce((sum, e) => sum + e.branchCount, 0).toLocaleString()}곳</span>
            </span>
            <span>·</span>
            <span>
              총 라이더 <span className="text-foreground">{entities.reduce((sum, e) => sum + e.riderCount, 0).toLocaleString()}명</span>
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-[240px]">
              <GlassInput
                placeholder="사업자명 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={
                  <span className="text-muted-foreground">🔍</span>
                }
              />
            </div>
            <div className="flex items-center rounded-lg border border-border bg-muted/20 p-1">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${typeFilter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("CORPORATE")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${typeFilter === "CORPORATE"
                  ? "bg-background text-sky-600 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                법인
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("PERSONAL")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${typeFilter === "PERSONAL"
                  ? "bg-background text-emerald-600 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                개인
              </button>
            </div>
          </div>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 조직 트리 */}
        <div className="lg:col-span-1">
          <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              조직 트리
            </h2>
            <div className="max-h-[500px] flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="ml-auto h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : treeRoots.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  등록된 사업자가 없습니다.
                </p>
              ) : (
                treeRoots.map((node) => <TreeNodeView key={node.id} node={node} />)
              )}
            </div>
          </div>
        </div>

        {/* 사업자 목록 */}
        <div className="lg:col-span-2 space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">사업자 목록</div>
          <div className="max-h-[500px] overflow-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">사업자명</th>
                  <th className="px-4 py-3 font-medium">등록번호</th>
                  <th className="px-4 py-3 text-right font-medium">지사 수</th>
                  <th className="px-4 py-3 text-right font-medium">라이더 수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`entity-skel-${idx}`} className="animate-pulse">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="ml-auto h-4 w-12" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="ml-auto h-4 w-12" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredEntities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      조건에 맞는 사업자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredEntities.map((e) => (
                    <tr
                      key={e.id}
                      className="group cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() =>
                        router.push(`/business-entities/${encodeURIComponent(e.id)}`)
                      }
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${e.type === "CORPORATE"
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                        >
                          {e.type === "CORPORATE" ? "법인" : "개인"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{e.name || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.businessNumber || "-"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {e.branchCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {e.riderCount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
