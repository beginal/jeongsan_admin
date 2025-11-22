import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function PATCH(request: Request) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const contactEmail = String(body.contactEmail || "").trim();
  const phone = String(body.phone || "").trim();
  const company = String(body.company || "").trim();
  const businessNumber = String(body.businessNumber || "").replace(/\D/g, "");

  if (!name) {
    return NextResponse.json(
      { error: "이름을 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    if (auth.serviceSupabase) {
      const { error } = await auth.serviceSupabase.auth.admin.updateUserById(auth.user.id, {
        user_metadata: {
          name,
          contact_email: contactEmail || null,
          phone_number: phone ? phone.replace(/\D/g, "") : null,
          company_name: company || null,
          business_number: businessNumber || null,
        },
      });
      if (error) {
        return NextResponse.json(
          { error: error.message || "정보를 수정하지 못했습니다." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    const { error } = await auth.supabase.auth.updateUser({
      data: {
        name,
        contact_email: contactEmail || null,
        phone_number: phone ? phone.replace(/\D/g, "") : null,
        company_name: company || null,
        business_number: businessNumber || null,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "정보를 수정하지 못했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "정보를 수정하지 못했습니다." },
      { status: 500 }
    );
  }
}
