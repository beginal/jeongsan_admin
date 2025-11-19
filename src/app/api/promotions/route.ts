import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AdminPromotionRow = {
  id: string;
  name: string;
  type: string;
  status: "active" | "scheduled" | "ended";
  branches: {
    branchId: string;
    name: string;
    active: boolean;
  }[];
};

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-v2/promotions] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1) 기본 프로모션 목록 (새 스키마 뷰 기준)
    const { data: baseData, error: baseError } = await supabase
      .from("promotions_with_stats")
      .select("id, name, type, status, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (baseError) {
      console.error("[admin-v2/promotions] promotions_with_stats error:", baseError);
      return NextResponse.json(
        { error: "프로모션 데이터를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const promotionsRaw = (baseData || []) as any[];
    const promotionIds = promotionsRaw.map((p) => p.id as string);

    // 2) 프로모션별 배정 지사 로드 (promotion_branch_assignments + new_branches)
    const assignmentsById: Record<
      string,
      {
        branchId: string;
        name: string;
        active: boolean;
        startDate: string | null;
        endDate: string | null;
      }[]
    > = {};

    if (promotionIds.length > 0) {
      const { data: assigns, error: assignsError } = await supabase
        .from("promotion_branch_assignments")
        .select(
          "promotion_id, branch_id, is_active, start_date, end_date, promotions(status), new_branches(id, display_name, branch_name, province, district, platform)"
        )
        .in("promotion_id", promotionIds);

      if (assignsError) {
        console.error(
          "[admin-v2/promotions] promotion_branch_assignments error:",
          assignsError
        );
      } else if (assigns && assigns.length > 0) {
        // 지사 소속/사업자 이름까지 붙여서 라벨 구성 (기존 API 로직과 동일한 스타일)
        const branchIds = Array.from(
          new Set((assigns as any[]).map((a) => a.branch_id as string))
        );

        let affByBranch: Record<
          string,
          { corporate_entity_id?: string | null; personal_entity_id?: string | null }
        > = {};
        let entityNameById: Record<string, string> = {};

        if (branchIds.length > 0) {
          const { data: affs } = await supabase
            .from("branch_affiliations")
            .select("branch_id, corporate_entity_id, personal_entity_id")
            .in("branch_id", branchIds);

          const entityIds = Array.from(
            new Set(
              (affs || [])
                .flatMap((a: any) => [a.corporate_entity_id, a.personal_entity_id])
                .filter(Boolean) as string[]
            )
          );

          if (entityIds.length > 0) {
            const { data: ents } = await supabase
              .from("business_entities")
              .select("id, name")
              .in("id", entityIds);
            entityNameById = Object.fromEntries(
              (ents || []).map((e: any) => [e.id as string, e.name as string])
            );
          }

          affByBranch = Object.fromEntries(
            (affs || []).map((a: any) => [
              a.branch_id as string,
              {
                corporate_entity_id: a.corporate_entity_id as string | null,
                personal_entity_id: a.personal_entity_id as string | null,
              },
            ])
          );
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const a of assigns as any[]) {
          const nb = a.new_branches || {};
          const baseLabel =
            nb.display_name ||
            nb.branch_name ||
            [nb.province, nb.district].filter(Boolean).join(" ") ||
            a.branch_id;

          const aff = affByBranch[a.branch_id as string];

          const plat = String(nb.platform || "").toLowerCase();
          const platMark =
            plat === "coupang" ? "[C]" : plat === "baemin" ? "[B]" : "";

          let owner = "";
          if (aff && (aff.corporate_entity_id || aff.personal_entity_id)) {
            const corpName = aff.corporate_entity_id
              ? entityNameById[aff.corporate_entity_id] || ""
              : "";
            const perName = aff.personal_entity_id
              ? entityNameById[aff.personal_entity_id] || ""
              : "";
            owner =
              corpName && perName
                ? `${corpName}>${perName}`
                : corpName || perName;
          }

          const name = `${platMark} ${owner ? owner + "-" : ""}${baseLabel}`.trim();

          let active =
            !!a.is_active &&
            ((a.promotions?.status || "INACTIVE") === "ACTIVE");

          if (active && a.start_date) {
            const st = new Date(a.start_date as string);
            st.setHours(0, 0, 0, 0);
            if (today < st) active = false;
          }
          if (active && a.end_date) {
            const ed = new Date(a.end_date as string);
            ed.setHours(23, 59, 59, 999);
            if (today > ed) active = false;
          }

          const entry = {
            branchId: String(a.branch_id),
            name,
            active,
            startDate: a.start_date ? String(a.start_date) : null,
            endDate: a.end_date ? String(a.end_date) : null,
          };

          (assignmentsById[a.promotion_id as string] =
            assignmentsById[a.promotion_id as string] || []).push(entry);
        }
      }
    }

    // 3) 프로모션별 상태(진행 중 / 예정 / 종료) 계산
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows: AdminPromotionRow[] = promotionsRaw.map((p) => {
      const pid = String(p.id);
      const assignments = assignmentsById[pid] || [];

      const hasActive = assignments.some((a) => a.active);
      const hasFuture = assignments.some((a) => {
        if (!a.startDate) return false;
        const st = new Date(a.startDate);
        st.setHours(0, 0, 0, 0);
        return st > today;
      });

      let status: AdminPromotionRow["status"] = "ended";
      if (hasActive) {
        status = "active";
      } else if (hasFuture) {
        status = "scheduled";
      }

      return {
        id: pid,
        name: (p.name as string) || "",
        type: (p.type as string) || "",
        status,
        branches: assignments.map((a) => ({
          branchId: a.branchId,
          name: a.name,
          active: a.active,
        })),
      };
    });

    return NextResponse.json({
      promotions: rows,
      total: rows.length,
    });
  } catch (e) {
    console.error("[admin-v2/promotions] Unexpected error:", e);
    return NextResponse.json(
      { error: "프로모션 데이터를 불러오는 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
