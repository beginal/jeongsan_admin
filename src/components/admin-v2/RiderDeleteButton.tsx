"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      router.push("/riders");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "라이더를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex h-8 items-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
        disabled={deleting}
      >
        라이더 삭제
      </button>

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
