import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-v2/branches PATCH] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { branchId } = await params;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

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
      const cookieStore = await cookies();
      const token = cookieStore.get("admin_v2_token")?.value;

      if (!token) {
        return NextResponse.json(
          { error: "로그인 정보가 없습니다. 다시 로그인해 주세요." },
          { status: 401 }
        );
      }

      const authClient = createClient(supabaseUrl, serviceRoleKey);
      const {
        data: { user },
        error: userError,
      } = await authClient.auth.getUser(token);

      if (userError || !user) {
        console.error(
          "[admin-v2/branches PATCH] getUser error:",
          userError || "no user"
        );
        return NextResponse.json(
          { error: "사용자 정보를 확인하지 못했습니다." },
          { status: 401 }
        );
      }

      const { error: policyError } = await supabase
        .from("branch_settlement_policies")
        .insert({
          branch_id: branchId,
          fee_type: body.feeType,
          fee_value: body.feeValue,
          created_by: user.id,
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-v2/branches DELETE] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { branchId } = await params;

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
