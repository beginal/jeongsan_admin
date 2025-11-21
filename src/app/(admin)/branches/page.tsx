"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";

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
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "coupang" | "baemin">("all");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [sortKey, setSortKey] = useState<"default" | "name" | "riders">(
    "default"
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      try {
        const res = await fetch("/api/branches");
        if (!res.ok) {
          throw new Error("지사 목록을 불러오지 못했습니다.");
        }
        const data = (await res.json()) as { branches?: any[] };
        if (cancelled) return;
        if (Array.isArray(data.branches)) {
          setBranches(
            data.branches.map((b) => ({
              id: String(b.id),
              platform: b.platform || "",
              province: b.province || "",
              district: b.district || "",
              branchName: b.branch_name || b.display_name || String(b.id),
              displayName: b.display_name || b.branch_name || String(b.id),
              riderCount:
                typeof b.rider_count === "number" ? b.rider_count : 0,
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "지사 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBranches();
    return () => {
      cancelled = true;
    };
  }, []);

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
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">지사</span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              지사 관리 / Branches
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              지사 관리
            </h1>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <GlassButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => router.push("/branches/new")}
          >
            + 새 지사 추가
          </GlassButton>
        </div>
      </div>

      {/* Filters card - dashbrd style */}
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        <div className="space-y-3">
          {/* Summary row (full width) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              전체 지사{" "}
              <span className="ml-1 text-foreground">
                {filteredAndSortedBranches.length}개
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground">
              총 라이더{" "}
              {filteredAndSortedBranches
                .reduce((sum, b) => sum + b.riderCount, 0)
                .toLocaleString()}
              명
            </span>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Search */}
            <div className="relative w-full max-w-[200px]">
              <input
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="지사명, 지역 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                🔍
              </span>
            </div>

            {/* Platform filter pills */}
            <div className="hidden rounded-full border border-border bg-background/60 p-0.5 text-[11px] text-muted-foreground sm:flex">
              <GlassButton
                type="button"
                variant={platformFilter === "all" ? "primary" : "ghost"}
                size="sm"
                className={`h-6 rounded-full px-2.5 text-[11px] ${platformFilter !== "all" ? "hover:bg-transparent" : ""}`}
                onClick={() => setPlatformFilter("all")}
              >
                전체
              </GlassButton>
              <GlassButton
                type="button"
                variant={platformFilter === "coupang" ? "primary" : "ghost"}
                size="sm"
                className={`h-6 rounded-full px-2.5 text-[11px] ${platformFilter !== "coupang" ? "hover:bg-transparent" : ""}`}
                onClick={() => setPlatformFilter("coupang")}
              >
                쿠팡
              </GlassButton>
              <GlassButton
                type="button"
                variant={platformFilter === "baemin" ? "primary" : "ghost"}
                size="sm"
                className={`h-6 rounded-full px-2.5 text-[11px] ${platformFilter !== "baemin" ? "hover:bg-transparent" : ""}`}
                onClick={() => setPlatformFilter("baemin")}
              >
                배민
              </GlassButton>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Province / District selects */}
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
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
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
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

              {/* Sort select */}
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                value={sortKey}
                onChange={(e) =>
                  setSortKey(e.target.value as "default" | "name" | "riders")
                }
              >
                <option value="default">기본 정렬</option>
                <option value="name">지사명 (가나다순)</option>
                <option value="riders">라이더 인원수 (많은 순)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Branches table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground">
          지사 목록
        </div>
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">
                  <div className="flex h-5 items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 cursor-pointer rounded border border-border text-primary accent-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </th>
                <th className="px-4 py-2">플랫폼</th>
                <th className="px-4 py-2">시/도</th>
                <th className="px-4 py-2">구/시/군</th>
                <th className="px-4 py-2">지사명</th>
                <th className="px-4 py-2">최종 지사명</th>
                <th className="px-4 py-2">라이더 인원수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-xs text-muted-foreground"
                  >
                    지사 목록을 불러오는 중입니다...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-xs text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filteredAndSortedBranches.map((branch) => (
                  <tr
                    key={branch.id}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() =>
                      router.push(`/branches/${branch.id}`)
                    }
                  >
                    <td className="px-4 py-3 align-middle">
                      <div
                        className="flex h-5 items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 cursor-pointer rounded border border-border text-primary accent-primary"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm">
                      <span
                        className={
                          branch.platform === "coupang"
                            ? "inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                            : branch.platform === "baemin"
                              ? "inline-flex rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700"
                              : "inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        }
                      >
                        {branch.platform === "coupang"
                          ? "쿠팡"
                          : branch.platform === "baemin"
                            ? "배민"
                            : branch.platform || "기타"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm">
                      {branch.province ? (
                        <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          {branch.province}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm">
                      {branch.district ? (
                        <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                          {branch.district}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-foreground">
                      {branch.branchName}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-muted-foreground">
                      {branch.displayName}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-muted-foreground">
                      {branch.riderCount.toLocaleString()}명
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
