import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type NormalizedConfig =
  | {
      // excess
      threshold: number | null;
      amountPerExcess: number | null;
      cap?: number | null;
      description?: string;
    }
  | {
      // milestone
      milestones: { threshold: string; amount: string }[];
      description?: string;
    }
  | {
      // milestone_per_unit
      milestonePerUnit: {
        threshold: number | null;
        unitSize: number | null;
        unitAmount: number | null;
      }[];
      description?: string;
    }
  | Record<string, any>;

export async function GET(
  _request: Request,
  { params }: { params: { promotionId: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-v2/promotion detail] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const promotionId = params.promotionId;

  try {
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("id", promotionId)
      .maybeSingle();

    if (error) {
      console.error("[admin-v2/promotion detail] Supabase error:", error);
      return NextResponse.json(
        { error: "프로모션 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "해당 프로모션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const row: any = { ...data };
    const cfg = (row.config ?? {}) as any;

    // type/status fallbacks
    if (row.type == null && row.promotion_type != null) {
      row.type = row.promotion_type;
    }
    if (row.status == null && row.is_active != null) {
      row.status = row.is_active ? "ACTIVE" : "INACTIVE";
    }

    // Resolve type based on config when ambiguous (milestone_per_unit stored as milestone + milestonePerUnit)
    const hasPerUnit =
      Array.isArray(cfg?.milestonePerUnit) && cfg.milestonePerUnit.length > 0;
    if (
      (row.type === "milestone" || row.promotion_type === "milestone") &&
      hasPerUnit
    ) {
      row.type = "milestone_per_unit";
    }

    // Normalize config per type to a stable shape expected by UI
    const norm: any = {};

    if (row.type === "excess") {
      const src = cfg.excess || cfg;
      const amt =
        src.amountPerExcess ??
        src.amount ??
        src.amount_per_excess ??
        src.excess_amount;
      norm.threshold = src.threshold ?? src.base_count ?? null;
      norm.amountPerExcess = amt ?? null;
      if (src.cap != null) norm.cap = src.cap;
    } else if (row.type === "milestone") {
      const srcTop: any =
        cfg.milestones ?? cfg.milestone ?? cfg.tiers ?? cfg.levels ?? [];
      const list: any[] = Array.isArray(srcTop)
        ? srcTop
        : Array.isArray(srcTop?.tiers)
          ? srcTop.tiers
          : Array.isArray(srcTop?.levels)
            ? srcTop.levels
            : [];

      const coalesceStr = (...vals: any[]) => {
        for (const v of vals) {
          if (v !== undefined && v !== null) return String(v);
        }
        return "";
      };

      norm.milestones = list.map((t: any) => ({
        threshold: coalesceStr(
          t.threshold,
          t.targetCount,
          t.target_count,
          t.count,
          t.base_count
        ),
        amount: coalesceStr(
          t.amount,
          t.rewardAmount,
          t.reward_amount,
          t.value
        ),
      }));
    } else if (row.type === "milestone_per_unit") {
      const arr = Array.isArray(cfg.milestonePerUnit)
        ? cfg.milestonePerUnit
        : [];
      norm.milestonePerUnit = arr.map((x: any) => ({
        threshold: x.threshold ?? x.start ?? null,
        unitSize: x.unitSize ?? x.size ?? null,
        unitAmount: x.unitAmount ?? x.amount ?? null,
      }));
    } else {
      Object.assign(norm, cfg);
    }

    if (cfg.description != null) {
      norm.description = cfg.description;
      row.description = cfg.description;
    }

    // Common optional fields
    if (cfg.startDate != null) {
      norm.startDate = cfg.startDate;
    }
    if (cfg.endDate != null) {
      norm.endDate = cfg.endDate;
    }
    if (cfg.peakPrecondition != null) {
      norm.peakPrecondition = cfg.peakPrecondition;
    }

    row.config = norm as NormalizedConfig;

    // Assignments (selected branches)
    const { data: assigns, error: assignsError } = await supabase
      .from("promotion_branch_assignments")
      .select(
        "promotion_id, branch_id, is_active, start_date, end_date, priority_order, new_branches(id, display_name, branch_name, platform, province, district)"
      )
      .eq("promotion_id", promotionId)
      .order("priority_order", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (assignsError) {
      console.error(
        "[admin-v2/promotion detail] assignments error:",
        assignsError
      );
      return NextResponse.json(
        { error: "프로모션 배정 지사를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const assignmentsRaw = (assigns || []) as any[];

    const branchIds = Array.from(
      new Set(assignmentsRaw.map((a) => String(a.branch_id)))
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
          (ents || []).map((e: any) => [String(e.id), String(e.name)])
        );
      }

      affByBranch = Object.fromEntries(
        (affs || []).map((a: any) => [
          String(a.branch_id),
          {
            corporate_entity_id: a.corporate_entity_id as string | null,
            personal_entity_id: a.personal_entity_id as string | null,
          },
        ])
      );
    }

    const assignments =
      assignmentsRaw.map((a: any) => {
        const nb = a.new_branches || {};
        const base =
          nb.display_name ||
          nb.branch_name ||
          [nb.province, nb.district].filter(Boolean).join(" ") ||
          a.branch_id;

        const aff = affByBranch[String(a.branch_id)];

        const platRaw = String(nb.platform || "").toLowerCase();
        const platMark =
          platRaw === "coupang" ? "[C]" : platRaw === "baemin" ? "[B]" : "";

        let owner = "";
        if (aff && (aff.corporate_entity_id || aff.personal_entity_id)) {
          const corpName = aff.corporate_entity_id
            ? entityNameById[aff.corporate_entity_id] || ""
            : "";
          const perName = aff.personal_entity_id
            ? entityNameById[aff.personal_entity_id] || ""
            : "";
          owner =
            corpName && perName ? `${corpName}>${perName}` : corpName || perName;
        }

        const name = `${platMark ? platMark + " " : ""}${
          owner ? owner + " - " : ""
        }${base}`.trim();

        return {
          id: String(a.branch_id),
          branch_id: String(a.branch_id),
          name,
          active: !!a.is_active,
        };
      }) ?? [];

    // Flat branch list for pickers
    const { data: bs, error: branchesError } = await supabase
      .from("new_branches")
      .select("id, display_name, branch_name, province, district, platform")
      .order("province", { ascending: true })
      .order("district", { ascending: true });

    if (branchesError) {
      console.error(
        "[admin-v2/promotion detail] branches error:",
        branchesError
      );
      return NextResponse.json(
        { error: "지사 목록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const branchesRaw = (bs || []) as any[];

    // 지사별 소속(법인/개인) 정보 조회
    const branchIdsForList = Array.from(
      new Set(branchesRaw.map((b) => String(b.id)))
    );

    let affByBranchList: Record<
      string,
      { corporate_entity_id?: string | null; personal_entity_id?: string | null }
    > = {};
    let entityNameByIdList: Record<string, string> = {};

    if (branchIdsForList.length > 0) {
      const { data: affs } = await supabase
        .from("branch_affiliations")
        .select("branch_id, corporate_entity_id, personal_entity_id")
        .in("branch_id", branchIdsForList);

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
        entityNameByIdList = Object.fromEntries(
          (ents || []).map((e: any) => [String(e.id), String(e.name)])
        );
      }

      affByBranchList = Object.fromEntries(
        (affs || []).map((a: any) => [
          String(a.branch_id),
          {
            corporate_entity_id: a.corporate_entity_id as string | null,
            personal_entity_id: a.personal_entity_id as string | null,
          },
        ])
      );
    }

    const branches =
      branchesRaw.map((b: any) => {
        const id = String(b.id);
        const aff = affByBranchList[id];
        const corpName =
          aff?.corporate_entity_id != null
            ? entityNameByIdList[aff.corporate_entity_id] || ""
            : "";
        const perName =
          aff?.personal_entity_id != null
            ? entityNameByIdList[aff.personal_entity_id] || ""
            : "";

        return {
          id,
          name: b.display_name || b.branch_name || id,
          province: b.province || "",
          district: b.district || "",
          platform: b.platform || "",
          corporateName: corpName || undefined,
          personalName: perName || undefined,
        };
      }) ?? [];

    return NextResponse.json({
      promotion: row,
      assignments,
      branches,
    });
  } catch (e) {
    console.error("[admin-v2/promotion detail] Unexpected error:", e);
    return NextResponse.json(
      { error: "프로모션 정보를 불러오는 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { promotionId: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-v2/promotion PATCH] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const promotionId = params.promotionId;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  const updates: any = {};
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.type !== undefined) updates.type = body.type;
  if (body.status !== undefined) updates.status = body.status;
  if (body.config !== undefined) updates.config = body.config;

  if (updates.name) {
    const { data: exists } = await supabase
      .from("promotions")
      .select("id")
      .ilike("name", updates.name)
      .neq("id", promotionId)
      .maybeSingle();
    if (exists) {
      return NextResponse.json(
        { error: "이미 존재하는 프로모션명입니다." },
        { status: 409 }
      );
    }
  }

  try {
    const { data, error } = await supabase
      .from("promotions")
      .update(updates)
      .eq("id", promotionId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[admin-v2/promotion PATCH] Supabase error:", error);
      return NextResponse.json(
        { error: "프로모션 정보를 수정하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, promotion: data });
  } catch (e) {
    console.error("[admin-v2/promotion PATCH] Unexpected error:", e);
    return NextResponse.json(
      { error: "프로모션 정보를 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { promotionId: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-v2/promotion DELETE] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const promotionId = params.promotionId;

  try {
    const { data, error } = await supabase
      .from("promotions")
      .delete()
      .eq("id", promotionId)
      .select("id");

    if (error) {
      console.error("[admin-v2/promotion DELETE] Supabase error:", error);
      return NextResponse.json(
        {
          error:
            "프로모션을 삭제하지 못했습니다. 연결된 데이터가 있을 수 있습니다.",
        },
        { status: 400 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "이미 삭제되었거나 존재하지 않는 프로모션입니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin-v2/promotion DELETE] Unexpected error:", e);
    return NextResponse.json(
      { error: "프로모션을 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
