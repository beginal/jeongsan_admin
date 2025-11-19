export default function AdminV2AccountPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-heading font-semibold tracking-tight">
          Account overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사용자 프로필, 권한, 설정 등 계정 관련 정보를 Dashbrd 스타일로 배치할 수 있습니다.
        </p>
      </header>
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        프로필 카드, 최근 활동, 보안 설정 카드 등으로 이 영역을 구성해 보세요.
      </div>
    </div>
  );
}

