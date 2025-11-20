import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "Supabase 환경 변수가 설정되지 않았습니다." };
  }

  return { supabase: createClient(supabaseUrl, serviceRoleKey) };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const { supabase, error } = getSupabase();
  if (error || !supabase) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const { loanId } = await params;
  const body = await request.json().catch(() => ({}));
  const amountRaw = body.amount;
  const paidAt = body.paidAt || new Date().toISOString().split("T")[0];
  const note = body.note || "";

  const amount = Number(String(amountRaw).replace(/,/g, "") || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "납부 금액은 0보다 큰 숫자여야 합니다." },
      { status: 400 }
    );
  }

  try {
    const { data: loanRow, error: loanError } = await supabase
      .from("rider_loans")
      .select("id, rider_id")
      .eq("id", loanId)
      .maybeSingle();

    if (loanError || !loanRow) {
      return NextResponse.json(
        { error: "대여금 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    let createdBy: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("admin_v2_token")?.value;
      if (token) {
        const { data } = await supabase.auth.getUser(token);
        createdBy = data.user?.id || null;
      }
    } catch {
      // ignore
    }

    const { data: inserted, error: insertError } = await supabase
      .from("rider_loan_payments")
      .insert({
        loan_id: loanId,
        rider_id: loanRow.rider_id,
        amount,
        paid_at: paidAt,
        note: note || null,
        created_by: createdBy,
        cancelled: false,
      })
      .select("id, amount, paid_at, note, cancelled")
      .maybeSingle();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: "납부 기록을 추가하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payment: {
        id: inserted.id as string,
        amount: Number(inserted.amount || 0),
        paidAt: inserted.paid_at as string,
        note: (inserted.note as string | null) || "",
        cancelled: Boolean(inserted.cancelled),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "납부 기록을 추가하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const { supabase, error } = getSupabase();
  if (error || !supabase) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const { loanId } = await params;
  const body = await request.json().catch(() => ({}));
  const paymentId = body.paymentId as string | undefined;
  const cancel = body.cancel === true;

  if (!paymentId) {
    return NextResponse.json(
      { error: "취소할 납부 기록을 선택하세요." },
      { status: 400 }
    );
  }

  try {
    const { error: updateError } = await supabase
      .from("rider_loan_payments")
      .update({ cancelled: cancel })
      .eq("id", paymentId)
      .eq("loan_id", loanId);

    if (updateError) {
      return NextResponse.json(
        { error: "납부 기록을 취소하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "납부 기록을 취소하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
