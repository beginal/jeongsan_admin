import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const adminId = auth.user.id;

  try {
    const { data: ownedBranches } = await supabase
      .from("new_branches")
      .select("id")
      .eq("created_by", adminId);
    const branchIds = new Set((ownedBranches || []).map((b: any) => String(b.id)));

    // riders created_by admin or assigned to owned branches
    const { data: ridersBasic, error } = await supabase
      .from("riders")
      .select("id, name, phone, verification_status, created_by")
      .eq("verification_status", "approved");

    if (error) {
      return NextResponse.json(
        { error: "라이더 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const riderIds = new Set(
      (ridersBasic || [])
        .filter((r: any) => String(r.created_by) === adminId)
        .map((r: any) => String(r.id))
    );

    if (branchIds.size > 0) {
      const { data: rnbRows } = await supabase
        .from("rider_new_branches")
        .select("rider_id, new_branch_id, status")
        .eq("status", "active")
        .in("new_branch_id", Array.from(branchIds));
      (rnbRows || []).forEach((row: any) => {
        if (row.rider_id) riderIds.add(String(row.rider_id));
      });
    }

    if (riderIds.size === 0) {
      return NextResponse.json({ riders: [] });
    }

    const { data, error: detailError } = await supabase
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
      .in("id", Array.from(riderIds))
      .eq("verification_status", "approved")
      .order("name", { ascending: true })
      .range(0, 4999);

    if (detailError) {
      return NextResponse.json(
        { error: "라이더 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const branchIdList: string[] = [];

    (data || []).forEach((r: any) => {
      const activeBranch = Array.isArray(r.branches)
        ? r.branches.find((b: any) => b.status === "active")
        : null;
      if (activeBranch?.new_branch_id) {
        branchIdList.push(String(activeBranch.new_branch_id));
      }
    });

    let businessByBranch: Record<string, string> = {};
    if (branchIdList.length > 0) {
      const { data: affRows } = await supabase
        .from("branch_affiliations")
        .select(
          `
          branch_id,
          corporate:corporate_entity_id (name),
          personal:personal_entity_id (name)
        `
        )
        .in("branch_id", branchIdList);

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
