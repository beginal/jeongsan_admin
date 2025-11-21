# Admin UI 리팩토링 계획 (유지보수 + 성능 강화)

## 공통 설계 원칙
- **데이터 패칭 일원화**: `useApi` + `useQuery` 스타일 훅(SWR 패턴) 도입. 키 기반 캐싱, `stale-while-revalidate`, abortable fetch, 401 시 자동 리다이렉트.
- **컨테이너/뷰 분리**: 페이지는 `PageContainer`(데이터/상태/핸들러)와 `View`(순수 프롭, memo)로 분리. 스토리/테스트 용이, 리렌더 최소화.
- **공용 유틸/컴포넌트**: 전화/계좌 포맷터, 상태 라벨/스타일, Table Empty/Loading 행을 `src/lib`/`src/components/common`으로 이동해 중복 제거.
- **성능 가이드**: 검색 debounce(300ms), 리스트는 페이지네이션 또는 가상 스크롤(>500행), 큰 데이터는 배치 요청/서버 필터 활용. 필요 시 skeleton/placeholder로 초기 로딩 가시화.
- **접근성/시맨틱**: 테이블 구조 준수, 행 클릭은 셀 내부 절대 위치 `Link` 사용, 버튼/폼 aria-label 정비.

## 페이지/모듈별 상세 계획

### AdminLayout / Sidebar
- 세션 타이머/테마/사이드바 상태를 `useSessionTimer`, `useTheme`, `useSidebar`로 분리.
- `/api/auth/me/refresh` 호출을 fetch 래퍼로 통일, 401 시 쿠키 정리 + 리다이렉트.
- `NAV_SECTIONS`를 config 파일로 분리, 테스트 가능하게.

### 로그인
- `useLoginForm` 훅으로 mode 전환/폼 제출/에러 상태 통합.
- 휴대폰 포맷터 `formatPhone`을 `src/lib/phone.ts`로 이동 후 사용.

### 지사 목록/상세 (branches)
- `useBranches`(목록+필터), `useBranchDetail`(지사+라이더+프로모션) 훅 도입.
- 소속 라이더 테이블을 `BranchRidersTable`로 분리, 행 전체 클릭은 시맨틱 유지.
- 상태/라벨 매핑(rider/promotion)을 `src/lib/status.ts`로 통합.
- 대형 목록 시 페이지네이션 또는 가상 스크롤 옵션 고려.

### 라이더 목록
- `useRiderFilters`(검색/상태, URL sync, debounce) + `useRiders`(캐싱, abortable)로 데이터 분리.
- 중복 그룹 계산/전화 포맷터를 `src/lib/phone.ts`, `groupDuplicates` 유틸로 이동.
- 액션(승인/삭제) 공용 훅 `useRiderActions`: optimistic update + 실패 롤백, 토스트/confirm 공통.
- >500행 시 가상 스크롤 or 서버 페이지네이션 적용.

### 사업자 관리
- 트리 생성/정렬을 `buildEntityTree` 유틸로 이동.
- `useEntityFilters`(검색/타입 필터, URL sync).
- 트리/테이블 렌더러 분리, expand 상태는 컨테이너에서 관리.

### 프로모션 목록/단건
- `normalizePromotion` 유틸로 type/status/config 정규화, UI/폼/서버 공통 사용.
- 지사 배정 테이블을 컴포넌트화(검색/필터, 우선순위 편집 포함).
- `usePromotionForm` 훅: dirty 상태, 밸리데이션, 저장 가능 여부 관리.

### 리스/렌탈
- `useRentalDetail`로 차량+배정 조합, 활성 배정 선택 로직 단일화.
- 행 클릭/액션은 공용 `ClickableRow` 패턴 사용.

### 대여금 관리
- `useLoans`로 목록+검색/필터 관리, 캐싱.
- 금액/날짜 입력을 `CurrencyInput`, `DateInput`으로 분리.
- 상환 내역 컴포넌트 `LoanPaymentsList`로 테스트/재사용성 개선.

### 정산마법사
- 상태머신 `useSettlementWizard`: 업로드 → 검증 → 계산 → 확정; Zustand/Context로 단계/입력/결과 공유.
- 파서 모듈 `src/lib/settlement/parser.ts` (Excel/CSV, 플랫폼 매핑 테이블).
- 검증/정규화 파이프라인: 금액/날짜/전화/지사 매핑 검증, 실패 메시지 표준화.
- 프리뷰/요약 컴포넌트 `SettlementPreviewTable`, `SettlementSummaryCard`.
- 실패 항목 다운로드(CSV/엑셀) 버튼, 상태 매핑은 `src/lib/status.ts` 재사용.
- 성능: 큰 파일은 청크 파싱, 프리뷰 테이블 가상 스크롤, 필요 시 Web Worker 옵션.

### Admin 대시보드
- 카드/차트/테이블을 모듈화(`DashboardStatCard`, `DashboardTable`), 목업 제거 후 프롭 기반.

## 공용 컴포넌트/유틸 구조
- `src/lib/phone.ts`: `formatPhone`, `parsePhoneDigits`, `maskPhone`.
- `src/lib/status.ts`: rider/settlement/promotion/loan 상태 → 라벨/클래스.
- `src/lib/api.ts`: fetch 래퍼(401 처리, JSON 파싱, 에러 표준화, abort 지원).
- `src/components/common/Table`: `Table`, `TableRowClickable`, `EmptyState`, `LoadingRow`.
- `src/components/common/Badge`: 상태/톤별 뱃지.
- `src/components/common/Filters`: 검색창, 셀렉트, 카운터 칩, debounce 내장.

## 실행 단계 (우선순위)
1) 공용 유틸/컴포넌트 추가(`lib/phone`, `lib/status`, `lib/api`, common Table/Badge/Filters).  
2) Layout/Sidebar/Login에 fetch 래퍼/공용 훅 적용.  
3) Riders/Branches/Business Entities: 컨테이너+뷰 분리, 데이터 훅 도입, 리스트 성능 옵션 반영.  
4) Promotions/Lease/Loans: 정규화 유틸+폼 훅 적용, 액션/배정 공통화.  
5) 정산마법사 상태머신/파서/프리뷰 모듈 도입, 대형 파일 대응.  
6) 대시보드/잔여 페이지 정리, 중복 제거 후 공통 컴포넌트 재사용 확대.  
7) 스토리/테스트(리스트/폼/파서) 추가, 문서 업데이트.
