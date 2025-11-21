import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";
    const riderOnly = searchParams.get("riderOnly") === "true";
    const riderIdFilter = searchParams.get("riderId")?.trim();

    const { data, error: fetchError } = await supabase
      .from("rider_loan_summaries")
      .select(
        `
        id,
        rider_id,
        branch_id,
        total_loan,
        paid_amount,
        remaining_amount,
        loan_date,
        payment_date,
        next_payment_date,
        last_paid_at,
        rider:rider_id(name),
        branch:branch_id(display_name, branch_name, province, district)
      `
      )
      .order("loan_date", { ascending: false });

    const { data: scheduleRows } = await supabase
      .from("rider_loans")
      .select("rider_id, payment_weekday, payment_amount, loan_date")
      .order("loan_date", { ascending: false })
      .limit(2000);

    if (fetchError) {
      return NextResponse.json(
        { error: "대여금 목록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const scheduleByRider: Record<string, { weekday: number | null; amount: number | null }> = {};
    (scheduleRows || []).forEach((row: any) => {
      const riderId = row.rider_id;
      if (!riderId) return;
      if (scheduleByRider[riderId]) return; // 이미 최신건 세팅됨
      scheduleByRider[riderId] = {
        weekday:
          row.payment_weekday === null || row.payment_weekday === undefined
            ? null
            : Number(row.payment_weekday),
        amount:
          row.payment_amount === null || row.payment_amount === undefined
            ? null
            : Number(row.payment_amount),
      };
    });

    const loansRaw = (data || []).map((row: any) => {
      const riderName = row.rider?.name || "";
      const branchName =
        row.branch?.display_name ||
        row.branch?.branch_name ||
        [row.branch?.province, row.branch?.district].filter(Boolean).join(" ") ||
        "-";

      return {
        id: row.id as string,
        riderId: row.rider_id as string,
        riderName,
        branchName,
        paymentWeekday: scheduleByRider[row.rider_id]?.weekday ?? null,
        paymentAmount: scheduleByRider[row.rider_id]?.amount ?? null,
        totalLoan: Number(row.total_loan || 0),
        paidAmount: Number(row.paid_amount || 0),
        remainingAmount: Number(row.remaining_amount || 0),
        loanDate: row.loan_date as string,
        paymentDate: (row.payment_date as string | null) || null,
        nextPaymentDate: (row.next_payment_date as string | null) || null,
        lastPaidAt: (row.last_paid_at as string | null) || null,
      };
    });

    const loans = loansRaw
      .filter((row) => (q ? row.riderName.toLowerCase().includes(q) : true))
      .filter((row) => (riderOnly && riderIdFilter ? row.riderId === riderIdFilter : true));

    return NextResponse.json({ loans });
  } catch (e) {
    return NextResponse.json(
      { error: "대여금 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;

  const body = await request.json().catch(() => ({}));
  const riderId = body.riderId as string | undefined;
  const branchId = body.branchId as string | undefined;
  const principalAmount = Number(body.principalAmount);
  const loanDate = body.loanDate as string | undefined;
  const paymentWeekday = body.paymentDayOfWeek;
  const paymentAmountRaw = body.paymentAmount;
  const dueDate = body.dueDate || null;
  const nextPaymentDate = null;
  const notes = body.notes || "";

  if (!riderId) {
    return NextResponse.json({ error: "라이더를 선택하세요." }, { status: 400 });
  }
  if (paymentWeekday != null && !(paymentWeekday >= 0 && paymentWeekday <= 7)) {
    return NextResponse.json({ error: "납부 요일을 확인하세요." }, { status: 400 });
  }
  const paymentAmount =
    paymentAmountRaw == null || paymentAmountRaw === ""
      ? null
      : Number(paymentAmountRaw);
  if (paymentAmount != null && (!Number.isFinite(paymentAmount) || paymentAmount < 0)) {
    return NextResponse.json({ error: "납부 금액은 0 이상 숫자여야 합니다." }, { status: 400 });
  }
  if (!Number.isFinite(principalAmount) || principalAmount < 0) {
    return NextResponse.json({ error: "총 대여금은 0 이상 숫자여야 합니다." }, { status: 400 });
  }
  if (!loanDate) {
    return NextResponse.json({ error: "대여 일자를 입력하세요." }, { status: 400 });
  }

  const createdBy: string | null = auth.user.id || null;

  try {
    const { data, error: insertError } = await supabase
      .from("rider_loans")
      .insert({
        rider_id: riderId,
        branch_id: branchId || null,
        principal_amount: principalAmount,
        loan_date: loanDate,
        next_payment_date: nextPaymentDate,
        payment_weekday: paymentWeekday ?? null,
        payment_amount: paymentAmount,
        due_date: dueDate,
        notes: notes || null,
        created_by: createdBy,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !data) {
      return NextResponse.json(
        { error: "대여금 정보를 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (e) {
    return NextResponse.json(
      { error: "대여금 정보를 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
