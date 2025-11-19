import { notFound } from "next/navigation";
import { PromotionEditForm } from "@/components/admin-v2/PromotionEditForm";

interface PromotionEditPageProps {
  params: Promise<{ promotionId: string }>;
}

export default async function PromotionEditPage({
  params,
}: PromotionEditPageProps) {
  const { promotionId } = await params;

  if (!promotionId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">%</span>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              프로모션 관리 / {promotionId}
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              프로모션 수정
            </h1>
          </div>
        </div>
      </div>

      <PromotionEditForm promotionId={promotionId} />
    </div>
  );
}
