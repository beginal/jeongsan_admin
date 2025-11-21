import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const adminId = auth.user.id;

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
      .select(
        `id, rider_id, branch_id, rider:rider_id(created_by), branch:branch_id(created_by)`
      )
      .eq("id", loanId)
      .maybeSingle();

    if (loanError || !loanRow) {
      return NextResponse.json(
        { error: "대여금 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const riderInfo = Array.isArray((loanRow as any).rider)
      ? (loanRow as any).rider[0]
      : (loanRow as any).rider;
    const branchInfo = Array.isArray((loanRow as any).branch)
      ? (loanRow as any).branch[0]
      : (loanRow as any).branch;
    const isOwned =
      (riderInfo?.created_by && riderInfo.created_by === adminId) ||
      (branchInfo?.created_by && branchInfo.created_by === adminId);
    if (!isOwned) {
      return NextResponse.json(
        { error: "대여금 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const createdBy: string | null = auth.user.id || null;

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
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const adminId = auth.user.id;

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
    const { data: loanRow, error: loanError } = await supabase
      .from("rider_loans")
      .select(
        `id, rider_id, branch_id, rider:rider_id(created_by), branch:branch_id(created_by)`
      )
      .eq("id", loanId)
      .maybeSingle();

    const riderInfo = Array.isArray((loanRow as any)?.rider)
      ? (loanRow as any).rider[0]
      : (loanRow as any)?.rider;
    const branchInfo = Array.isArray((loanRow as any)?.branch)
      ? (loanRow as any).branch[0]
      : (loanRow as any)?.branch;
    const isOwned =
      loanRow &&
      ((riderInfo?.created_by && riderInfo.created_by === adminId) ||
        (branchInfo?.created_by && branchInfo.created_by === adminId));

    if (loanError || !loanRow || !isOwned) {
      return NextResponse.json(
        { error: "대여금 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

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
