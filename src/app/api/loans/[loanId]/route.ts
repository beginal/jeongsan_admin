import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const adminId = auth.user.id;

  const { loanId } = await params;

  try {
    const { data: loan, error: loanError } = await supabase
      .from("rider_loans")
      .select(
        `
        id,
        rider_id,
        branch_id,
        principal_amount,
        loan_date,
        next_payment_date,
      payment_weekday,
      payment_amount,
      due_date,
        last_payment_date,
        notes,
        rider:rider_id(name, phone, created_by),
        branch:branch_id(display_name, branch_name, province, district, created_by)
      `
      )
      .eq("id", loanId)
      .maybeSingle();

    if (loanError || !loan) {
      return NextResponse.json(
        { error: "대여금 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const riderInfoRaw = Array.isArray((loan as any).rider)
      ? (loan as any).rider[0]
      : (loan as any).rider;
    const branchInfoRaw = Array.isArray((loan as any).branch)
      ? (loan as any).branch[0]
      : (loan as any).branch;
    const isOwned =
      (riderInfoRaw?.created_by && riderInfoRaw.created_by === adminId) ||
      (branchInfoRaw?.created_by && branchInfoRaw.created_by === adminId);

    if (!isOwned) {
      return NextResponse.json({ error: "대여금 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const { data: payments } = await supabase
      .from("rider_loan_payments")
      .select("id, amount, paid_at, note")
      .eq("loan_id", loanId)
      .order("paid_at", { ascending: false });

    const paidAmount = (payments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const riderInfo = riderInfoRaw;
    const branchInfo = branchInfoRaw;

    const detail = {
      id: loan.id as string,
      riderId: loan.rider_id as string,
      branchId: loan.branch_id as string | null,
      riderName: riderInfo?.name || "",
      branchName:
        branchInfo?.display_name ||
        branchInfo?.branch_name ||
        [branchInfo?.province, branchInfo?.district].filter(Boolean).join(" ") ||
        "-",
      principalAmount: Number(loan.principal_amount || 0),
      loanDate: (loan.loan_date as string) || "",
      nextPaymentDate: (loan.next_payment_date as string | null) || null,
      lastPaymentDate: (loan.last_payment_date as string | null) || null,
      notes: (loan.notes as string | null) || "",
      paymentDayOfWeek: loan.payment_weekday as number | null,
      paymentAmount: loan.payment_amount != null ? Number(loan.payment_amount) : null,
      dueDate: (loan.due_date as string | null) || null,
      paidAmount,
      remainingAmount: Math.max(
        Number(loan.principal_amount || 0) - paidAmount,
        0
      ),
      payments: (payments || []).map((p) => ({
        id: p.id as string,
        amount: Number(p.amount || 0),
        paidAt: (p.paid_at as string) || "",
        note: (p.note as string | null) || "",
      })),
    };

    return NextResponse.json({ loan: detail });
  } catch (e) {
    return NextResponse.json(
      { error: "대여금 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;
  const adminId = auth.user.id;

  const { loanId } = await params;

  // 소유자 확인을 위해 대여금 기본 정보 조회
  const { data: loanRow, error: loanFetchError } = await supabase
    .from("rider_loans")
    .select(
      `
      id,
      rider_id,
      branch_id,
      rider:rider_id(created_by),
      branch:branch_id(created_by)
    `
    )
    .eq("id", loanId)
    .maybeSingle();

  if (loanFetchError || !loanRow) {
    return NextResponse.json({ error: "대여금 정보를 찾을 수 없습니다." }, { status: 404 });
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
    return NextResponse.json({ error: "대여금 정보를 찾을 수 없습니다." }, { status: 404 });
  }
  const payload = await request.json().catch(() => ({}));

  const principalAmountRaw = payload.principalAmount;
  const loanDate = payload.loanDate;
  const nextPaymentDate = payload.nextPaymentDate || null;
  const paymentDayOfWeek = payload.paymentDayOfWeek ?? null;
  const paymentAmountRaw = payload.paymentAmount;
  const dueDate = payload.dueDate || null;
  const lastPaymentDate = payload.lastPaymentDate || null;
  const notes = payload.notes ?? "";

  const principalAmount = Number(principalAmountRaw);
  if (!Number.isFinite(principalAmount) || principalAmount < 0) {
    return NextResponse.json(
      { error: "총 대여금은 0 이상 숫자여야 합니다." },
      { status: 400 }
    );
  }
  if (paymentDayOfWeek != null && !(paymentDayOfWeek >= 0 && paymentDayOfWeek <= 7)) {
    return NextResponse.json(
      { error: "납부 요일을 확인하세요." },
      { status: 400 }
    );
  }
  const paymentAmount =
    paymentAmountRaw == null || paymentAmountRaw === ""
      ? null
      : Number(paymentAmountRaw);
  if (paymentAmount != null && (!Number.isFinite(paymentAmount) || paymentAmount < 0)) {
    return NextResponse.json(
      { error: "납부 금액은 0 이상 숫자여야 합니다." },
      { status: 400 }
    );
  }
  if (!loanDate) {
    return NextResponse.json(
      { error: "대여 일자를 입력하세요." },
      { status: 400 }
    );
  }

  try {
    const { error: updateError } = await supabase
      .from("rider_loans")
      .update({
        principal_amount: principalAmount,
        loan_date: loanDate,
        next_payment_date: nextPaymentDate,
        payment_weekday: paymentDayOfWeek,
        payment_amount: paymentAmount,
        due_date: dueDate,
        last_payment_date: lastPaymentDate,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loanId);

    if (updateError) {
      return NextResponse.json(
        { error: "대여금 정보를 수정하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "대여금 정보를 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
