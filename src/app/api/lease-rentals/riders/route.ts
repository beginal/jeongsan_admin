import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;

  try {
    const adminId = auth.user.id;

    const { data, error } = await supabase
      .from("riders")
      .select("id, name, phone")
      .eq("created_by", adminId)
      .eq("verification_status", "approved")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "라이더 목록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const riders =
      (data || []).map((r: any) => ({
        id: r.id as string,
        name: r.name || "",
        phone: r.phone || "",
        suffix:
          typeof r.phone === "string" && r.phone.length >= 4
            ? r.phone.slice(-4)
            : "",
      })) || [];

    return NextResponse.json({ riders });
  } catch (e) {
    return NextResponse.json(
      { error: "라이더 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
