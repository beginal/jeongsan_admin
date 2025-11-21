"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

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

  const handleUnassign = async () => {
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
      return true;
    } catch (err: any) {
      setError(
        err.message ||
        "프로모션 지사 배정을 삭제하지 못했습니다."
      );
    } finally {
      setDeleting(false);
    }

    return false;
  };

  return (
    <>
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/promotions/${encodeURIComponent(promotionId)}/edit`)}
          disabled={deleting}
        >
          수정
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => setShowModal(true)}
          disabled={deleting}
          isLoading={deleting}
        >
          해제
        </Button>
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
                  이 지사에 배정된 프로모션을 해제할까요?
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  해당 지사와의 배정만 해제되고 프로모션 자체는 유지됩니다.
                  되돌릴 수 없으니 주의해 주세요.
                </p>
                {error && (
                  <p className="mt-2 text-[11px] text-red-600">
                    {error}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!deleting) {
                    setShowModal(false);
                    setError(null);
                  }
                }}
                disabled={deleting}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={async () => {
                  const ok = await handleUnassign();
                  if (ok) {
                    setShowModal(false);
                  }
                }}
                disabled={deleting}
                isLoading={deleting}
              >
                해제
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
