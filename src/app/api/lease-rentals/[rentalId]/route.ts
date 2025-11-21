import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const mapStatus = (isActive: boolean | null | undefined) =>
  isActive ? "active" : "inactive";

async function getAdminId(supabaseUrl: string, serviceRoleKey: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_v2_token")?.value;
  if (!token) return null;
  const auth = createClient(supabaseUrl, serviceRoleKey);
  const {
    data: { user },
  } = await auth.auth.getUser(token);
  return user?.id || null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ rentalId: string }> }
) {
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
    const adminId = await getAdminId(supabaseUrl, serviceRoleKey);
    if (!adminId) {
      return NextResponse.json(
        { error: "유효한 관리자 정보가 없습니다." },
        { status: 401 }
      );
    }

    const { rentalId } = await params;

    const { data, error } = await supabase
      .from("vehicles")
      .select(
        "id, plate_number, model, color, contract_type, daily_fee, insurance_company, insurance_age, company_contract_start, company_contract_end, vehicle_assignments(id, rider_id, start_date, end_date, is_active, riders(name, phone))"
      )
      .eq("id", rentalId)
      .eq("created_by", adminId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "리스렌탈 정보를 불러오지 못했습니다." },
        { status: 404 }
      );
    }

    const assignments: any[] = Array.isArray((data as any).vehicle_assignments)
      ? (data as any).vehicle_assignments
      : [];
    const active =
      assignments.find((a) => a.is_active) ||
      assignments.sort(
        (a, b) =>
          new Date(b.start_date || "1970-01-01").getTime() -
          new Date(a.start_date || "1970-01-01").getTime()
      )[0];
    const rider = active?.riders || {};

    return NextResponse.json({
      rental: {
        id: data.id,
        plate: data.plate_number || "",
        riderId: active?.rider_id || null,
        riderName: rider.name || "",
        riderPhone: rider.phone || "",
        vehicleType: data.model || "",
        color: data.color || "",
        contractType: data.contract_type || "",
        dailyFee: data.daily_fee || 0,
        insuranceCompany: data.insurance_company || "",
        insuranceAge: data.insurance_age || "",
        status: mapStatus(active?.is_active),
        startDate: active?.start_date || "",
        endDate: active?.end_date || "",
        assignmentId: active?.id || null,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "리스렌탈 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ rentalId: string }> }
) {
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
    const adminId = await getAdminId(supabaseUrl, serviceRoleKey);
    if (!adminId) {
      return NextResponse.json(
        { error: "유효한 관리자 정보가 없습니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      plate,
      riderId,
      vehicleType,
      color,
      contractType,
      dailyFee,
      insuranceCompany,
      insuranceAge,
      status,
      startDate,
      endDate,
    } = body || {};

    const { rentalId } = await params;

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select(
        "id, plate_number, model, contract_type, daily_fee, vehicle_assignments(id, rider_id, start_date, end_date, is_active)"
      )
      .eq("id", rentalId)
      .eq("created_by", adminId)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: "수정 대상 리스렌탈을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 차량 정보 업데이트
    await supabase
      .from("vehicles")
      .update({
        plate_number: plate,
        model: vehicleType,
        color: color || null,
        contract_type: contractType,
        daily_fee: dailyFee,
        insurance_company: insuranceCompany || null,
        insurance_age: insuranceAge || null,
      })
      .eq("id", rentalId);

    const assignments: any[] = Array.isArray((vehicle as any).vehicle_assignments)
      ? (vehicle as any).vehicle_assignments
      : [];
    const active =
      assignments.find((a) => a.is_active) ||
      assignments.sort(
        (a, b) =>
          new Date(b.start_date || "1970-01-01").getTime() -
          new Date(a.start_date || "1970-01-01").getTime()
      )[0];

    const isActive = status === "active";

    if (active) {
      await supabase
        .from("vehicle_assignments")
        .update({
          rider_id: riderId || active.rider_id,
          start_date: startDate ?? active.start_date,
          end_date: endDate ?? active.end_date,
          is_active: isActive,
        })
        .eq("id", active.id);
    } else if (riderId) {
      await supabase.from("vehicle_assignments").insert({
        vehicle_id: rentalId,
        rider_id: riderId,
        start_date: startDate || null,
        end_date: endDate || null,
        is_active: isActive,
        created_by: adminId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "리스렌탈 정보를 수정하지 못했습니다." },
      { status: 500 }
    );
  }
}
