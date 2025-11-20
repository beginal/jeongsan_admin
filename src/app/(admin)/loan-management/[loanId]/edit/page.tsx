import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Wallet } from "lucide-react";
import { LoanEditForm } from "@/components/admin-v2/LoanEditForm";

interface LoanEditPageProps {
  params: Promise<{ loanId: string }>;
}

export default async function LoanEditPage({ params }: LoanEditPageProps) {
  const { loanId } = await params;
  const normalizeDate = (v: any) =>
    typeof v === "string" ? v.split("T")[0] : v ? String(v) : "";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    notFound();
  }

  const supabase = createClient(supabaseUrl!, serviceRoleKey!);

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
      rider:rider_id(name, phone),
      branch:branch_id(display_name, branch_name, province, district)
    `
    )
    .eq("id", loanId)
    .maybeSingle();

  if (loanError || !loan) {
    notFound();
  }

  const { data: payments } = await supabase
    .from("rider_loan_payments")
    .select("id, amount, paid_at, note, cancelled")
    .eq("loan_id", loanId)
    .order("paid_at", { ascending: false });

  const paymentsList =
    payments?.map((p) => ({
      id: p.id as string,
      amount: Number(p.amount || 0),
      paidAt: (p.paid_at as string) || "",
      note: (p.note as string | null) || "",
      cancelled: Boolean((p as any).cancelled),
    })) ?? [];

  const paidAmount =
    paymentsList.reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0;
  const principalAmount = Number(loan.principal_amount || 0);
  const remainingAmount = Math.max(principalAmount - paidAmount, 0);

  const riderName = loan.rider?.name || "";
  const riderPhoneSuffix =
    loan.rider?.phone && loan.rider.phone.length >= 4
      ? loan.rider.phone.slice(-4)
      : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">대여금 관리 / {riderName}</div>
            <h1 className="text-lg font-semibold text-foreground">대여금 정보 수정</h1>
            <p className="text-xs text-muted-foreground">
              총 대여금, 납부 일정, 메모를 수정하세요.
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <Link
            href="/loan-management"
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 font-medium text-muted-foreground hover:text-foreground"
          >
            목록으로
          </Link>
          <button
            type="submit"
            form="loan-edit-form"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            저장
          </button>
        </div>
      </div>

      <LoanEditForm
        formId="loan-edit-form"
        loanId={loan.id as string}
        riderName={riderName}
        riderPhoneSuffix={riderPhoneSuffix}
        principalAmount={principalAmount}
        loanDate={normalizeDate(loan.loan_date)}
        nextPaymentDate={normalizeDate(loan.next_payment_date) || null}
        lastPaymentDate={normalizeDate(loan.last_payment_date) || null}
        notes={(loan.notes as string | null) || ""}
        paymentDayOfWeek={
          loan.payment_weekday === null || loan.payment_weekday === undefined
            ? null
            : Number(loan.payment_weekday)
        }
        paymentAmount={
          loan.payment_amount === null || loan.payment_amount === undefined
            ? null
            : Number(loan.payment_amount)
        }
        dueDate={normalizeDate(loan.due_date) || null}
        paidAmount={paidAmount}
        remainingAmount={remainingAmount}
        payments={paymentsList}
      />
    </div>
  );
}
