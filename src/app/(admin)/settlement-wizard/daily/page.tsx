export default function DailySettlementWizardPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-base font-semibold">Day</span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">정산 마법사 / Daily</div>
            <h1 className="text-lg font-semibold text-foreground">
              일 정산 준비 중
            </h1>
            <p className="text-xs text-muted-foreground">
              일 정산 프로세스를 이 탭에서 분리해 다룰 예정입니다. 필요한 데이터 흐름과
              정책을 정리한 뒤 연결해주세요.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-foreground sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/80 p-3">
            <div className="text-xs font-semibold text-muted-foreground">시작 가이드</div>
            <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
              <li>· 일별 정산 엑셀/데이터 포맷 정의</li>
              <li>· 필요한 지사/라이더 매핑 규칙 결정</li>
              <li>· 프로모션·공제 로직을 일 단위에 맞춰 분리</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-background/80 p-3">
            <div className="text-xs font-semibold text-muted-foreground">다음 액션</div>
            <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
              <li>· 주 정산 플로우 복제 후 일 단위로 조정</li>
              <li>· 테스트용 더미 데이터 연결</li>
              <li>· 결과 검토 테이블/다운로드 포맷 확정</li>
            </ul>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          주 정산 탭을 참고해 동일한 사용자 경험을 맞춰주세요. 구현이 완료되면 이 안내를 제거하고 일 정산 UI를 연결하면 됩니다.
        </p>
      </div>
    </div>
  );
}
