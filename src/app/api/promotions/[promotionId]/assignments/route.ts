import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ promotionId: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error("[admin-v2/promotion assignments PATCH] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { promotionId } = await params;
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.supabase;
  const serviceSupabase = auth.serviceSupabase;
  const dbForAssignments = serviceSupabase ?? supabase;
  const userId = auth.user.id;

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  if (!Array.isArray(payload)) {
    return NextResponse.json(
      { error: "배정 목록은 배열이어야 합니다." },
      { status: 400 }
    );
  }

  const rows = payload
    .map((x: any) => ({
      promotion_id: promotionId,
      branch_id: x.branch_id ? String(x.branch_id) : null,
      is_active: x.is_active ?? true,
      start_date: x.start_date ?? null,
      end_date: x.end_date ?? null,
      priority_order: x.priority_order ?? null,
      created_by: userId,
    }))
    .filter((r) => r.branch_id);

  try {
    if (rows.length > 0) {
      const branchIds = rows.map((r) => r.branch_id as string);
      const { error: delError } = await dbForAssignments
        .from("promotion_branch_assignments")
        .delete()
        .eq("promotion_id", promotionId)
        .in("branch_id", branchIds)
        .eq("created_by", userId);

      if (delError) {
        console.error("[admin-v2/promotion assignments PATCH] delete error:", delError);
        return NextResponse.json(
          { error: "프로모션 지사 배정을 저장하지 못했습니다." },
          { status: 500 }
        );
      }

      const { data, error } = await dbForAssignments
        .from("promotion_branch_assignments")
        .insert(rows)
        .select(
          "id, branch_id, is_active, start_date, end_date, priority_order"
        );

      if (error) {
        console.error(
          "[admin-v2/promotion assignments PATCH] Supabase error:",
          error
        );
        return NextResponse.json(
          { error: "프로모션 지사 배정을 저장하지 못했습니다." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, assignments: data });
    }

    return NextResponse.json({ ok: true, assignments: [] });
  } catch (e) {
    console.error(
      "[admin-v2/promotion assignments PATCH] Unexpected error:",
      e
    );
    return NextResponse.json(
      { error: "프로모션 지사 배정을 저장하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ promotionId: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error("[admin-v2/promotion assignments DELETE] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { promotionId } = await params;
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.supabase;
  const serviceSupabase = auth.serviceSupabase;
  const dbForAssignments = serviceSupabase ?? supabase;
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

  const ids: string[] = Array.isArray(body?.branch_ids) ? body.branch_ids : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "branch_ids 배열이 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const { error } = await dbForAssignments
      .from("promotion_branch_assignments")
      .delete()
      .eq("promotion_id", promotionId)
      .eq("created_by", userId)
      .in("branch_id", ids);

    if (error) {
      console.error(
        "[admin-v2/promotion assignments DELETE] Supabase error:",
        error
      );
      return NextResponse.json(
        { error: "프로모션 지사 배정을 삭제하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(
      "[admin-v2/promotion assignments DELETE] Unexpected error:",
      e
    );
    return NextResponse.json(
      { error: "프로모션 지사 배정을 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
