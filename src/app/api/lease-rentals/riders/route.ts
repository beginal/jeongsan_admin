import { cookies } from "next/headers";
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

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_v2_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = createClient(supabaseUrl, serviceRoleKey);
    const {
      data: { user },
    } = await auth.auth.getUser(token);
    const adminId = user?.id;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

