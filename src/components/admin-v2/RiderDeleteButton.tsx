"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

interface RiderDeleteButtonProps {
  riderId: string;
}

export function RiderDeleteButton({ riderId }: RiderDeleteButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/riders/${encodeURIComponent(riderId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data.error as string)) ||
          "라이더를 삭제하지 못했습니다."
        );
      }
      showToast("라이더를 삭제했습니다.", "success");
      router.push("/riders");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "라이더를 삭제하지 못했습니다.");
      showToast(err.message || "라이더를 삭제하지 못했습니다.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => setShowModal(true)}
        disabled={deleting}
        isLoading={deleting}
      >
        라이더 삭제
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-sm shadow-lg">
            <div className="mb-3 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-xs font-semibold text-red-600">
                !
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  라이더를 삭제하시겠습니까?
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  삭제 후에는 이 라이더와 연결된 소속 지사, 차량 배정 등에 영향이
                  있을 수 있으며, 되돌릴 수 없습니다.
                </p>
                {error && (
                  <p className="mt-2 text-[11px] text-red-600">{error}</p>
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
                  await handleDelete();
                  if (!error) {
                    setShowModal(false);
                  }
                }}
                disabled={deleting}
                isLoading={deleting}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
