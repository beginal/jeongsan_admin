export default function AdminV2NotFoundPage() {
  return (
    <div className="flex h-full flex-1 items-center justify-center">
      <div className="max-w-md rounded-xl border border-border bg-card px-6 py-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          404 · Page not found
        </p>
        <h1 className="mt-3 text-xl font-semibold text-foreground">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          요청하신 주소에 해당하는 화면이 없어요. 사이드바에서 다른 메뉴를 선택해
          이동해 주세요.
        </p>
      </div>
    </div>
  );
}

