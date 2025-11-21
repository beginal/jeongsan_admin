import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

const mapStatus = (isActive: boolean | null | undefined) =>
  isActive ? "active" : "inactive";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.supabase;

  try {
    const adminId: string | null = auth.user.id || null;

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

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.supabase;
  const adminId = auth.user.id;

  const body = await request.json().catch(() => ({}));
  const plate = String(body.plate || "").trim();
  const riderId = body.riderId || null;
  const vehicleTypeRaw = String(body.vehicleType || "").trim();
  const color = String(body.color || "").trim() || null;
  const contractTypeRaw = String(body.contractType || "").toLowerCase();
  const contractType = contractTypeRaw === "lease" ? "lease" : "rent";
  const dailyFeeNum = Number(body.dailyFee ?? 0);
  const weeklyFeeNum = Math.max(0, Number.isFinite(dailyFeeNum) ? dailyFeeNum * 7 : 0);
  const insuranceCompany = body.insuranceCompany ? String(body.insuranceCompany) : null;
  const insuranceAgeRaw = body.insuranceAge ? String(body.insuranceAge) : null;
  const status = body.status === "inactive" ? "inactive" : "active";
  const startDate = body.startDate || null;
  const endDate = body.endDate || null;

  if (!plate) {
    return NextResponse.json({ error: "차량번호를 입력해 주세요." }, { status: 400 });
  }
  if (!vehicleTypeRaw) {
    return NextResponse.json({ error: "차종을 입력해 주세요." }, { status: 400 });
  }
  if (!Number.isFinite(dailyFeeNum) || dailyFeeNum < 0) {
    return NextResponse.json({ error: "일 요금은 0 이상 숫자여야 합니다." }, { status: 400 });
  }

  // 표준화: 모델/보험연령은 테이블 체크 제약조건에 맞춰야 함
  const modelMap: Record<string, string> = {
    젠트로피: "gentropy",
    gentropy: "gentropy",
    pcx: "pcx",
    기타: "other",
    other: "other",
  };
  const vehicleType = modelMap[vehicleTypeRaw.toLowerCase()] || "other";

  const allowedInsuranceAges = new Set(["21", "26", "30", "35"]);
  const insuranceAge =
    insuranceAgeRaw && allowedInsuranceAges.has(insuranceAgeRaw) ? insuranceAgeRaw : null;
  if (insuranceAgeRaw && !insuranceAge) {
    return NextResponse.json(
      { error: "보험 연령은 21, 26, 30, 35 중 하나여야 합니다." },
      { status: 400 }
    );
  }
  if (!startDate) {
    return NextResponse.json(
      { error: "계약 시작일을 입력해 주세요." },
      { status: 400 }
    );
  }

  try {
    const { data: vehicle, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        plate_number: plate,
        model: vehicleType,
        color,
        contract_type: contractType,
        daily_fee: dailyFeeNum,
        weekly_fee: weeklyFeeNum,
        insurance_company: insuranceCompany,
        insurance_age: insuranceAge,
        company_contract_start: startDate,
        company_contract_end: endDate || startDate,
        created_by: adminId,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !vehicle) {
      console.error("[lease-rentals POST] vehicle insert error:", insertError);
      const msg =
        insertError?.message?.includes("plate_number")
          ? "이미 등록된 차량번호입니다."
          : insertError?.message || "리스렌탈을 생성하지 못했습니다.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const rentalId = vehicle.id as string;

    if (riderId) {
      const isActive = status === "active";
      const { error: assignmentError } = await supabase
        .from("vehicle_assignments")
        .insert({
          vehicle_id: rentalId,
          rider_id: riderId,
          start_date: startDate || null,
          end_date: endDate || null,
          is_active: isActive,
          created_by: adminId,
        });
      if (assignmentError) {
        console.error("[lease-rentals POST] assignment insert error:", assignmentError);
        return NextResponse.json(
          { error: assignmentError.message || "리스렌탈을 생성했지만 라이더 배정에 실패했습니다." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ id: rentalId });
  } catch (e) {
    console.error("[lease-rentals POST] unexpected error:", e);
    return NextResponse.json(
      { error: "리스렌탈을 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
