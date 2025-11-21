# Supabase 테이블 사용 현황 (코드 기준)
> 실제 DB에 접속하지 못하는 환경이므로 **코드에서 참조한 테이블/뷰**를 기준으로 정리했습니다. 이 목록에 없는 테이블이 DB에 있다면 불필요하거나 레거시일 가능성이 높으니 점검/삭제 후보로 보시면 됩니다.

## 주요 도메인별 사용 테이블
- **지사/사업자**
  - `new_branches`, `new_branches_with_stats`(뷰), `branch_affiliations`, `branch_settlement_policies`
  - `business_entities`
- **라이더**
  - `riders`, `rider_new_branches`, `rider_settlement_requests`, `registration_links`
- **프로모션**
  - `promotions`, `promotion_branch_assignments`
- **리스/렌탈**
  - `vehicles`, `vehicle_assignments`
- **대여금/정산**
  - `rider_loans`, `rider_loan_summaries`, `rider_loan_payments`
- **기타 사용 RPC**
  - `get_riders_for_admin`, `register_rider_with_new_branches`

## 코드별 테이블 접근 요약
- `src/app/api/branches*`: `new_branches`, `new_branches_with_stats`, `branch_affiliations`, `branch_settlement_policies`, `business_entities`
- `src/app/api/business-entities*`: `business_entities`, `branch_affiliations`, `rider_new_branches`
- `src/app/api/riders/route.ts`: `get_riders_for_admin` RPC, `rider_new_branches`, `vehicle_assignments`
- `src/app/api/riders/[riderId]/route.ts`: `get_riders_for_admin`, `rider_new_branches`, `new_branches`, `riders`, `vehicle_assignments`
- `src/app/api/rider/me/route.ts`: `riders`, `rider_new_branches`
- `src/app/api/rider/settlement-request*`: `riders`, `rider_settlement_requests`
- `src/app/api/rider/settlement-requests`: `rider_settlement_requests`
- `src/app/api/branch-riders`: `new_branches`, `rider_new_branches`, `vehicles`, `rider_loans`
- `src/app/api/lease-rentals*`: `vehicles`, `vehicle_assignments`
- `src/app/api/promotions*`: `promotions`, `promotion_branch_assignments`, `new_branches`, `branch_affiliations`, `business_entities`
- `src/app/api/loans*`: `rider_loan_summaries`, `rider_loans`, `rider_loan_payments`, `riders`, `branch_affiliations`
- `src/app/api/public/riders`: `registration_links`, `new_branches`, `register_rider_with_new_branches` RPC

## 불필요 테이블 판별 가이드
1. **화이트리스트 비교**  
   - 위 목록에 없는 테이블/뷰가 실제 DB에 있다면 우선 “사용 여부 미확인”으로 분류 후 삭제 후보로 검토.
2. **액세스 추적**  
   - Supabase SQL 콘솔에서 최근 30/90일 액세스 로그로 조회량 0인 테이블을 찾고, 백오피스/배포 코드에서 참조하지 않는다면 삭제 후보.
3. **네이밍 중복 확인**  
   - `branches`, `rider_branches`, `rider_settlements` 등 비슷한 이름의 과거 테이블이 있다면 레거시 가능성 높음. 현재 코드는 `new_branches`, `rider_new_branches`, `rider_settlement_requests`만 사용.
4. **뷰 검증**  
   - `new_branches_with_stats` 외 다른 통계/머티리얼라이즈드 뷰가 있다면 코드 사용 여부 확인 후 필요 시 제거 또는 주기 점검.

## 권장 SQL(관리자 콘솔)
```sql
-- 코드 기준 화이트리스트
with used(name) as (
  values
    ('new_branches'), ('new_branches_with_stats'),
    ('branch_affiliations'), ('branch_settlement_policies'),
    ('business_entities'),
    ('riders'), ('rider_new_branches'), ('rider_settlement_requests'),
    ('registration_links'),
    ('promotions'), ('promotion_branch_assignments'),
    ('vehicles'), ('vehicle_assignments'),
    ('rider_loans'), ('rider_loan_summaries'), ('rider_loan_payments')
)
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_type in ('BASE TABLE','VIEW')
  and table_name not in (select name from used)
order by table_name;
```
- 결과에 나오는 항목은 코드에서 참조하지 않는 테이블/뷰이므로 백업 후 삭제 여부를 검토하세요.

## 요약
- 현재 코드가 사용하는 테이블은 위 화이트리스트가 전부입니다.  
- DB에 이 외의 테이블/뷰가 있다면 레거시/불필요 가능성이 높으니 백업 → 사용 여부 확인 → 삭제 순으로 정리하는 것을 권장합니다.  
- 실제 삭제 전에는 RLS/트리거/뷰 의존성을 함께 점검하세요.
