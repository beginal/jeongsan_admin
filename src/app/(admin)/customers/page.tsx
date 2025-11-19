export default function AdminV2CustomersPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-heading font-semibold tracking-tight">
          Customers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dashbrd 템플릿의 Customers 화면을 기반으로 고객 목록/상세를 구현할 수 있는 영역입니다.
        </p>
      </header>
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        실제 데이터 테이블, 필터, 검색 기능 등을 이 영역 안에 구현하면 됩니다.
      </div>
    </div>
  );
}

