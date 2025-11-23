"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building2 } from "lucide-react";
import { fetchJson } from "@/lib/api";

type BranchRow = {
  id: string;
  platform: string;
  province: string;
  district: string;
  branchName: string;
  displayName: string;
  riderCount: number;
};

export default function BranchesPage() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<{ branches?: any[] }, Error>({
    queryKey: ["branches"],
    queryFn: () => fetchJson<{ branches?: any[] }>("/api/branches"),
    staleTime: 30_000,
    retry: 1,
  });

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "coupang" | "baemin">("all");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [sortKey, setSortKey] = useState<"default" | "name" | "riders">(
    "default"
  );
  const isBusy = isLoading || isFetching;
  const errorMessage = error?.message || null;

  const branches: BranchRow[] = useMemo(
    () =>
      Array.isArray(data?.branches)
        ? data.branches.map((b) => ({
            id: String(b.id),
            platform: b.platform || "",
            province: b.province || "",
            district: b.district || "",
            branchName: b.branch_name || b.display_name || String(b.id),
            displayName: b.display_name || b.branch_name || String(b.id),
            riderCount: typeof b.rider_count === "number" ? b.rider_count : 0,
          }))
        : [],
    [data?.branches]
  );

  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    branches.forEach((b) => {
      if (b.province) set.add(b.province);
    });
    return Array.from(set).sort();
  }, [branches]);

  const districtOptions = useMemo(() => {
    const set = new Set<string>();
    branches.forEach((b) => {
      if (b.district) {
        set.add(b.district);
      }
    });
    return Array.from(set).sort();
  }, [branches]);

  const filteredAndSortedBranches = useMemo(() => {
    let list = branches.filter((b) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const target =
          `${b.branchName} ${b.displayName} ${b.province} ${b.district}`.toLowerCase();
        if (!target.includes(q)) return false;
      }

      if (platformFilter === "coupang" && b.platform !== "coupang") {
        return false;
      }
      if (platformFilter === "baemin" && b.platform !== "baemin") {
        return false;
      }
      if (provinceFilter && b.province !== provinceFilter) {
        return false;
      }
      if (districtFilter && b.district !== districtFilter) {
        return false;
      }

      return true;
    });

    if (sortKey === "name") {
      list = [...list].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "ko")
      );
    } else if (sortKey === "riders") {
      list = [...list].sort((a, b) => b.riderCount - a.riderCount);
    }

    return list;
  }, [branches, search, platformFilter, provinceFilter, districtFilter, sortKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="지사 목록"
        description="지사 목록 및 상세 정보"
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "지사 목록", href: "/branches" },
        ]}
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => router.push("/branches/new")}
          >
            + 새 지사 추가
          </GlassButton>
        }
      />

      {/* Filters */}
      <Section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Summary */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              전체 {filteredAndSortedBranches.length}개
            </span>
            <span>·</span>
            <span className="text-xs">
              총 라이더 {filteredAndSortedBranches.reduce((sum, b) => sum + b.riderCount, 0).toLocaleString()}명
            </span>
            {isBusy && (
              <>
                <span>·</span>
                <span className="text-xs text-primary">새로고침 중...</span>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Platform Filter */}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setPlatformFilter("all")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${platformFilter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter("coupang")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${platformFilter === "coupang"
                  ? "bg-background text-blue-600 shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  }`}
              >
                쿠팡
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter("baemin")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${platformFilter === "baemin"
                  ? "bg-background text-teal-600 shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  }`}
              >
                배민
              </button>
            </div>

            <div className="h-4 w-px bg-border mx-1" />

            <div className="relative">
              <input
                className="h-9 w-[180px] rounded-xl border border-border bg-background/50 pl-9 pr-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="검색어 입력..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                🔍
              </span>
            </div>

            <select
              className="h-9 rounded-xl border border-border bg-background/50 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={provinceFilter}
              onChange={(e) => {
                setProvinceFilter(e.target.value);
                setDistrictFilter("");
              }}
            >
              <option value="">전체 시/도</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-xl border border-border bg-background/50 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
            >
              <option value="">전체 구/시/군</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-xl border border-border bg-background/50 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={sortKey}
              onChange={(e) =>
                setSortKey(e.target.value as "default" | "name" | "riders")
              }
            >
              <option value="default">기본 정렬</option>
              <option value="name">이름순</option>
              <option value="riders">라이더순</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Table Section */}
      <Section className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">플랫폼</th>
                <th className="px-6 py-3 font-medium">지역</th>
                <th className="px-6 py-3 font-medium">지사명</th>
                <th className="px-6 py-3 font-medium">최종 지사명</th>
                <th className="px-6 py-3 font-medium text-right">라이더 수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="ml-auto h-5 w-12" /></td>
                  </tr>
                ))
              )}

              {!isLoading && errorMessage && (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      title="오류 발생"
                      description={errorMessage}
                      icon={<span className="text-2xl">⚠️</span>}
                      action={
                        <GlassButton size="sm" onClick={() => refetch()}>
                          다시 시도
                        </GlassButton>
                      }
                    />
                  </td>
                </tr>
              )}

              {!isLoading && !errorMessage && filteredAndSortedBranches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      title="지사가 없습니다"
                      description={search ? "검색 조건에 맞는 지사를 찾을 수 없습니다." : "등록된 지사가 없습니다."}
                      action={
                        !search && (
                          <GlassButton variant="primary" size="sm" onClick={() => router.push("/branches/new")}>
                            + 새 지사 추가
                          </GlassButton>
                        )
                      }
                    />
                  </td>
                </tr>
              )}

              {!isLoading && !errorMessage && filteredAndSortedBranches.map((branch) => (
                <tr
                  key={branch.id}
                  className="group cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/branches/${branch.id}`)}
                >
                  <td className="px-6 py-4 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${branch.platform === "coupang"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : branch.platform === "baemin"
                          ? "border-teal-200 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                    >
                      {branch.platform === "coupang"
                        ? "쿠팡"
                        : branch.platform === "baemin"
                          ? "배민"
                          : branch.platform || "기타"}
                    </span>
                  </td>
                  <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-1.5">
                      {branch.province ? (
                        <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                          {branch.province}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                      {branch.district && (
                        <span className="text-muted-foreground">/ {branch.district}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-middle font-medium text-foreground">
                    {branch.branchName}
                  </td>
                  <td className="px-6 py-4 align-middle text-muted-foreground">
                    {branch.displayName}
                  </td>
                  <td className="px-6 py-4 align-middle text-right font-medium text-foreground">
                    {branch.riderCount.toLocaleString()}명
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
