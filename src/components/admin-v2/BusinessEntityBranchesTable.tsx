"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

export type BusinessEntityBranchRow = {
  id: string;
  platform: string;
  province: string;
  district: string;
  branchName: string;
  displayName: string;
  riderCount: number;
};

interface BusinessEntityBranchesTableProps {
  branches: BusinessEntityBranchRow[];
}

export function BusinessEntityBranchesTable({
  branches,
}: BusinessEntityBranchesTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<BusinessEntityBranchRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <div className="flex h-5 items-center justify-center">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 cursor-pointer rounded border border-border text-primary accent-primary"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ),
        cell: () => (
          <div
            className="flex h-5 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 cursor-pointer rounded border border-border text-primary accent-primary"
            />
          </div>
        ),
        enableSorting: false,
        size: 64,
      },
      {
        accessorKey: "platform",
        header: "플랫폼",
        cell: ({ row }) => {
          const platform = row.original.platform;
          return (
            <span
              className={
                platform === "coupang"
                  ? "inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                  : platform === "baemin"
                    ? "inline-flex rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700"
                    : "inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
              }
            >
              {platform === "coupang"
                ? "쿠팡"
                : platform === "baemin"
                  ? "배민"
                  : platform || "기타"}
            </span>
          );
        },
      },
      {
        accessorKey: "province",
        header: "시/도",
        cell: ({ row }) =>
          row.original.province ? (
            <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {row.original.province}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "district",
        header: "구/시/군",
        cell: ({ row }) =>
          row.original.district ? (
            <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              {row.original.district}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "branchName",
        header: "지사명",
        cell: ({ row }) => <span className="text-sm text-foreground">{row.original.branchName}</span>,
      },
      {
        accessorKey: "displayName",
        header: "최종 지사명",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.displayName}</span>,
      },
      {
        accessorKey: "riderCount",
        header: "라이더 인원수",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.riderCount.toLocaleString()}명
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: branches,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  return (
    <div className="max-h-[520px] overflow-x-auto overflow-y-auto rounded-md border border-border bg-muted/40 text-xs">
      <table className="w-full min-w-[640px] text-left">
        <thead className="sticky top-0 z-10 border-b border-border bg-muted text-[11px] uppercase text-muted-foreground">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-2"
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
        <tbody className="divide-y divide-border bg-card">
          {branches.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-6 text-center text-[11px] text-muted-foreground"
              >
                소속 지사가 없습니다.
              </td>
            </tr>
          )}
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer hover:bg-muted/60"
              onClick={() => router.push(`/branches/${encodeURIComponent(row.original.id)}`)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 align-middle text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
