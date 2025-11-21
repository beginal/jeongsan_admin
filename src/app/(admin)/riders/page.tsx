"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/phone";
import { badgeToneClass, getRiderStatusMeta } from "@/lib/status";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

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
  const [riders, setRiders] = useState<RiderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RiderStatus>("all");
  const [adminId, setAdminId] = useState<string>("");
  const [copyMsg, setCopyMsg] = useState("");
  const [registerLink, setRegisterLink] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAdmin() {
      try {
        const res = await fetch("/api/admin/me");
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) return;
        if (!cancelled) setAdminId(String(data.id || ""));
      } catch {
        // ignore
      }
    }

    loadAdmin();

    async function loadRiders() {
      try {
        setError(null);
        setLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.append("search", search.trim());
        if (statusFilter !== "all") {
          params.append("verificationStatus", statusFilter);
        }

        const res = await fetch(`/api/riders?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data?.error || "라이더 목록을 불러오지 못했습니다."
          );
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        const list = Array.isArray(data.riders) ? data.riders : [];
        setRiders(
          list.map((r: any) => ({
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
          }))
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "라이더 목록을 불러오지 못했습니다.");
          setRiders([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRiders();
    return () => {
      cancelled = true;
    };
  }, [search, statusFilter]);

  useEffect(() => {
    if (!adminId) return;
    if (typeof window === "undefined") return;
    setRegisterLink(`${window.location.origin}/register/riders/${adminId}`);
  }, [adminId]);

  const filteredRiders = useMemo(() => {
    return riders;
  }, [riders]);

  const duplicateInfo = useMemo(() => {
    const groups = new Map<string, RiderRow[]>();
    riders.forEach((r) => {
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
  }, [riders]);

  const handleStatusChange = async (
    riderId: string,
    nextStatus: RiderStatus,
    rejectionReason?: string | null
  ) => {
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

      setRiders((prev) =>
        prev.map((r) =>
          r.id === riderId ? { ...r, status: nextStatus } : r
        )
      );
    } catch (e: any) {
      showToast(e.message || "상태를 변경하지 못했습니다.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (riderId: string) => {
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
      setRiders((prev) => prev.filter((r) => r.id !== riderId));
    } catch (e: any) {
      showToast(e.message || "라이더를 삭제하지 못했습니다.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">R</span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              라이더 관리 / Riders
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              라이더 관리
            </h1>
          </div>
        </div>
      </div>

      {adminId && registerLink && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  라이더 가입 링크
                </div>
              <div className="truncate text-sm font-medium text-foreground">
                {registerLink}
              </div>
              <div className="text-[11px] text-muted-foreground">
                라이더에게 공유하면 이 링크로 직접 신청하며 상태는 &quot;대기&quot;로 표시됩니다.
              </div>
            </div>
            <Button
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
              링크 복사
            </Button>
            {copyMsg && (
              <span className="text-xs text-muted-foreground">{copyMsg}</span>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              전체 라이더{" "}
              <span className="ml-1 text-foreground">
                {filteredRiders.length}명
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full max-w-[220px]">
              <input
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="라이더명, 연락처 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                🔍
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | RiderStatus
                  )
                }
              >
                <option value="all">전체 상태</option>
                <option value="pending">대기</option>
                <option value="approved">승인됨</option>
                <option value="rejected">반려됨</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {duplicateInfo.duplicateCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-xs font-semibold text-amber-700">
            !
          </div>
          <div>
            <p className="font-medium">
              라이더명과 연락처 기준 중복 라이더 {duplicateInfo.duplicateCount}
              명
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              동일한 이름·연락처 조합이 {duplicateInfo.groupCount}
              건 이상 존재합니다. 중복 가입 여부를 확인해 주세요.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground">
          라이더 목록
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
                <th className="px-4 py-2">라이더명</th>
                <th className="px-4 py-2">소속 지사</th>
                <th className="px-4 py-2">연락처</th>
                <th className="px-4 py-2">상태</th>
                <th className="px-4 py-2 text-right w-[180px]">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-xs text-muted-foreground"
                  >
                    라이더 목록을 불러오는 중입니다...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-xs text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filteredRiders.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-xs text-muted-foreground"
                    >
                      조건에 맞는 라이더가 없습니다.
                    </td>
                  </tr>
                )}
              {!loading &&
                !error &&
                filteredRiders.map((rider) => (
                  <tr
                    key={rider.id}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() =>
                      router.push(
                        `/riders/${encodeURIComponent(rider.id)}`
                      )
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
                    <td className="px-4 py-3 align-middle text-sm text-foreground">
                      {rider.name}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-muted-foreground">
                      {rider.primaryBranchName && rider.primaryBranchName !== "-" ? (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {rider.primaryBranchName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-muted-foreground">
                      {formatPhone(rider.phone) || "-"}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeToneClass(
                          getRiderStatusMeta(rider.status).tone
                        )}`}
                      >
                        {getRiderStatusMeta(rider.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-[11px]">
                      <div
                        className="inline-flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rider.status !== "approved" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleStatusChange(rider.id, "approved")}
                            disabled={actionLoadingId === rider.id}
                            isLoading={actionLoadingId === rider.id}
                          >
                            승인
                          </Button>
                        )}
                        {rider.status !== "approved" && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(rider.id)}
                            disabled={actionLoadingId === rider.id}
                            isLoading={actionLoadingId === rider.id}
                          >
                            삭제
                          </Button>
                        )}
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
