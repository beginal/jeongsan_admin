# API 백엔드 리팩토링 계획 (보안/성능/유지보수)

## 핵심 목표
- service role 최소화 → anon + RLS 우선, 필요 시 제한적 service RPC.
- 인증/인가/입력 검증 패턴을 표준화해 중복 제거.
- N+1 제거, 배치/필터링으로 성능 개선.

## 공통 패턴
- **Auth 헬퍼**: `requireAdminAuth`, `requireRiderAuth` 전면 적용. 외부 입력(adminId 등)으로 소유자 결정 금지.
- **에러/검증 유틸**: `errors.ts`(`badRequest/unauthorized/forbidden/serverError`)와 `validation.ts`(숫자·날짜·필수값) 추가, 모든 라우트에 적용.
- **응답 정규화**: 직렬화 함수(`serializeRider`, `normalizePromotion` 등)를 API/프런트에서 공유해 필드 일관화.
- **쿼리 최적화**: 참여 테이블을 한번에 select(join)하거나 RPC로 배치 조회, 반복 fetch 제거.
- **로깅 규칙**: `[api-name] context: error` 형식, 민감정보 제외.

## 영역별 계획
- **Branches / Branch-riders**
  - RLS 정책: `new_branches.created_by = auth.uid()`, `rider_new_branches` join 시 소유자 검증.
  - serviceSupabase 제거 목표 → anon+RLS에서 동작하도록 쿼리 단순화, 필요한 경우 RPC로 owner 체크.
- **Business Entities**: service role 제거 완료. 검증 유틸 적용, 직렬화 통일.
- **Promotions**: detail/list/assignments 인증 완료. serviceSupabase → anon+RLS 전환, config 정규화 유틸 재사용.
- **Riders**: 목록/단건 N+1 제거(브랜치/배정/차량을 조인 또는 batch). 검색/필터는 서버측 `ilike`/`eq` 적용. phone 정규화. settlement 요청/승인/취소는 인증 헬퍼/검증 유틸 적용.
- **Lease Rentals**: vehicles/assignments 조회/수정에 RLS 적용(vehicles.created_by). 단건/목록 모두 anon 쿼리 가능하도록 준비.
- **Loans**: summaries/payments 조회/수정에 RLS(loan.created_by). 납부/취소 검증 강화(금액>0, loan 상태 확인).
- **Public Riders**: 공개 엔드포인트는 위험. 유지 시 CAPTCHA/Rate limit/IP 로그/입력 검증 강화, 가능하면 서버 내부 호출로 제한 또는 별도 백엔드로 분리.

## 공용 모듈 제안
- `src/lib/api/errors.ts`: 에러 응답 헬퍼.
- `src/lib/api/validation.ts`: 숫자/날짜/필수값/길이 검증.
- `src/lib/api/supabase.ts`: anon/service 클라이언트 팩토리, 워크스페이스별 설정 지원.
- `src/lib/api/status.ts`: 상태 상수/맵, 프런트와 공유.

## 단계별 실행
1) `errors.ts`, `validation.ts`, `supabase.ts` 추가 후 Riders/Branches/Loans에 적용(중복 로직 제거).  
2) Riders 루트의 N+1 정리(join/batch), phone 검색 정규화.  
3) Promotions/Lease/Loans에서 serviceSupabase 의존을 RLS로 축소.  
4) Public 경로 보호(CAPTCHA/Rate limit), 필요 시 내부용으로 한정.  
5) 로깅/테스트(단위+통합) 추가, 문서 업데이트.
