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
    const riderIds: string[] = [];

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
      riderIds.push(String(row.rider_id));
    });

    // 리스 렌탈 일일 요금 및 대여금 납부 정보 병합
    const rentalFeeByRider: Record<string, number> = {};
    const loanScheduleByRider: Record<string, { weekday: number | null; amount: number | null }> = {};

    // 리스 렌탈: 차량 owner 기준으로 조회하고 rider_id가 맞는 활성 배정의 daily_fee를 매핑
    if (riderIds.length > 0) {
      const { data: vehicleRows } = await supabase
        .from("vehicles")
        .select(
          "id, daily_fee, vehicle_assignments(rider_id, is_active, start_date, end_date)"
        )
        .eq("created_by", effectiveAdminId);

      (vehicleRows || []).forEach((v: any) => {
        const assignments: any[] = Array.isArray(v.vehicle_assignments)
          ? v.vehicle_assignments
          : [];
        const active =
          assignments.find((a) => a.is_active) ||
          assignments.sort(
            (a, b) =>
              new Date(b.start_date || "1970-01-01").getTime() -
              new Date(a.start_date || "1970-01-01").getTime()
          )[0];
        const rid = active?.rider_id;
        if (!rid) return;
        if (riderIds.includes(String(rid)) && rentalFeeByRider[String(rid)] === undefined) {
          rentalFeeByRider[String(rid)] = Number(v.daily_fee || 0);
        }
      });

      // 대여금 납부 스케줄: 최신 대여금을 rider별 1건만 사용
      const { data: loanRows } = await supabase
        .from("rider_loans")
        .select("rider_id, payment_weekday, payment_amount, loan_date")
        .in("rider_id", riderIds)
        .order("loan_date", { ascending: false });

      (loanRows || []).forEach((row: any) => {
        const rid = String(row.rider_id);
        if (!rid || loanScheduleByRider[rid]) return;
        loanScheduleByRider[rid] = {
          weekday:
            row.payment_weekday === null || row.payment_weekday === undefined
              ? null
              : Number(row.payment_weekday),
          amount:
            row.payment_amount === null || row.payment_amount === undefined
              ? null
              : Number(row.payment_amount),
        };
      });
    }

    // rider 개체에 병합
    Object.entries(result).forEach(([bid, list]) => {
      result[bid] = (list || []).map((r: any) => ({
        ...r,
        rentalDailyFee: rentalFeeByRider[r.id] ?? null,
        loanPaymentWeekday: loanScheduleByRider[r.id]?.weekday ?? null,
        loanPaymentAmount: loanScheduleByRider[r.id]?.amount ?? null,
      }));
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
