"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassInput } from "@/components/ui/glass/GlassInput";
import { GlassSelect } from "@/components/ui/glass/GlassSelect";
import { GlassTextarea } from "@/components/ui/glass/GlassTextarea";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";
import { showToast } from "@/components/ui/Toast";
import { formatKRW } from "@/lib/format";
import { DateField } from "@/components/ui/DateField";

interface LoanEditFormProps {
  loanId: string;
  riderName: string;
  riderPhoneSuffix?: string;
  principalAmount: number;
  loanDate: string;
  nextPaymentDate: string | null;
  paymentDayOfWeek: number | null;
  paymentAmount: number | null;
  dueDate: string | null;
  lastPaymentDate: string | null;
  notes: string;
  paidAmount: number;
  remainingAmount: number;
  formId?: string;
  payments?: { id: string; amount: number; paidAt: string; note: string; cancelled?: boolean }[];
}

const numberString = z
  .string()
  .trim()
  .transform((v) => (v ?? "").replace(/,/g, ""))
  .transform((v) => (v === "" ? "" : v))
  .refine((v) => v === "" || !Number.isNaN(Number(v)), {
    message: "숫자만 입력하세요.",
  });

const loanSchema = z.object({
  principal: numberString.refine((v) => v !== "", { message: "총 대여금을 입력하세요." }),
  loanDate: z.string().min(1, "대여 일자를 입력하세요."),
  nextPaymentDate: z.string().default(""),
  paymentDayOfWeek: z.string().default(""),
  paymentAmount: numberString.default(""),
  dueDate: z.string().default(""),
  notes: z.string().default(""),
});

type LoanFormValues = z.input<typeof loanSchema>;

export function LoanEditForm({
  loanId,
  riderName,
  riderPhoneSuffix,
  principalAmount,
  loanDate,
  nextPaymentDate,
  paymentDayOfWeek,
  paymentAmount,
  dueDate,
  lastPaymentDate,
  notes,
  paidAmount,
  remainingAmount,
  formId,
  payments: paymentsProp = [],
}: LoanEditFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formDomId = formId || "loan-edit-form";

  const [payments, setPayments] = useState(paymentsProp);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentDate, setNewPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newPaymentNote, setNewPaymentNote] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      principal: Number(principalAmount || 0).toLocaleString(),
      loanDate,
      nextPaymentDate: nextPaymentDate || "",
      paymentDayOfWeek: paymentDayOfWeek != null ? String(paymentDayOfWeek) : "",
      paymentAmount: paymentAmount != null ? Number(paymentAmount).toLocaleString() : "",
      dueDate: dueDate || "",
      notes: notes || "",
    },
  });

  const principalValue = watch("principal") || "";
  const loanDateValue = watch("loanDate") || "";
  const dueDateValue = watch("dueDate") || "";
  const paymentAmountValue = watch("paymentAmount") || "";
  const principalNumber = Number(principalValue.replace(/,/g, "") || 0);
  const totalPaid =
    payments.length > 0
      ? payments.reduce((sum, p) => sum + (p.cancelled ? 0 : Number(p.amount || 0)), 0)
      : paidAmount;
  const remainingCalc = Math.max(principalNumber - totalPaid, 0);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principalAmount: Number(values.principal?.replace(/,/g, "") || 0),
          loanDate: values.loanDate,
          nextPaymentDate: values.nextPaymentDate || null,
          paymentDayOfWeek: values.paymentDayOfWeek ? Number(values.paymentDayOfWeek) : null,
          paymentAmount:
            values.paymentAmount && values.paymentAmount !== ""
              ? Number(values.paymentAmount.replace(/,/g, "") || 0)
              : null,
          dueDate: values.dueDate || null,
          lastPaymentDate,
          notes: values.notes || "",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "수정에 실패했습니다.");
      }
      setMessage("대여금 정보가 저장되었습니다.");
      showToast("대여금 정보를 저장했습니다.", "success");
      router.push("/loan-management");
    } catch (e: any) {
      const msg = e.message || "저장에 실패했습니다.";
      setError(msg);
      showToast(msg, "error");
    }
  });

  const addPayment = async () => {
    const amountNum = Number(newPaymentAmount.replace(/,/g, "") || 0);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("입금 금액을 확인하세요.");
      return;
    }
    setAddingPayment(true);
    setError(null);
    try {
      const res = await fetch(`/api/loans/${loanId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          paidAt: newPaymentDate,
          note: newPaymentNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "입금 기록을 추가하지 못했습니다.");
      }
      const data = await res.json().catch(() => ({}));
      if (data.payment) {
        setPayments((prev) => [data.payment, ...prev]);
        setNewPaymentAmount("");
        setNewPaymentNote("");
      }
      setMessage("입금 기록이 추가되었습니다.");
    } catch (err: any) {
      setError(err.message || "입금 기록 추가에 실패했습니다.");
    } finally {
      setAddingPayment(false);
    }
  };

  const toggleCancelPayment = async (paymentId: string, cancelled: boolean) => {
    try {
      const res = await fetch(`/api/loans/${loanId}/payments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, cancel: !cancelled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "상태 변경 실패");
      }
      setPayments((prev) =>
        prev.map((row) =>
          row.id === paymentId ? { ...row, cancelled: !cancelled } : row
        )
      );
    } catch (err: any) {
      setError(err.message || "취소/복구 실패");
    }
  };

  return (
    <form id={formDomId} onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title="대여금 정보 수정"
        description="대여금 정보와 상환 내역을 관리합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "대여금 관리", href: "/loan-management" },
          { label: "정보 수정", href: "#" },
        ]}
      />

      {/* 기본 설정 */}
      <Section title="기본 설정">
        <div className="grid gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground ml-1">라이더</label>
            <div className="flex h-11 w-full items-center rounded-xl border border-border bg-muted/30 px-4 text-sm text-foreground">
              {riderName}
              {riderPhoneSuffix ? ` (${riderPhoneSuffix})` : ""}
            </div>
          </div>

          <GlassInput
            label="총 대여금"
            value={principalValue}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d,]/g, "");
              setValue("principal", val, { shouldDirty: true, shouldValidate: true });
            }}
            required
            placeholder="0"
            error={errors.principal?.message}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <DateField
                label="대여 일자"
                value={loanDateValue}
                onChange={(v) =>
                  setValue("loanDate", v, { shouldDirty: true, shouldValidate: true })
                }
                required
              />
              {errors.loanDate?.message && (
                <p className="text-[11px] text-red-500 ml-1">{errors.loanDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <DateField
                label="납부 마감일 (선택)"
                value={dueDateValue}
                min={loanDateValue || undefined}
                onChange={(v) =>
                  setValue("dueDate", v, { shouldDirty: true, shouldValidate: true })
                }
              />
              {errors.dueDate?.message && (
                <p className="text-[11px] text-red-500 ml-1">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <GlassSelect
              label="납부 스케줄 (선택)"
              {...register("paymentDayOfWeek")}
            >
              <option value="">설정 안함</option>
              <option value="7">주 정산 시 차감</option>
              <option value="1">월요일</option>
              <option value="2">화요일</option>
              <option value="3">수요일</option>
              <option value="4">목요일</option>
              <option value="5">금요일</option>
              <option value="6">토요일</option>
              <option value="0">일요일</option>
            </GlassSelect>

            <GlassInput
              label="회차 납부 금액 (선택)"
              value={watch("paymentAmount") || ""}
              onChange={(e) =>
                setValue("paymentAmount", e.target.value.replace(/[^\d,]/g, ""), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              placeholder="0"
              error={errors.paymentAmount?.message}
            />
          </div>

          <GlassTextarea
            label="메모"
            {...register("notes")}
            placeholder="대여 조건, 납부 플랜 등 메모를 남겨주세요."
            rows={4}
          />
        </div>
      </Section>

      {/* 개인 입금 추가 */}
      <Section title="개인 입금 추가">
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3 items-end">
            <GlassInput
              label="금액"
              value={newPaymentAmount}
              onChange={(e) => setNewPaymentAmount(e.target.value)}
              placeholder="0"
            />
            <DateField
              label="입금일"
              value={newPaymentDate}
              onChange={setNewPaymentDate}
            />
            <GlassInput
              label="비고"
              value={newPaymentNote}
              onChange={(e) => setNewPaymentNote(e.target.value)}
              placeholder="메모"
            />
          </div>

          <div className="flex justify-end">
            <GlassButton
              type="button"
              disabled={addingPayment}
              onClick={addPayment}
              variant="primary"
              size="md"
            >
              {addingPayment ? "처리 중..." : "입금 추가"}
            </GlassButton>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-center font-medium">입금일</th>
                  <th className="px-4 py-3 text-center font-medium">금액</th>
                  <th className="px-4 py-3 text-center font-medium">비고</th>
                  <th className="px-4 py-3 text-center font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className={p.cancelled ? "bg-muted/30 line-through text-muted-foreground" : "hover:bg-muted/20"}
                  >
                    <td className="px-4 py-3 text-center">{p.paidAt}</td>
                    <td className="px-4 py-3 text-center font-medium">
                      {Number(p.amount || 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.note || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <GlassButton
                        type="button"
                        onClick={() => toggleCancelPayment(p.id, Boolean(p.cancelled))}
                        variant={p.cancelled ? "outline" : "destructive"}
                        size="sm"
                        className={p.cancelled ? "h-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800" : "h-8"}
                      >
                        {p.cancelled ? "복구" : "취소"}
                      </GlassButton>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      등록된 입금 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* 금액 요약 */}
      <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-6 md:grid-cols-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">납부 완료 금액</div>
          <div className="text-xl font-bold text-emerald-600">
            {formatKRW(totalPaid)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">잔여 금액</div>
          <div className="text-xl font-bold text-amber-600">
            {formatKRW(remainingCalc)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">총 대여금</div>
          <div className="text-xl font-bold text-foreground">
            {formatKRW(principalNumber)}
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${message ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {message || error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <GlassButton
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isSubmitting}
        >
          취소
        </GlassButton>
        <GlassButton
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "저장 중..." : "저장"}
        </GlassButton>
      </div>
    </form>
  );
}
