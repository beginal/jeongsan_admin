import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[admin-v2/riders] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_v2_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { searchParams } = new URL(request.url);

    const branchId = searchParams.get("branchId");
    const verificationStatus = searchParams.get("verificationStatus");
    const search = searchParams.get("search");

    const { data: ridersData, error: ridersError } = await supabase.rpc(
      "get_riders_for_admin"
    );

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

    const ridersWithBranches = await Promise.all(
      filteredRiders.map(async (rider: any) => {
        const { data: branchData } = await supabase
          .from("rider_new_branches")
          .select(
            `
            new_branch_id,
            is_primary,
            status,
            new_branches:new_branch_id (
              id,
              display_name,
              platform,
              region,
              branch_name
            )
          `
          )
          .eq("rider_id", rider.id)
          .eq("status", "active");

        const branches =
          (branchData || []).map((rb: any) => ({
            branchId: rb.new_branch_id,
            branchName: rb.new_branches?.display_name,
            isPrimary: rb.is_primary,
            platform: rb.new_branches?.platform,
          })) ?? [];

        const { data: assignmentData } = await supabase
          .from("vehicle_assignments")
          .select(
            `
            id,
            start_date,
            end_date,
            vehicle:vehicles (
              id,
              plate_number,
              model,
              daily_fee,
              weekly_fee,
              color
            )
          `
          )
          .eq("rider_id", rider.id)
          .eq("is_active", true)
          .single();

        const vehicleData: any =
          assignmentData && Array.isArray(assignmentData.vehicle)
            ? assignmentData.vehicle[0]
            : assignmentData?.vehicle;

        const currentAssignment = assignmentData
          ? {
              assignmentId: assignmentData.id,
              startDate: assignmentData.start_date,
              endDate: assignmentData.end_date,
              vehicle: {
                id: vehicleData?.id,
                plateNumber: vehicleData?.plate_number,
                model: vehicleData?.model,
                dailyFee: vehicleData?.daily_fee,
                weeklyFee: vehicleData?.weekly_fee,
                color: vehicleData?.color,
              },
            }
          : null;

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
          currentAssignment,
          verificationStatus: rider.verification_status,
          registrationCompletedAt: rider.registration_completed_at,
          approvedAt: rider.approved_at,
          rejectedAt: rider.rejected_at,
          rejectionReason: rider.rejection_reason,
        };
      })
    );

    const finalFilteredRiders =
      branchId && branchId !== "all"
        ? ridersWithBranches.filter((rider: any) =>
            rider.branches.some(
              (branch: any) => String(branch.branchId) === String(branchId)
            )
          )
        : ridersWithBranches;

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
