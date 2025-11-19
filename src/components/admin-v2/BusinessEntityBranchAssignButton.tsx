"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BranchOption = {
  id: string;
  displayName: string;
  province: string;
  district: string;
  platform: string;
   corporateEntityName?: string | null;
   personalEntityName?: string | null;
};

interface BusinessEntityBranchAssignButtonProps {
  entityId: string;
}

export function BusinessEntityBranchAssignButton({
  entityId,
}: BusinessEntityBranchAssignButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [search, setSearch] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [confirmInfo, setConfirmInfo] = useState<
    { branchId: string; message: string } | null
  >(null);

  useEffect(() => {
    if (!open || branches.length > 0 || loading) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/branches");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.error || "지사 목록을 불러오지 못했습니다."
          );
        }
        if (cancelled) return;
        const list = Array.isArray(data.branches) ? data.branches : [];
        setBranches(
          list.map((b: any) => ({
            id: String(b.id),
            displayName:
              (b.display_name as string) ||
              (b.branch_name as string) ||
              String(b.id),
            province: (b.province as string) || "",
            district: (b.district as string) || "",
            platform: (b.platform as string) || "",
            corporateEntityName:
              (b.corporate_entity_name as string | null) ?? null,
            personalEntityName:
              (b.personal_entity_name as string | null) ?? null,
          }))
        );
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

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredBranches = useMemo(() => {
    if (!search.trim()) return branches;
    const q = search.trim().toLowerCase();
    return branches.filter((b) => {
      const target = `${b.displayName} ${b.province} ${b.district}`.toLowerCase();
      return target.includes(q);
    });
  }, [branches, search]);

  const handleAssign = async (branchId: string, force?: boolean) => {
    setError(null);
    setAssigningId(branchId);
    try {
      let res = await fetch(
        `/api/business-entities/${encodeURIComponent(
          entityId
        )}/branches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchId, force: !!force }),
        }
      );
      let data = await res.json().catch(() => ({}));
      if (res.status === 409 && data?.error && !force) {
        setAssigningId(null);
        setConfirmInfo({
          branchId,
          message: String(
            data.error ||
              "이미 다른 사업자로 설정되어 있습니다. 변경하시겠습니까?"
          ),
        });
        return;
      }

      if (!res.ok || data?.error) {
        throw new Error(
          data?.error || "지사 소속을 변경하지 못했습니다."
        );
      }

      setOpen(false);
      setSearch("");
      setConfirmInfo(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "지사 소속을 변경하지 못했습니다.");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
        onClick={() => setOpen(true)}
      >
        지사 추가
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 text-sm shadow-lg">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  소속 지사 추가
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  이 사업자에 소속될 지사를 선택하세요.
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className="mb-3">
              <div className="relative">
                <input
                  className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="지사명, 지역 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                  🔍
                </span>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-muted/40 text-xs">
              {loading && (
                <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                  지사 목록을 불러오는 중입니다...
                </div>
              )}
              {!loading && error && (
                <div className="px-3 py-4 text-center text-[11px] text-red-600">
                  {error}
                </div>
              )}
              {!loading && !error && filteredBranches.length === 0 && (
                <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                  조건에 맞는 지사가 없습니다.
                </div>
              )}
              {!loading &&
                !error &&
                filteredBranches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="flex w-full items-center justify-between border-b border-border/50 px-3 py-2 text-left last:border-b-0 hover:bg-card"
                    onClick={() => handleAssign(b.id)}
                    disabled={assigningId === b.id}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">
                        {b.displayName}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {[b.province, b.district].filter(Boolean).join(" ")}
                      </div>
                      {(b.corporateEntityName || b.personalEntityName) && (
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {[
                            b.corporateEntityName &&
                              `[법인] ${b.corporateEntityName}`,
                            b.personalEntityName &&
                              `[개인] ${b.personalEntityName}`,
                          ]
                            .filter(Boolean)
                            .join(" / ")}
                        </div>
                      )}
                    </div>
                    <div className="ml-2 text-[11px] text-muted-foreground">
                      <span
                        className={`inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium shadow-sm ${
                          assigningId === b.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {assigningId === b.id ? "추가 중..." : "추가"}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {confirmInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-sm shadow-lg">
            <div className="mb-3 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-xs font-semibold text-amber-700">
                !
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  소속 지사를 변경할까요?
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {confirmInfo.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setConfirmInfo(null)}
                className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
                disabled={assigningId !== null}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() =>
                  confirmInfo && handleAssign(confirmInfo.branchId, true)
                }
                className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
                disabled={assigningId !== null}
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
