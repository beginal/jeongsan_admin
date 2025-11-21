# Rider 포털 리팩토링 계획 (유지보수 + 성능)

## 공통 설계
- **데이터 훅 표준화**: `useRiderApi`(토큰 자동 헤더, 401 리다이렉트, abortable) + `useQuery` 패턴으로 응답 캐싱.
- **컨테이너/뷰 분리**: `RiderLandingContainer` ↔ `RiderLandingView`로 역할 분리, memo 적용해 불필요 리렌더 최소화.
- **상태/스타일 매핑**: 승인/정산 상태 메타를 `src/lib/status.ts`에 모아 라벨/클래스/메시지 일관화.
- **성능/UX**: 초기 로딩 skeleton, 액션 debounce, 에러/토스트 공통 처리. 목록/표는 필요 시 가상 스크롤 적용.

## 페이지/모듈별
### Rider Landing (`src/app/rider/page.tsx`)
- `useRiderProfile`, `useSettlement`, `useLoanSummary` 훅으로 데이터 분리(Promise.all → 병렬 fetch).
- 정산 상태 메타/토글 버튼 로직을 `useSettlementActions`로 추출(요청/취소/새로고침, 토스트/에러 공통).
- 카드 컴포넌트화: `RiderAccountCard`, `LoanSummaryCard`, `SettlementStatusCard`, `SettlementHistoryPlaceholder`.
- 전화/계좌 포맷터는 `src/lib/phone.ts`, `src/lib/accountFormat.ts` 공유.
- 액션 버튼 비활성 조건(승인 여부, pending 여부) 명시, optimistic update 후 실패 시 롤백.

### API (rider/*)
- `requireRiderAuth` 적용 완료. 추가로 응답을 뷰모델 형태로 정규화하는 함수(`serializeRider`, `serializeSettlement`)를 API/프런트에서 공유.
- 정산 요청/취소/재조회 API는 fetch 래퍼에서 에러 코드별 메시지 매핑.

## 공용 컴포넌트/유틸
- `src/lib/status.ts`: rider verification/settlement 상태 메타(라벨, 색상, 설명).
- `src/components/rider/SectionCard`: 제목/서브텍스트/액션 슬롯을 가진 카드 래퍼.
- `src/components/rider/Badge`: 상태 뱃지(승인/반려/대기, 정산 모드 등).
- `src/lib/api.ts`: JSON 파싱/401 처리/abort 지원 fetch 래퍼.

## 단계
1) `useRiderApi`, `useRiderProfile/Settlement/LoanSummary`, 상태 메타 유틸 추가.  
2) Rider 페이지 컨테이너/뷰 분리, 카드/뱃지 컴포넌트 적용.  
3) 액션 훅(`useSettlementActions`)으로 정산 요청/취소/새로고침 공통 처리.  
4) 중복 유틸 정리, skeleton/에러/토스트 UX 통일, 간단한 테스트 추가.
