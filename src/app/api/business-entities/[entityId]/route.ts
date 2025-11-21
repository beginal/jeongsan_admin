import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params;
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
      .eq("id", entityId)
      .eq("created_by", userId);

    if (error) {
      const msg = String(error.message || "");
      if (msg.includes("created_by") || (msg.toLowerCase().includes("column") && msg.toLowerCase().includes("created_by"))) {
        return NextResponse.json(
          { error: "해당 사업자를 찾을 수 없거나 수정 권한이 없습니다." },
          { status: 404 }
        );
      }
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
