"use client";

import { useRouter } from "next/navigation";

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

  return (
    <div className="max-h-[520px] overflow-x-auto overflow-y-auto rounded-md border border-border bg-muted/40 text-xs">
      <table className="w-full min-w-[640px] text-left">
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
          {branches.map((branch) => (
            <tr
              key={branch.id}
              className="cursor-pointer hover:bg-muted/60"
              onClick={() =>
                router.push(`/branches/${encodeURIComponent(branch.id)}`)
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
  );
}
