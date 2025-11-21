import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth();
    if ("response" in auth) return auth.response;
    const supabase = auth.supabase;
    const adminId = auth.user.id;

    const { searchParams } = new URL(request.url);

    const branchId = searchParams.get("branchId");
    const verificationStatus = searchParams.get("verificationStatus");
    const search = searchParams.get("search");

    // 소유 지사 목록
    const { data: ownedBranches } = await supabase
      .from("new_branches")
      .select("id, display_name, branch_name, province, district, platform")
      .eq("created_by", adminId);
    const ownedBranchIds = new Set((ownedBranches || []).map((b: any) => String(b.id)));

    // 라이더 기본 정보 (소유자 기준)
    const { data: ridersData, error: ridersError } = await supabase
      .from("riders")
      .select(
        "id, name, phone, email, baemin_id, bank_name, account_holder, verification_status, registration_completed_at, approved_at, rejected_at, rejection_reason, created_by"
      )
      .eq("created_by", adminId);

    if (ridersError) {
      console.error("[admin-v2/riders] Riders fetch error:", ridersError);
      return NextResponse.json(
        { error: "라이더 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    let filteredRiders = ridersData || [];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredRiders = filteredRiders.filter((rider: any) =>
        (rider.name || "").toLowerCase().includes(searchLower) ||
        (rider.phone || "").toLowerCase().includes(searchLower) ||
        (rider.email || "").toLowerCase().includes(searchLower) ||
        (rider.baemin_id || "").toLowerCase().includes(searchLower)
      );
    }

    if (verificationStatus && verificationStatus !== "all") {
      filteredRiders = filteredRiders.filter(
        (rider: any) => rider.verification_status === verificationStatus
      );
    }

    const riderIds = filteredRiders.map((r: any) => r.id);
    let branchData: any[] = [];
    if (riderIds.length > 0 && ownedBranchIds.size > 0) {
      const { data: rnb } = await supabase
        .from("rider_new_branches")
        .select(
          `
          rider_id,
          new_branch_id,
          is_primary,
          status,
          new_branches:new_branch_id (
            id,
            display_name,
            branch_name,
            province,
            district,
            platform
          )
        `
        )
        .in("rider_id", riderIds)
        .in("new_branch_id", Array.from(ownedBranchIds))
        .eq("status", "active");
      branchData = rnb || [];
    }

    const branchByRider: Record<string, any[]> = {};
    branchData.forEach((rb: any) => {
      const rid = String(rb.rider_id);
      branchByRider[rid] = branchByRider[rid] || [];
      branchByRider[rid].push(rb);
    });

    const ridersWithBranches = await Promise.all(
      filteredRiders.map(async (rider: any) => {
        const rbList = branchByRider[String(rider.id)] || [];
        const branches = rbList.map((rb: any) => {
          const nb = rb.new_branches || {};
          const branchName = nb.display_name || nb.branch_name || "";
          return {
            branchId: rb.new_branch_id,
            branchName,
            isPrimary: rb.is_primary,
            platform: nb.platform,
          };
        });
        if (branchId && branchId !== "all") {
          const has = branches.some((b: any) => String(b.branchId) === String(branchId));
          if (!has) return null;
        }

        return {
          id: rider.id,
          name: rider.name,
          phone: rider.phone,
          email: rider.email,
          residentNumber: rider.resident_number,
          baeminId: rider.baemin_id,
          bankName: rider.bank_name,
          accountNumber: rider.account_number,
          accountHolder: rider.account_holder,
          taxName: rider.tax_name,
          taxResidentNumber: rider.tax_resident_number,
          branches,
          currentAssignment: null,
          verificationStatus: rider.verification_status,
          registrationCompletedAt: rider.registration_completed_at,
          approvedAt: rider.approved_at,
          rejectedAt: rider.rejected_at,
          rejectionReason: rider.rejection_reason,
        };
      })
    );

    const finalFilteredRiders = (ridersWithBranches.filter(Boolean) as any[]) || [];

    return NextResponse.json({
      riders: finalFilteredRiders,
      total: finalFilteredRiders.length,
    });
  } catch (error) {
    console.error("[admin-v2/riders] Unexpected error:", error);
    return NextResponse.json(
      { error: "라이더 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
