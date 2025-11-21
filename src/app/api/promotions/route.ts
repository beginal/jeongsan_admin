import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

type AdminPromotionRow = {
  id: string;
  name: string;
  type: string;
  status: "active" | "scheduled" | "ended";
  config?: any;
  startDate?: string | null;
  endDate?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  branches: {
    branchId: string;
    name: string;
    active: boolean;
    startDate?: string | null;
    endDate?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }[];
};

type AssignmentRow = {
  branchId: string;
  name: string;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
};

export async function GET() {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;

  try {
    // 프로모션 + 배정 지사를 한 번에 조회 (테이블 기준)
    const { data: promotionsData, error: promotionsError } = await supabase
      .from("promotions")
      .select(
        `
        id,
        name,
        type,
        status,
        config,
        start_date,
        end_date,
        promotion_branch_assignments(
          branch_id,
          is_active,
          start_date,
          end_date,
          new_branches (
            id,
            display_name,
            branch_name,
            province,
            district,
            platform
          )
        )
      `
      )
      .order("updated_at", { ascending: false });

    if (promotionsError) {
      console.error("[admin-v2/promotions] promotions fetch error:", promotionsError);
      return NextResponse.json(
        { error: "프로모션 데이터를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows: AdminPromotionRow[] = (promotionsData || []).map((p) => {
      const assignmentsRaw = Array.isArray((p as any).promotion_branch_assignments)
        ? (p as any).promotion_branch_assignments
        : [];

      const assignments: AssignmentRow[] = assignmentsRaw.map((a: any) => {
        const nb = a.new_branches || {};
        const baseLabel =
          nb.display_name ||
          nb.branch_name ||
          [nb.province, nb.district].filter(Boolean).join(" ") ||
          a.branch_id;

        const plat = String(nb.platform || "").toLowerCase();
        const platMark =
          plat === "coupang" ? "[C]" : plat === "baemin" ? "[B]" : "";

        const name = `${platMark ? platMark + " " : ""}${baseLabel}`.trim();

        let active = !!a.is_active && String(p.status || "").toUpperCase() === "ACTIVE";
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

        return {
          branchId: String(a.branch_id),
          name,
          active,
          startDate: a.start_date ? String(a.start_date) : null,
          endDate: a.end_date ? String(a.end_date) : null,
          start_date: a.start_date ? String(a.start_date) : null,
          end_date: a.end_date ? String(a.end_date) : null,
        };
      });

      const hasActive: boolean = assignments.some((a: AssignmentRow) => !!a.active);
      const hasFuture: boolean = assignments.some((a: AssignmentRow) => {
        if (!a.startDate) return false;
        const st = new Date(a.startDate);
        st.setHours(0, 0, 0, 0);
        return st > today;
      });

      let status: AdminPromotionRow["status"] = "ended";
      if (hasActive) status = "active";
      else if (hasFuture) status = "scheduled";

      return {
        id: String(p.id),
        name: (p as any).name || "",
        type: (p as any).type || "",
        status,
        config: (p as any).config ?? null,
        startDate: (p as any).start_date ? String((p as any).start_date) : null,
        endDate: (p as any).end_date ? String((p as any).end_date) : null,
        start_date: (p as any).start_date ? String((p as any).start_date) : null,
        end_date: (p as any).end_date ? String((p as any).end_date) : null,
        branches: assignments,
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
