# 코드 리뷰 메모 (admin-v2)

## 범위
- Next.js 15 기반 관리자/라이더 페이지 (`src/app` 전반)
- Supabase API 라우트 (`src/app/api/*`)

## 주요 문제점 (시급)
1) API 무보호 + 서비스 롤 키 사용  
- `middleware.ts`에서 `api` 경로를 제외해 인증이 전혀 걸리지 않음(`matcher`에 api 미포함).  
- 여러 API가 `SUPABASE_SERVICE_ROLE_KEY`로 직접 접근하며 인증/인가 체크 없음:  
  - `src/app/api/branches/route.ts` (GET/POST)  
  - `src/app/api/branch-riders/route.ts`  
  - `src/app/api/business-entities/route.ts` (GET/POST)  
  - `src/app/api/promotions/route.ts`  
  - `src/app/api/lease-rentals/route.ts`  
  - `src/app/api/loans/route.ts`  
- 결과: 외부에서 쿠키 없이도 CRUD 가능 → 데이터 유출/변조, RLS 무력화.

2) 인증/세션 API 부재로 UI 동작 불가  
- 로그인 페이지가 `/api/auth/login`, `/api/auth/login-rider`를 호출하지만 라우트 없음.  
- `AdminLayoutClient`는 `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`을 호출하나 미구현 → 세션 타이머 오류/무한 리다이렉트 가능.

3) 존재하지 않는 라이더/정산 API 호출  
- `src/app/(admin)/riders/page.tsx`는 `/api/riders/:id` PATCH/DELETE를 호출하지만 라우트 없음.  
- `src/app/(admin)/settlement-requests/page.tsx`는 `/api/rider/settlement-requests`, `/api/riders/:id/settlement-request` 호출 미구현.  
- `src/app/rider/page.tsx`는 `/api/rider/me`, `/api/rider/settlement-request` 등을 호출하지만 없어서 전부 실패.

4) 권한 우회 취약점  
- `branches`/`branch-riders` GET에서 `adminId` 쿼리 파라미터를 신뢰해서 다른 관리자 소유 데이터 열람 가능 (`src/app/api/branches/route.ts` lines ~20-39).  
- 인증 없이 서비스 롤 insert: `branches` POST, `business-entities` POST, `loans` POST 등 → 아무나 데이터 생성 가능.

5) 성능 문제: 라이더 N+1 쿼리  
- `src/app/api/riders/route.ts`에서 라이더별로 `rider_new_branches`, `vehicle_assignments`를 개별 조회 → 라이더 수 증가 시 급격히 느려짐. Join 또는 id 리스트 기반 batch 조회 필요.

6) 포맷터/유틸 중복  
- 휴대폰 포맷 함수가 여러 페이지에 중복/미세 상이(`riders/page.tsx`, `settlement-requests/page.tsx`, `rider/page.tsx`). 공용 유틸로 통합 필요.

## 잘한 점
- 로딩/에러/빈 상태 UI를 명확히 분리하고 일관된 스타일 사용 (`riders`, `business-entities` 등).  
- 세션 타이머, 다크모드 토글 등 사용자 경험에 신경 쓴 레이아웃 구현(`AdminLayoutClient`).  
- 입력값 기본 검증과 포맷터(`src/lib/accountFormat.ts`)가 정리되어 있음.  
- `useEffect` 취소 플래그로 언마운트 후 state 업데이트를 방지하는 패턴 사용.

## 개선 우선순위 제안
1) 보안
   - `middleware.ts` matcher에 `api` 포함해 기본 인증 강제.  
   - 모든 API에서 `SUPABASE_SERVICE_ROLE_KEY` 제거 → 인증된 사용자 토큰을 검증하고 RLS가 적용된 anon 키 사용. 서비스 롤 키는 서버 내 백엔드 관리용에 한정.  
   - `adminId` 등 외부 입력으로 소유자 결정하지 말고, 토큰에서 얻은 사용자 ID만 사용하여 필터링.  
   - POST/PATCH/DELETE는 `created_by` 등 서버에서 강제 세팅하고 미인증 시 401/403 반환.

2) 기능 복구
   - `/api/auth/login`, `/api/auth/login-rider`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout` 구현 또는 UI 버튼/호출 비활성화.  
   - `/api/riders/:id`(PATCH/DELETE), `/api/rider/settlement-requests`, `/api/riders/:id/settlement-request`, `/api/rider/me`, `/api/rider/settlement-request` 라우트 구현 또는 UI 비활성화/가드 추가.

3) 성능/품질
   - `api/riders`의 N+1 쿼리를 Supabase `select` join 또는 id 리스트 batch로 변경.  
   - 휴대폰 포맷터 등 공용 유틸을 `src/lib`로 통합하여 일관성 확보.  
   - 입력 validation/에러 메시지 통일, 중복 컴포넌트 패턴 정리.

4) 추가 제안
   - RLS 정책 점검/추가(특히 branch/rider/loan 관련 테이블).  
   - 관리자/라이더 토큰 만료 시 UI 가드: API 에러 시 즉시 로그인으로 리다이렉트하도록 공통 fetch 래퍼 도입.  
   - 알림/토스트 패턴 통합으로 사용자 피드백 일관성 유지.

## 빠른 액션 체크리스트
- [ ] `middleware`에서 `api` 보호 켜기.  
- [ ] 인증 필수 + anon 키 사용으로 모든 API 수정, 서비스 롤 키 사용 제거.  
- [ ] auth/라이더/정산 관련 누락된 API 구현 또는 UI 비활성화.  
- [ ] `adminId` 쿼리 신뢰 제거, 토큰 기반 owner 확인.  
- [ ] `api/riders` N+1 제거(조인/배치).  
- [ ] 공용 포맷터/유틸로 중복 제거.
