import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, requireRiderAuth } from "@/lib/auth";

async function resolveRiderId(
  supabase: any,
  user: any,
  token: string
) {
  const meta = (user?.user_metadata as any) || {};
  let riderId = meta?.rider_id || null;
  let phoneDigits: string | null =
    meta?.phone || meta?.phone_number || user?.phone || null;
  if (!phoneDigits && user?.email && user.email.startsWith("rider-")) {
    const m = user.email.match(/^rider-(\d{8,11})@/);
    if (m) phoneDigits = m[1];
  }

  if ((!riderId || riderId === user?.id) && phoneDigits) {
    const { data: riderByPhone } = await supabase
      .from("riders")
      .select("id")
      .eq("phone", phoneDigits)
      .maybeSingle();

    riderId = (riderByPhone as any)?.id || riderId;

    if (!riderId && phoneDigits.length >= 6) {
      const fuzzyPattern = `%${phoneDigits.split("").join("%")}%`;
      const { data: riderByFuzzy } = await supabase
        .from("riders")
        .select("id")
        .ilike("phone", fuzzyPattern)
        .limit(1)
        .maybeSingle();
      riderId = (riderByFuzzy as any)?.id || riderId;
    }

    if (!riderId && phoneDigits.length >= 4) {
      const suffix = phoneDigits.slice(-4);
      const likePattern = `%${suffix}`;
      const { data: riderByLike } = await supabase
        .from("riders")
        .select("id, phone")
        .ilike("phone", likePattern)
        .limit(1)
        .maybeSingle();
      riderId = (riderByLike as any)?.id || riderId;
    }
  }

  if (!riderId && user?.id) {
    const { data: riderByUserId } = await supabase
      .from("riders")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    riderId = (riderByUserId as any)?.id || riderId;
  }

  return { riderId, phone: phoneDigits };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riderOnly = searchParams.get("riderOnly") === "true";
    const riderIdFilter = searchParams.get("riderId")?.trim() || null;
    const q = searchParams.get("q")?.trim().toLowerCase() || "";

    let supabase: any;
    let limitedRiderId: string | null = null;
    let adminUserId: string | null = null;

    if (riderOnly) {
      const riderAuth = await requireRiderAuth();
      if ("response" in riderAuth) return riderAuth.response;
      supabase = riderAuth.supabase;
      const { riderId } = await resolveRiderId(supabase, riderAuth.user, riderAuth.token);
      if (!riderId) {
        return NextResponse.json({ error: "라이더 정보를 찾을 수 없습니다." }, { status: 404 });
      }
      limitedRiderId = riderId;

      // 라이더 전용 조회
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
        .eq("rider_id", limitedRiderId)
        .order("loan_date", { ascending: false });

      if (fetchError) {
        return NextResponse.json(
          { error: "대여금 목록을 불러오지 못했습니다." },
          { status: 500 }
        );
      }

      const { data: scheduleRows, error: scheduleError } = await supabase
        .from("rider_loans")
        .select("rider_id, payment_weekday, payment_amount, loan_date")
        .eq("rider_id", limitedRiderId)
        .order("loan_date", { ascending: false })
        .limit(2000);

      if (scheduleError) {
        return NextResponse.json(
          { error: "대여금 일정 정보를 불러오지 못했습니다." },
          { status: 500 }
        );
      }

      const scheduleByRider: Record<string, { weekday: number | null; amount: number | null }> = {};
      (scheduleRows || []).forEach((row: any) => {
        const rid = row.rider_id;
        if (!rid || scheduleByRider[rid]) return;
        scheduleByRider[rid] = {
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
        .filter((row: { riderName: string }) =>
          q ? row.riderName.toLowerCase().includes(q) : true
        )
        .filter((row: { riderId: string }) =>
          riderIdFilter ? row.riderId === riderIdFilter : true
        );

      return NextResponse.json({ loans });
    } else {
      const adminAuth = await requireAdminAuth();
      if ("response" in adminAuth) return adminAuth.response;
      supabase = adminAuth.serviceSupabase ?? adminAuth.supabase;
      adminUserId = adminAuth.user.id;

      // 소유한 지사/라이더 집합 + 소속 지사를 통한 라이더
      const [ownedBranchesRes, ownedRidersRes] = await Promise.all([
        supabase.from("new_branches").select("id").eq("created_by", adminUserId),
        supabase.from("riders").select("id").eq("created_by", adminUserId),
      ]);
      const branchIds = new Set((ownedBranchesRes.data || []).map((b: any) => String(b.id)));
      const riderIds = new Set((ownedRidersRes.data || []).map((r: any) => String(r.id)));

      // 브랜치 소속 라이더 포함 (상태 무관)
      if (branchIds.size > 0) {
        const { data: rnbRows } = await supabase
          .from("rider_new_branches")
          .select("rider_id")
          .in("new_branch_id", Array.from(branchIds));
        (rnbRows || []).forEach((row: any) => {
          if (row.rider_id) riderIds.add(String(row.rider_id));
        });
      }

      const riderIdList = Array.from(riderIds);
      if (riderIdList.length === 0) {
        return NextResponse.json({ loans: [] });
      }

      let loansQuery = supabase
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
        .order("loan_date", { ascending: false })
        .in("rider_id", riderIdList);

      const { data, error: fetchError } = await loansQuery;

      if (fetchError) {
        const msg = String(fetchError.message || "");
        if (msg.includes("created_by") || msg.toLowerCase().includes("column") && msg.toLowerCase().includes("created_by")) {
          return NextResponse.json({ loans: [] });
        }
        return NextResponse.json(
          { error: "대여금 목록을 불러오지 못했습니다." },
          { status: 500 }
        );
      }

      let scheduleQuery = supabase
        .from("rider_loans")
        .select("rider_id, payment_weekday, payment_amount, loan_date")
        .order("loan_date", { ascending: false })
        .limit(2000)
        .in("rider_id", riderIdList);

      const { data: scheduleRows, error: scheduleError } = await scheduleQuery;
      if (scheduleError) {
        const msg = String(scheduleError.message || "");
        if (msg.includes("created_by") || msg.toLowerCase().includes("column") && msg.toLowerCase().includes("created_by")) {
          // 스케줄 정보 없이도 목록 응답은 가능
        } else {
          return NextResponse.json(
            { error: "대여금 일정 정보를 불러오지 못했습니다." },
            { status: 500 }
          );
        }
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
        .filter((row: { riderName: string }) =>
          q ? row.riderName.toLowerCase().includes(q) : true
        )
        .filter((row: { riderId: string }) =>
          riderOnly
            ? row.riderId === limitedRiderId
            : riderIdFilter
              ? row.riderId === riderIdFilter
              : true
        );

      return NextResponse.json({ loans });
    }
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
  const supabase = auth.supabase;

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
