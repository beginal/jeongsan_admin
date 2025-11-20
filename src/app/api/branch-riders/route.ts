import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
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
      return NextResponse.json(
        { error: "지사 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const branchIds = (ownedBranches || []).map((b: any) => String(b.id));
    if (branchIds.length === 0) {
      return NextResponse.json({ ridersByBranch: {} });
    }

    const { data: rows, error } = await supabase
      .from("rider_new_branches")
      .select(
        "new_branch_id, rider_id, status, riders:rider_id(id, name, phone, verification_status)"
      )
      .in("new_branch_id", branchIds)
      .eq("status", "active");

    if (error) {
      return NextResponse.json(
        { error: "소속 라이더를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const result: Record<string, any[]> = {};

    (rows || []).forEach((row: any) => {
      const rider = row.riders || {};
      if (rider.verification_status !== "approved") return;
      const phone: string = rider.phone || "";
      const phoneSuffix =
        typeof phone === "string" && phone.length >= 4
          ? phone.slice(-4)
          : "";

      const entry = {
        id: String(row.rider_id),
        name: rider.name || "",
        phone,
        phoneSuffix,
      };
      const bid = String(row.new_branch_id);
      (result[bid] = result[bid] || []).push(entry);
    });

    Object.keys(result).forEach((bid) => {
      result[bid].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    });

    return NextResponse.json({ ridersByBranch: result });
  } catch (e) {
    return NextResponse.json(
      { error: "소속 라이더를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

