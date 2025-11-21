import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

interface UpdateBranchBody {
  platform?: "coupang" | "baemin";
  province?: string;
  district?: string;
  branchName?: string;
  corporateEntityId?: string | null;
  personalEntityId?: string | null;
  feeType?: "per_case" | "percentage" | null;
  feeValue?: number | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params;
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;

  // 소유자 확인: 다른 관리자의 지사에 대한 수정 차단
  const { data: branchOwner, error: ownerError } = await supabase
    .from("new_branches")
    .select("id, created_by")
    .eq("id", branchId)
    .maybeSingle();

  if (ownerError || !branchOwner || branchOwner.created_by !== auth.user.id) {
    return NextResponse.json({ error: "존재하지 않거나 권한이 없습니다." }, { status: 404 });
  }

  let body: UpdateBranchBody;
  try {
    body = (await request.json()) as UpdateBranchBody;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  const updates: Record<string, any> = {};
  if (body.platform) updates.platform = body.platform;
  if (body.province !== undefined) updates.province = body.province;
  if (body.district !== undefined) updates.district = body.district;
  if (body.branchName !== undefined) updates.branch_name = body.branchName;

  try {
    // 1) new_branches 업데이트
    if (Object.keys(updates).length > 0) {
      const { error: branchError } = await supabase
        .from("new_branches")
        .update(updates)
        .eq("id", branchId);

      if (branchError) {
        console.error(
          "[admin-v2/branches PATCH] new_branches update error:",
          branchError
        );
        return NextResponse.json(
          { error: "지사 기본 정보를 수정하지 못했습니다." },
          { status: 500 }
        );
      }
    }

    // 2) branch_affiliations 업서트
    if (
      body.corporateEntityId !== undefined ||
      body.personalEntityId !== undefined
    ) {
      const affUpdate = {
        branch_id: branchId,
        corporate_entity_id: body.corporateEntityId ?? null,
        personal_entity_id: body.personalEntityId ?? null,
      };

      const { error: affError } = await supabase
        .from("branch_affiliations")
        .upsert(affUpdate, {
          onConflict: "branch_id",
        });

      if (affError) {
        console.error(
          "[admin-v2/branches PATCH] branch_affiliations upsert error:",
          affError
        );
        return NextResponse.json(
          { error: "지사 소속 정보를 수정하지 못했습니다." },
          { status: 500 }
        );
      }
    }

    // 3) branch_settlement_policies - 활성 정책 새로 입력
    if (body.feeType && body.feeValue != null) {
      const userId = auth.user.id;
      const { error: policyError } = await supabase
        .from("branch_settlement_policies")
        .insert({
          branch_id: branchId,
          fee_type: body.feeType,
          fee_value: body.feeValue,
          created_by: userId,
        });

      if (policyError) {
        console.error(
          "[admin-v2/branches PATCH] policy insert error:",
          policyError
        );
        return NextResponse.json(
          { error: "정산 수수료 정책을 저장하지 못했습니다." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin-v2/branches PATCH] unexpected error:", e);
    return NextResponse.json(
      { error: "지사 정보를 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params;

  try {
    const auth = await requireAdminAuth();
    if ("response" in auth) return auth.response;
    const supabase = auth.serviceSupabase ?? auth.supabase;

    const { data: branchOwner, error: ownerError } = await supabase
      .from("new_branches")
      .select("id, created_by")
      .eq("id", branchId)
      .maybeSingle();

    if (ownerError || !branchOwner || branchOwner.created_by !== auth.user.id) {
      return NextResponse.json(
        { error: "존재하지 않거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("new_branches")
      .delete()
      .eq("id", branchId);

    if (deleteError) {
      console.error(
        "[admin-v2/branches DELETE] new_branches delete error:",
        deleteError
      );
      return NextResponse.json(
        {
          error:
            "지사를 삭제하지 못했습니다. 관련 라이더나 데이터가 연결되어 있을 수 있습니다.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin-v2/branches DELETE] unexpected error:", e);
    return NextResponse.json(
      { error: "지사를 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
