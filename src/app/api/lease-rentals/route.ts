import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const mapStatus = (isActive: boolean | null | undefined) =>
  isActive ? "active" : "inactive";

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
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_v2_token")?.value;

    let adminId: string | null = null;
    if (token) {
      const auth = createClient(supabaseUrl, serviceRoleKey);
      const {
        data: { user },
      } = await auth.auth.getUser(token);
      adminId = user?.id || null;
    }

    if (!adminId) {
      return NextResponse.json(
        { error: "유효한 관리자 정보가 없습니다." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("vehicles")
      .select(
        "id, plate_number, model, color, contract_type, daily_fee, insurance_company, insurance_age, company_contract_start, company_contract_end, vehicle_assignments(id, rider_id, start_date, end_date, is_active, riders(name, phone))"
      )
      .eq("created_by", adminId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "리스렌탈 목록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const rentals =
      (data || []).map((v: any) => {
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

        const rider = active?.riders || {};
        return {
          id: v.id as string,
          plate: v.plate_number || "",
          riderName: rider.name || "",
          riderId: active?.rider_id || null,
          riderSuffix:
            typeof rider.phone === "string" && rider.phone.length >= 4
              ? rider.phone.slice(-4)
              : "",
          vehicleType: v.model || "",
          color: v.color || "",
          contractType: v.contract_type || "",
          dailyFee: v.daily_fee || 0,
          insuranceCompany: v.insurance_company || "",
          insuranceAge: v.insurance_age || "",
          status: mapStatus(active?.is_active),
          startDate: active?.start_date || "",
          endDate: active?.end_date || "",
        };
      }) || [];

    return NextResponse.json({ rentals });
  } catch (e) {
    return NextResponse.json(
      { error: "리스렌탈 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
