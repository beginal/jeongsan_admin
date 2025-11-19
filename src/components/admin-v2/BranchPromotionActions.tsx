"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BranchPromotionActionsProps {
  promotionId: string;
  branchId: string;
}

export function BranchPromotionActions({
  promotionId,
  branchId,
}: BranchPromotionActionsProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/promotions/${encodeURIComponent(
          promotionId
        )}/assignments`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branch_ids: [branchId] }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(
          data?.error ||
            "프로모션 지사 배정을 삭제하지 못했습니다."
        );
      }
      router.refresh();
    } catch (err: any) {
      setError(
        err.message ||
          "프로모션 지사 배정을 삭제하지 못했습니다."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          className="inline-flex h-7 items-center rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
          onClick={() =>
            router.push(
              `/promotions/${encodeURIComponent(
                promotionId
              )}/edit`
            )
          }
          disabled={deleting}
        >
          수정
        </button>
        <button
          type="button"
          className="inline-flex h-7 items-center rounded-md border border-red-200 bg-red-50 px-2 text-[11px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
          onClick={() => setShowModal(true)}
          disabled={deleting}
        >
          삭제
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-sm shadow-lg">
            <div className="mb-3 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-xs font-semibold text-red-600">
                !
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  이 지사에서 프로모션을 제거할까요?
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  해당 지사에 대한 프로모션 배정만 삭제되며, 프로모션
                  자체는 유지됩니다. 되돌릴 수 없으니 주의해 주세요.
                </p>
                {error && (
                  <p className="mt-2 text-[11px] text-red-600">
                    {error}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (!deleting) {
                    setShowModal(false);
                    setError(null);
                  }
                }}
                className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
                disabled={deleting}
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDelete();
                  if (!error) {
                    setShowModal(false);
                  }
                }}
                className="inline-flex h-8 items-center rounded-md bg-red-600 px-4 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                disabled={deleting}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
