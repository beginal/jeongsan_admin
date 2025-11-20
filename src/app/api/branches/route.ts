import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-v2/branches] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { searchParams } = new URL(request.url);
    const adminIdParam = searchParams.get("adminId");

    let effectiveAdminId: string | null = adminIdParam || null;

    if (!effectiveAdminId) {
      // 관리자 토큰으로 요청한 경우 토큰의 사용자 ID로 필터
      const cookieStore = await cookies();
      const token = cookieStore.get("admin_v2_token")?.value;
      if (token) {
        const authClient = createClient(supabaseUrl, serviceRoleKey);
        const {
          data: { user },
        } = await authClient.auth.getUser(token);
        if (user?.id) {
          effectiveAdminId = user.id;
        }
      }
    }

    if (!effectiveAdminId) {
      return NextResponse.json(
        { error: "유효한 관리자 정보가 없습니다." },
        { status: 401 }
      );
    }

    const { data: ownedBranches, error: ownedError } = await supabase
      .from("new_branches")
      .select("id")
      .eq("created_by", effectiveAdminId);

    if (ownedError) {
      console.error(
        "[admin-v2/branches] owned branches load error:",
        ownedError
      );
      return NextResponse.json(
        { error: "지사 데이터를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const branchFilterIds = (ownedBranches || []).map((b: any) => String(b.id));

    if (branchFilterIds.length === 0) {
      return NextResponse.json({ branches: [], total: 0 });
    }

    let query = supabase
      .from("new_branches_with_stats")
      .select(
        "id, platform, province, district, branch_name, display_name, rider_count"
      )
      .order("province", { ascending: true })
      .order("district", { ascending: true })
      .order("display_name", { ascending: true });

    query = query.in("id", branchFilterIds);

    const { data, error } = await query;

    if (error) {
      console.error("[admin-v2/branches] Supabase error:", error);
      return NextResponse.json(
        { error: "지사 데이터를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const base = data || [];
    const branchIds = base.map((b: any) => b.id as string);

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
            .flatMap((a: any) => [
              a.corporate_entity_id,
              a.personal_entity_id,
            ])
            .filter(Boolean) as string[]
        )
      );

      if (entityIds.length > 0) {
        const { data: ents } = await supabase
          .from("business_entities")
          .select("id, name")
          .in("id", entityIds);

        entityNameById = Object.fromEntries(
          (ents || []).map((e: any) => [
            e.id as string,
            e.name as string,
          ])
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

    const result = base.map((b: any) => {
      const aff = affByBranch[String(b.id)] || {};
      const corporateId = aff.corporate_entity_id
        ? String(aff.corporate_entity_id)
        : null;
      const personalId = aff.personal_entity_id
        ? String(aff.personal_entity_id)
        : null;
      return {
        ...b,
        corporate_entity_id: corporateId,
        corporate_entity_name: corporateId
          ? entityNameById[corporateId] || null
          : null,
        personal_entity_id: personalId,
        personal_entity_name: personalId
          ? entityNameById[personalId] || null
          : null,
      };
    });

    return NextResponse.json({
      branches: result,
      total: result.length,
    });
  } catch (e) {
    console.error("[admin-v2/branches] Unexpected error:", e);
    return NextResponse.json(
      { error: "지사 데이터를 불러오는 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

interface CreateBranchBody {
  platform?: "coupang" | "baemin";
  province?: string;
  district?: string;
  branchName?: string;
  corporateEntityId?: string | null;
  personalEntityId?: string | null;
  feeType?: "per_case" | "percentage" | null;
  feeValue?: number | null;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin-v2/branches POST] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let body: CreateBranchBody;
  try {
    body = (await request.json()) as CreateBranchBody;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  if (!body.platform || !body.branchName) {
    return NextResponse.json(
      { error: "플랫폼과 지사명은 필수입니다." },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 현재 로그인한 사용자 (created_by / 정책용)
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_v2_token")?.value;
    let userId: string | null = null;

    if (token) {
      const authClient = createClient(supabaseUrl, serviceRoleKey);
      const {
        data: { user },
      } = await authClient.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    const regionValue =
      (body.province && body.district
        ? `${body.province} ${body.district}`
        : body.district || body.province || "기타") ?? "기타";

    // 1) new_branches 생성
    const { data: inserted, error: insertError } = await supabase
      .from("new_branches")
      .insert({
        platform: body.platform,
        region: regionValue,
        province: body.province ?? null,
        district: body.district ?? null,
        branch_name: body.branchName,
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted) {
      console.error(
        "[admin-v2/branches POST] new_branches insert error:",
        insertError
      );
      return NextResponse.json(
        { error: "새 지사를 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    const branchId = inserted.id as string;

    // 2) branch_affiliations 생성 (선택적)
    if (body.corporateEntityId || body.personalEntityId) {
      const { error: affError } = await supabase
        .from("branch_affiliations")
        .insert({
          branch_id: branchId,
          corporate_entity_id: body.corporateEntityId ?? null,
          personal_entity_id: body.personalEntityId ?? null,
        });

      if (affError) {
        console.error(
          "[admin-v2/branches POST] branch_affiliations insert error:",
          affError
        );
        // 소속은 실패해도 지사 생성 자체는 성공 처리 (로그만 남김)
      }
    }

    // 3) branch_settlement_policies 생성 (선택적)
    if (body.feeType && body.feeValue != null && userId) {
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
          "[admin-v2/branches POST] policy insert error:",
          policyError
        );
        // 정책 실패도 치명적이진 않으므로 로그만
      }
    }

    return NextResponse.json({ id: branchId });
  } catch (e) {
    console.error("[admin-v2/branches POST] unexpected error:", e);
    return NextResponse.json(
      { error: "새 지사를 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
