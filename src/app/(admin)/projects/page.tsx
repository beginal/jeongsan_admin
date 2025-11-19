export default function AdminV2ProjectsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-heading font-semibold tracking-tight">
          Projects
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dashbrd 템플릿의 Projects 페이지를 참고해서 프로젝트 목록/상세를 구성할 수 있습니다.
        </p>
      </header>
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        칸반 보드, 상태별 필터, 상세 모달 등 프로젝트 관련 UI를 추가할 수 있는 기본 컨테이너입니다.
      </div>
    </div>
  );
}

