"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";

type RiderStatus = "approved" | "pending" | "rejected";

interface RiderStatusActionsProps {
  riderId: string;
  currentStatus: RiderStatus;
  onDeleted?: () => void;
}

export function RiderStatusActions({ riderId, currentStatus, onDeleted }: RiderStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (status: RiderStatus, rejectionReason?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/riders/${encodeURIComponent(riderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: status, rejectionReason: rejectionReason || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "상태를 변경하지 못했습니다.");
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message || "상태를 변경하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {currentStatus !== "approved" && (
          <GlassButton
            type="button"
            variant="primary"
            size="sm"
            className="h-8 px-3"
            onClick={() => updateStatus("approved")}
            disabled={loading}
          >
            승인
          </GlassButton>
        )}
        {currentStatus !== "approved" && (
          <GlassButton
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 px-3"
            onClick={async () => {
              if (!confirm("이 라이더를 삭제할까요?")) return;
              setLoading(true);
              setError(null);
              try {
                const res = await fetch(`/api/riders/${encodeURIComponent(riderId)}`, {
                  method: "DELETE",
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data?.error) {
                  throw new Error(data?.error || "라이더를 삭제하지 못했습니다.");
                }
                if (onDeleted) onDeleted();
                else router.push("/riders");
              } catch (e: any) {
                setError(e.message || "라이더를 삭제하지 못했습니다.");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            삭제
          </GlassButton>
        )}
      </div>
    </div>
  );
}
