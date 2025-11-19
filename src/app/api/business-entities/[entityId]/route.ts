import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-v2/business-entities PATCH] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { entityId } = await params;
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

  const updates: Record<string, any> = {};

  if ("name" in body) {
    updates.name =
      typeof body.name === "string" ? body.name.trim() : body.name;
  }

  if ("registrationNumber" in body) {
    updates.registration_number_enc =
      typeof body.registrationNumber === "string"
        ? body.registrationNumber.trim() || null
        : body.registrationNumber ?? null;
  }

  if ("parentEntityId" in body) {
    updates.parent_entity_id = body.parentEntityId || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { error } = await supabase
      .from("business_entities")
      .update(updates)
      .eq("id", entityId);

    if (error) {
      console.error(
        "[admin-v2/business-entities PATCH] Supabase error:",
        error
      );
      return NextResponse.json(
        { error: "사업자 정보를 수정하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(
      "[admin-v2/business-entities PATCH] Unexpected error:",
      e
    );
    return NextResponse.json(
      { error: "사업자 정보를 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
