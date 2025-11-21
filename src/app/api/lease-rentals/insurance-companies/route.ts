import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;

  try {
    const adminId = auth.user.id;

    const { data, error } = await supabase
      .from("vehicles")
      .select("insurance_company")
      .eq("created_by", adminId)
      .not("insurance_company", "is", null);

    if (error) {
      return NextResponse.json(
        { error: "보험사 목록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const unique = Array.from(
      new Set((data || []).map((r: any) => String(r.insurance_company || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ko"));

    return NextResponse.json({ companies: unique });
  } catch (e) {
    return NextResponse.json(
      { error: "보험사 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
