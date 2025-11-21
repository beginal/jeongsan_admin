import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.error("[admin-v2/business-entities] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.supabase;
  const userId = auth.user.id;

  try {
    // 1) 기본 사업자 목록
    const { data: entities, error: entitiesError } = await supabase
      .from("business_entities")
      .select("id, name, type, parent_entity_id, registration_number_enc")
      .eq("created_by", userId)
      .order("name", { ascending: true });

    if (entitiesError) {
      const msg = String(entitiesError.message || "");
      if (msg.includes("created_by") || msg.toLowerCase().includes("column") && msg.toLowerCase().includes("created_by")) {
        return NextResponse.json({ entities: [], total: 0 });
      }
      console.error(
        "[admin-v2/business-entities] entities error:",
        entitiesError
      );
      return NextResponse.json(
        { error: "사업자 데이터를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const base = entities || [];
    const entityIds = base.map((e: any) => e.id as string);

    // 기본값: 지사/라이더 수 0으로 초기화
    const branchCountByEntity: Record<string, number> = {};
    const riderIdsByEntity: Record<string, Set<string>> = {};
    entityIds.forEach((id) => {
      branchCountByEntity[id] = 0;
      riderIdsByEntity[id] = new Set<string>();
    });

    if (entityIds.length > 0) {
      // 2) 각 사업자에 연결된 지사 목록
      const branchIdsByEntity: Record<string, Set<string>> = {};
      entityIds.forEach((id) => {
        branchIdsByEntity[id] = new Set<string>();
      });

      const allBranchIds = new Set<string>();

      // corporate 기준 지사
      const { data: affsCorp, error: affsCorpError } = await supabase
        .from("branch_affiliations")
        .select("branch_id, corporate_entity_id")
        .in("corporate_entity_id", entityIds);

      if (affsCorpError) {
        console.error(
          "[admin-v2/business-entities] affiliations (corp) error:",
          affsCorpError
        );
      } else if (affsCorp && affsCorp.length > 0) {
        for (const row of affsCorp as any[]) {
          const branchId = String(row.branch_id);
          const corpId = row.corporate_entity_id
            ? String(row.corporate_entity_id)
            : null;
          if (!branchId || !corpId) continue;
          if (branchIdsByEntity[corpId]) {
            branchIdsByEntity[corpId].add(branchId);
          }
          allBranchIds.add(branchId);
        }
      }

      // personal 기준 지사
      const { data: affsPers, error: affsPersError } = await supabase
        .from("branch_affiliations")
        .select("branch_id, personal_entity_id")
        .in("personal_entity_id", entityIds);

      if (affsPersError) {
        console.error(
          "[admin-v2/business-entities] affiliations (personal) error:",
          affsPersError
        );
      } else if (affsPers && affsPers.length > 0) {
        for (const row of affsPers as any[]) {
          const branchId = String(row.branch_id);
          const personalId = row.personal_entity_id
            ? String(row.personal_entity_id)
            : null;
          if (!branchId || !personalId) continue;
          if (branchIdsByEntity[personalId]) {
            branchIdsByEntity[personalId].add(branchId);
          }
          allBranchIds.add(branchId);
        }
      }

      Object.entries(branchIdsByEntity).forEach(([entityId, set]) => {
        branchCountByEntity[entityId] = set.size;
      });

      // 지사 소유자 필터링 (다른 관리자의 지사가 섞이는 것 방지)
      let ownedBranchIds: Set<string> = new Set();
      if (allBranchIds.size > 0) {
        const branchIdList = Array.from(allBranchIds);
        const { data: ownedBranches } = await supabase
          .from("new_branches")
          .select("id")
          .in("id", branchIdList)
          .eq("created_by", userId);
        ownedBranchIds = new Set((ownedBranches || []).map((b: any) => String(b.id)));

        // 소유하지 않은 지사는 제외
        Object.keys(branchIdsByEntity).forEach((entityId) => {
          const filtered = Array.from(branchIdsByEntity[entityId]).filter((id) =>
            ownedBranchIds.has(id)
          );
          branchIdsByEntity[entityId] = new Set(filtered);
          branchCountByEntity[entityId] = filtered.length;
        });
      }

      // 3) 각 지사에 연결된 활성 라이더 목록 (소유 지사만)
      if (ownedBranchIds.size > 0) {
        const branchIdList = Array.from(ownedBranchIds);
        const { data: rnb, error: rnbError } = await supabase
          .from("rider_new_branches")
          .select("new_branch_id, rider_id, status")
          .in("new_branch_id", branchIdList)
          .eq("status", "active");

        if (rnbError) {
          console.error(
            "[admin-v2/business-entities] rider_new_branches error:",
            rnbError
          );
        } else if (rnb && rnb.length > 0) {
          const ridersByBranch: Record<string, Set<string>> = {};
          branchIdList.forEach((id) => {
            ridersByBranch[id] = new Set<string>();
          });

          for (const row of rnb as any[]) {
            const bId = String(row.new_branch_id);
            const riderId = String(row.rider_id);
            if (!bId || !riderId) continue;
            if (!ridersByBranch[bId]) {
              ridersByBranch[bId] = new Set<string>();
            }
            ridersByBranch[bId].add(riderId);
          }

          // 4) 각 사업자별 라이더 수 집계 (지사별 라이더의 합집합)
          Object.entries(branchCountByEntity).forEach(([entityId]) => {
            const branchIds = Array.from(
              (branchIdsByEntity[entityId] as Set<string>) || new Set()
            );

            const riderSet =
              riderIdsByEntity[entityId] || new Set<string>();
            branchIds.forEach((bId) => {
              const riders = ridersByBranch[bId];
              if (riders) {
                riders.forEach((rid) => riderSet.add(rid));
              }
            });
            riderIdsByEntity[entityId] = riderSet;
          });
        }
      }
    }

    const result = base.map((e: any) => {
      const id = String(e.id);
      return {
        id,
        name: e.name as string,
        type: e.type as string,
        parent_entity_id: e.parent_entity_id,
        registration_number_enc: e.registration_number_enc || null,
        branch_count: branchCountByEntity[id] ?? 0,
        rider_count: (riderIdsByEntity[id]?.size as number) ?? 0,
      };
    });

    return NextResponse.json({
      entities: result,
      total: result.length,
    });
  } catch (e) {
    console.error(
      "[admin-v2/business-entities] Unexpected error:",
      e
    );
    return NextResponse.json(
      { error: "사업자 데이터를 불러오는 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.error("[admin-v2/business-entities POST] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.supabase;
  const userId = auth.user.id;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type =
    typeof body.type === "string"
      ? body.type.toUpperCase()
      : "";
  const registrationNumber =
    typeof body.registrationNumber === "string"
      ? body.registrationNumber.trim()
      : "";
  const parentEntityId =
    typeof body.parentEntityId === "string" && body.parentEntityId
      ? body.parentEntityId
      : null;

  if (!name || (type !== "CORPORATE" && type !== "PERSONAL")) {
    return NextResponse.json(
      { error: "사업자명과 유형은 필수입니다." },
      { status: 400 }
    );
  }

  const payload: any = {
    name,
    type,
    parent_entity_id: type === "PERSONAL" ? parentEntityId : null,
    registration_number_enc: registrationNumber || null,
    created_by: userId,
  };

  try {
    const { data, error } = await supabase
      .from("business_entities")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error(
        "[admin-v2/business-entities POST] Supabase error:",
        error
      );
      return NextResponse.json(
        { error: "사업자를 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error(
      "[admin-v2/business-entities POST] Unexpected error:",
      e
    );
    return NextResponse.json(
      { error: "사업자를 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
