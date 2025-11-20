import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("riders")
      .select(
        `
        id,
        name,
        phone,
        verification_status,
        branches:rider_new_branches (
          new_branch_id,
          status,
          new_branches:new_branch_id (
            id,
            display_name,
            branch_name,
            province,
            district
          )
        )
      `
      )
      .eq("verification_status", "approved")
      .order("name", { ascending: true })
      .range(0, 4999);

    if (error) {
      return NextResponse.json(
        { error: "라이더 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const branchIds: string[] = [];

    (data || []).forEach((r: any) => {
      const activeBranch = Array.isArray(r.branches)
        ? r.branches.find((b: any) => b.status === "active")
        : null;
      if (activeBranch?.new_branch_id) {
        branchIds.push(String(activeBranch.new_branch_id));
      }
    });

    let businessByBranch: Record<string, string> = {};
    if (branchIds.length > 0) {
      const { data: affRows } = await supabase
        .from("branch_affiliations")
        .select(
          `
          branch_id,
          corporate:corporate_entity_id (name),
          personal:personal_entity_id (name)
        `
        )
        .in("branch_id", branchIds);

      (affRows || []).forEach((row: any) => {
        const corp = row.corporate?.name || "";
        const personal = row.personal?.name || "";
        businessByBranch[String(row.branch_id)] = corp || personal || "";
      });
    }

    const riders =
      (data || []).map((r: any) => {
        const phone = r.phone || "";
        const phoneSuffix =
          typeof phone === "string" && phone.length >= 4
            ? phone.slice(-4)
            : "";

        const activeBranch = Array.isArray(r.branches)
          ? r.branches.find((b: any) => b.status === "active")
          : null;

        const branchName =
          activeBranch?.new_branches?.display_name ||
          activeBranch?.new_branches?.branch_name ||
          [activeBranch?.new_branches?.province, activeBranch?.new_branches?.district]
            .filter(Boolean)
            .join(" ") ||
          "";

        const businessName = activeBranch?.new_branch_id
          ? businessByBranch[String(activeBranch.new_branch_id)] || ""
          : "";

        return {
          id: String(r.id),
          name: r.name || "",
          phoneSuffix,
          branchName,
          businessName,
        };
      }) ?? [];

    return NextResponse.json({ riders });
  } catch (e) {
    return NextResponse.json(
      { error: "라이더 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
