import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: { entityId: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[admin-v2/business-entities branches POST] Supabase env not set"
    );
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  const branchId =
    typeof body.branchId === "string" ? body.branchId : null;
  const force = !!body.force;

  if (!branchId) {
    return NextResponse.json(
      { error: "branchId가 필요합니다." },
      { status: 400 }
    );
  }

  const entityId = params.entityId;

  // 대상 사업자 유형 조회
  const { data: entity, error: entityError } = await supabase
    .from("business_entities")
    .select("id, name, type")
    .eq("id", entityId)
    .maybeSingle();

  if (entityError) {
    console.error(
      "[admin-v2/business-entities branches POST] entity load error:",
      entityError
    );
    return NextResponse.json(
      { error: "사업자 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  if (!entity) {
    return NextResponse.json(
      { error: "해당 사업자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const type = String(entity.type || "").toUpperCase();
  const isCorporate = type === "CORPORATE";
  const column = isCorporate ? "corporate_entity_id" : "personal_entity_id";

  // 지사 소속 정보 조회
  const { data: aff, error: affError } = await supabase
    .from("branch_affiliations")
    .select("branch_id, corporate_entity_id, personal_entity_id")
    .eq("branch_id", branchId)
    .maybeSingle();

  if (affError) {
    console.error(
      "[admin-v2/business-entities branches POST] affiliation load error:",
      affError
    );
    return NextResponse.json(
      { error: "지사 소속 정보를 확인하지 못했습니다." },
      { status: 500 }
    );
  }

  // 현재 이 컬럼에 설정된 사업자 확인
  const currentEntityId =
    aff && column in aff && (aff as any)[column]
      ? String((aff as any)[column])
      : null;

  if (currentEntityId && currentEntityId === entityId) {
    // 이미 같은 사업자로 설정됨
    return NextResponse.json({ ok: true });
  }

  if (currentEntityId && currentEntityId !== entityId && !force) {
    // 현재 연결된 사업자 이름 조회
    const { data: currentEntity } = await supabase
      .from("business_entities")
      .select("name")
      .eq("id", currentEntityId)
      .maybeSingle();

    const currentName = currentEntity?.name || "다른 사업자";
    const message = `이미 "${currentName}"로 설정되어 있습니다. 변경하시겠습니까?`;

    return NextResponse.json(
      {
        error: message,
        currentEntityName: currentName,
      },
      { status: 409 }
    );
  }

  // 소속 업데이트 또는 생성
  try {
    if (!aff) {
      // affiliation row가 없으면 새로 생성
      const insertPayload: any = {
        branch_id: branchId,
        corporate_entity_id: null,
        personal_entity_id: null,
      };
      insertPayload[column] = entityId;

      const { error: insertError } = await supabase
        .from("branch_affiliations")
        .insert(insertPayload);

      if (insertError) {
        console.error(
          "[admin-v2/business-entities branches POST] affiliation insert error:",
          insertError
        );
        return NextResponse.json(
          { error: "지사 소속을 추가하지 못했습니다." },
          { status: 500 }
        );
      }
    } else {
      // 기존 row 업데이트
      const updatePayload: any = {};
      updatePayload[column] = entityId;

      const { error: updateError } = await supabase
        .from("branch_affiliations")
        .update(updatePayload)
        .eq("branch_id", branchId);

      if (updateError) {
        console.error(
          "[admin-v2/business-entities branches POST] affiliation update error:",
          updateError
        );
        return NextResponse.json(
          { error: "지사 소속을 변경하지 못했습니다." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(
      "[admin-v2/business-entities branches POST] Unexpected error:",
      e
    );
    return NextResponse.json(
      { error: "지사 소속을 변경하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

