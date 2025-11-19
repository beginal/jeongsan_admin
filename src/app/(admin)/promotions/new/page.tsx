export default function PromotionNewPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">+</span>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              프로모션 관리 / 새 프로모션 추가
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              새 프로모션 추가
            </h1>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm shadow-sm">
        <p className="text-xs text-muted-foreground">
          프로모션 생성 폼은 이 영역 안에서 지사 관리 폼과 비슷한 스타일로 단계적으로
          구현하면 됩니다.
        </p>
      </div>
    </div>
  );
}

