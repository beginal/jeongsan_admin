"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { formatPhone } from "@/lib/phone";
import { badgeToneClass, getRiderStatusMeta } from "@/lib/status";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassInput } from "@/components/ui/glass/GlassInput";
import { GlassSelect } from "@/components/ui/glass/GlassSelect";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";
import { showToast } from "@/components/ui/Toast";
import { Bike } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/api";

type RiderStatus = "approved" | "pending" | "rejected";

type RiderRow = {
  id: string;
  name: string;
  primaryBranchName: string;
  phone: string;
  status: RiderStatus;
};

export default function RidersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RiderStatus>("all");
  const [adminId, setAdminId] = useState<string>("");
  const [copyMsg, setCopyMsg] = useState("");
  const [registerLink, setRegisterLink] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { data: adminData } = useQuery<{ id?: string }>({
    queryKey: ["admin-me"],
    queryFn: () => fetchJson("/api/admin/me"),
    staleTime: 60_000,
  });

  const { data, isLoading, isFetching, error } = useQuery<{ riders?: any[] }, Error>({
    queryKey: ["riders", { search, statusFilter }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("verificationStatus", statusFilter);
      return fetchJson(`/api/riders?${params.toString()}`);
    },
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (adminData?.id) setAdminId(String(adminData.id));
  }, [adminData]);

  useEffect(() => {
    if (!adminId || typeof window === "undefined") return;
    setRegisterLink(`${window.location.origin}/register/riders/${adminId}`);
  }, [adminId]);

  const riderRows: RiderRow[] = useMemo(() => {
    const list = Array.isArray(data?.riders) ? data?.riders : [];
    return list.map((r: any) => ({
      id: String(r.id),
      name: r.name || "-",
      primaryBranchName:
        (Array.isArray(r.branches) &&
          r.branches.find((b: any) => b.isPrimary)?.branchName) ||
        (Array.isArray(r.branches) && r.branches[0]?.branchName) ||
        "-",
      phone: formatPhone(r.phone),
      status:
        r.verificationStatus === "approved" ||
        r.verificationStatus === "pending" ||
        r.verificationStatus === "rejected"
          ? (r.verificationStatus as RiderStatus)
          : ("pending" as RiderStatus),
    }));
  }, [data?.riders]);

  const duplicateInfo = useMemo(() => {
    const groups = new Map<string, RiderRow[]>();
    riderRows.forEach((r) => {
      const nameKey = (r.name || "").trim().toLowerCase();
      const phoneKey = (r.phone || "").replace(/\D/g, "");
      if (!nameKey || !phoneKey) return;
      const key = `${nameKey}|${phoneKey}`;
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    });

    let duplicateCount = 0;
    let groupCount = 0;
    groups.forEach((list) => {
      if (list.length > 1) {
        groupCount += 1;
        duplicateCount += list.length;
      }
    });

    return { duplicateCount, groupCount };
  }, [riderRows]);

  const handleStatusChange = useCallback(
    async (riderId: string, nextStatus: RiderStatus, rejectionReason?: string | null) => {
      setActionLoadingId(riderId);
      try {
        const res = await fetch(`/api/riders/${encodeURIComponent(riderId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationStatus: nextStatus,
            rejectionReason: rejectionReason ?? null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "상태를 변경하지 못했습니다.");
        }

        queryClient.invalidateQueries({ queryKey: ["riders"] });
      } catch (e: any) {
        showToast(e.message || "상태를 변경하지 못했습니다.", "error");
      } finally {
        setActionLoadingId(null);
      }
    },
    [queryClient]
  );

  const handleDelete = useCallback(
    async (riderId: string) => {
      if (!confirm("선택한 라이더를 삭제할까요?")) return;
      setActionLoadingId(riderId);
      try {
        const res = await fetch(`/api/riders/${encodeURIComponent(riderId)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "라이더를 삭제하지 못했습니다.");
        }
        queryClient.invalidateQueries({ queryKey: ["riders"] });
      } catch (e: any) {
        showToast(e.message || "라이더를 삭제하지 못했습니다.", "error");
      } finally {
        setActionLoadingId(null);
      }
    },
    [queryClient]
  );

  const columns = useMemo<ColumnDef<RiderRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <div className="flex h-4 items-center">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary" />
          </div>
        ),
        cell: () => (
          <div className="flex h-4 items-center" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary" />
          </div>
        ),
        enableSorting: false,
        size: 60,
      },
      {
        accessorKey: "name",
        header: "라이더명",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: "primaryBranchName",
        header: "소속 지사",
        cell: ({ row }) =>
          row.original.primaryBranchName && row.original.primaryBranchName !== "-" ? (
            <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs">
              {row.original.primaryBranchName}
            </span>
          ) : (
            "-"
          ),
      },
      {
        accessorKey: "phone",
        header: "연락처",
        cell: ({ row }) => <span className="text-muted-foreground">{formatPhone(row.original.phone) || "-"}</span>,
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeToneClass(
              getRiderStatusMeta(row.original.status).tone
            )}`}
          >
            {getRiderStatusMeta(row.original.status).label}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">작업</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {row.original.status !== "approved" && (
              <GlassButton
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange(row.original.id, "approved")}
                disabled={actionLoadingId === row.original.id}
                className="h-7 text-xs"
              >
                승인
              </GlassButton>
            )}
            <GlassButton
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(row.original.id)}
              disabled={actionLoadingId === row.original.id}
              className="h-7 text-xs"
            >
              삭제
            </GlassButton>
          </div>
        ),
      },
    ],
    [actionLoadingId, handleDelete, handleStatusChange]
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const isBusy = isLoading || isFetching;
  const errorMessage = error?.message || null;

  const table = useReactTable({
    data: riderRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="라이더 목록"
        description="라이더 목록을 조회하고 승인/반려 상태를 관리합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "라이더 목록", href: "#" },
        ]}
        icon={<Bike className="h-5 w-5" />}
        actions={
          adminId && registerLink ? (
            <div className="flex items-center gap-2">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard
                    .writeText(registerLink)
                    .then(() => setCopyMsg("복사됨"))
                    .catch(() => setCopyMsg("복사 실패"));
                  setTimeout(() => setCopyMsg(""), 1500);
                }}
              >
                {copyMsg || "가입 링크 복사"}
              </GlassButton>
            </div>
          ) : undefined
        }
      />

      {duplicateInfo.duplicateCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-800 backdrop-blur-sm">
          <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
            !
          </div>
          <div>
            <p className="font-medium">
              중복 의심 라이더 {duplicateInfo.duplicateCount}명
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              동일한 이름·연락처 조합이 {duplicateInfo.groupCount}건 이상 존재합니다.
            </p>
          </div>
        </div>
      )}

      <Section>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                전체 <span className="text-foreground">{riderRows.length}명</span>
              </span>
              {isBusy && (
                <span className="text-xs text-primary">불러오는 중...</span>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-[240px]">
                <GlassInput
                  placeholder="라이더명, 연락처 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={<span className="text-muted-foreground">🔍</span>}
                />
              </div>
              <div className="w-full sm:w-[140px]">
                <GlassSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | RiderStatus)}
                >
                  <option value="all">전체 상태</option>
                  <option value="pending">대기</option>
                  <option value="approved">승인됨</option>
                  <option value="rejected">반려됨</option>
                </GlassSelect>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`px-4 py-3 font-medium ${header.column.id === "actions" ? "text-right" : ""}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: "▲",
                            desc: "▼",
                          }[header.column.getIsSorted() as string] || null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {errorMessage ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-red-500">
                      {errorMessage}
                    </td>
                  </tr>
                ) : isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-4 rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="ml-auto h-8 w-20" />
                      </td>
                    </tr>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      조건에 맞는 라이더가 없습니다.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/riders/${encodeURIComponent(row.original.id)}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`px-4 py-3 ${cell.column.id === "actions" ? "text-right" : ""}`}
                          onClick={(e) => {
                            if (cell.column.id === "actions") e.stopPropagation();
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </div>
  );
}
