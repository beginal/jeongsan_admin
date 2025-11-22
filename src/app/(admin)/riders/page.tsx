"use client";

import { useEffect, useMemo, useState } from "react";
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
                전체 <span className="text-foreground">{filteredRiders.length}명</span>
              </span>
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
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <div className="flex h-4 items-center">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium">라이더명</th>
                  <th className="px-4 py-3 font-medium">소속 지사</th>
                  <th className="px-4 py-3 font-medium">연락처</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 text-right font-medium">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {error ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : loading ? (
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
                ) : filteredRiders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      조건에 맞는 라이더가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRiders.map((rider) => (
                    <tr
                      key={rider.id}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/riders/${encodeURIComponent(rider.id)}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex h-4 items-center">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{rider.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {rider.primaryBranchName && rider.primaryBranchName !== "-" ? (
                          <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs">
                            {rider.primaryBranchName}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPhone(rider.phone) || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeToneClass(
                            getRiderStatusMeta(rider.status).tone
                          )}`}
                        >
                          {getRiderStatusMeta(rider.status).label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {rider.status !== "approved" && (
                            <GlassButton
                              variant="primary"
                              size="sm"
                              onClick={() => handleStatusChange(rider.id, "approved")}
                              disabled={actionLoadingId === rider.id}
                              className="h-7 text-xs"
                            >
                              승인
                            </GlassButton>
                          )}
                          <GlassButton
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(rider.id)}
                            disabled={actionLoadingId === rider.id}
                            className="h-7 text-xs"
                          >
                            삭제
                          </GlassButton>
                        </div>
                      </td>
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
