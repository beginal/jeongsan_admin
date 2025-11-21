"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { DateField } from "@/components/ui/DateField";
import { NumberField, TextAreaField } from "@/components/ui/FormField";

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
  const [principal, setPrincipal] = useState(Number(principalAmount || 0).toLocaleString());
  const [loanDateInput, setLoanDateInput] = useState(loanDate);
  const [nextPaymentInput, setNextPaymentInput] = useState(nextPaymentDate || "");
  const [paymentDayInput, setPaymentDayInput] = useState(
    paymentDayOfWeek != null ? String(paymentDayOfWeek) : ""
  );
  const [paymentAmountInput, setPaymentAmountInput] = useState(
    paymentAmount != null ? Number(paymentAmount).toLocaleString() : ""
  );
  const [dueDateInput, setDueDateInput] = useState(dueDate || "");
  const [noteInput, setNoteInput] = useState(notes);
  const [saving, setSaving] = useState(false);
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

  const principalNumber = Number(principal.replace(/,/g, "") || 0);
  const totalPaid =
    payments.length > 0
      ? payments.reduce((sum, p) => sum + (p.cancelled ? 0 : Number(p.amount || 0)), 0)
      : paidAmount;
  const remainingCalc = Math.max(principalNumber - totalPaid, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principalAmount: Number(principal.replace(/,/g, "") || 0),
          loanDate: loanDateInput,
          nextPaymentDate: nextPaymentInput || null,
          paymentDayOfWeek: paymentDayInput === "" ? null : Number(paymentDayInput),
          paymentAmount:
            paymentAmountInput === "" ? null : Number(paymentAmountInput.replace(/,/g, "") || 0),
          dueDate: dueDateInput || null,
          lastPaymentDate,
          notes: noteInput,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "수정에 실패했습니다.");
      }
      setMessage("대여금 정보가 저장되었습니다.");
      showToast("대여금 정보를 저장했습니다.", "success");
      window.location.href = "/loan-management";
    } catch (e: any) {
      const msg = e.message || "저장에 실패했습니다.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

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
    <form id={formDomId} onSubmit={handleSubmit} className="space-y-4">
      {/* 기본 설정 */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">기본 설정</div>
          <div className="text-[11px] text-muted-foreground">총액 · 스케줄 · 메모</div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="text-[11px] uppercase text-muted-foreground">라이더</div>
          <div className="rounded-md border border-dashed border-border/80 bg-muted/60 px-3 py-2 text-foreground">
            {riderName}
            {riderPhoneSuffix ? ` (${riderPhoneSuffix})` : ""}
          </div>
        </div>

        <div className="space-y-3">
          <NumberField
            label="총 대여금"
            value={principal}
            onChange={(v) => {
              setPrincipal(v || "0");
            }}
            required
            unit="원"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <DateField
              label="대여 일자"
              required
              value={loanDateInput}
              onChange={setLoanDateInput}
            />

            <DateField
              label="납부 마감일 (선택)"
              value={dueDateInput}
              onChange={setDueDateInput}
              helperText="선택 입력"
              min={loanDateInput || undefined}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[11px] font-semibold text-muted-foreground">납부 스케줄 (선택)</span>
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={paymentDayInput}
                onChange={(e) => setPaymentDayInput(e.target.value)}
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
              </select>
            </label>

            <NumberField
              label="회차 납부 금액 (선택)"
              value={paymentAmountInput}
              onChange={setPaymentAmountInput}
              helperText="선택 입력"
              unit="원"
            />
          </div>
        </div>

        <div className="space-y-3">
          <TextAreaField
            label="메모"
            value={noteInput}
            onChange={setNoteInput}
            placeholder="대여 조건, 납부 플랜 등 메모를 남겨주세요."
            minRows={4}
          />
        </div>
      </div>

      {/* 개인 입금 추가 */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">개인 입금 추가</div>
          <div className="text-[11px] text-muted-foreground">직접 입금 기록</div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <NumberField
            label="금액"
            value={newPaymentAmount}
            onChange={setNewPaymentAmount}
            unit="원"
          />
          <label className="space-y-1 text-sm">
            <span className="text-[11px] font-semibold text-muted-foreground">입금일</span>
            <DateField value={newPaymentDate} onChange={setNewPaymentDate} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[11px] font-semibold text-muted-foreground">비고</span>
            <input
              type="text"
              value={newPaymentNote}
              onChange={(e) => setNewPaymentNote(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="메모"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            disabled={addingPayment}
            onClick={addPayment}
            variant="primary"
            size="sm"
            isLoading={addingPayment}
          >
            입금 추가
          </Button>
        </div>

        <div className="overflow-auto rounded-md border border-border bg-card">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-center font-semibold">입금일</th>
                <th className="px-3 py-2 text-center font-semibold">금액</th>
                <th className="px-3 py-2 text-center font-semibold">비고</th>
                <th className="px-3 py-2 text-center font-semibold">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className={p.cancelled ? "bg-muted/50 line-through text-muted-foreground" : ""}
                >
                  <td className="px-3 py-2 text-center">{p.paidAt}</td>
                  <td className="px-3 py-2 text-center">
                    {Number(p.amount || 0).toLocaleString()}원
                  </td>
                  <td className="px-3 py-2 text-center">
                    {p.note || "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <GlassButton
                      type="button"
                      onClick={() => toggleCancelPayment(p.id, Boolean(p.cancelled))}
                      variant={p.cancelled ? "outline" : "destructive"}
                      size="sm"
                      className={p.cancelled ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800" : ""}
                    >
                      {p.cancelled ? "복구" : "취소"}
                    </GlassButton>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-center text-muted-foreground">
                    등록된 입금 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 금액 요약 */}
      <div className="grid gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm md:grid-cols-3">
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground">납부 완료 금액</div>
          <div className="text-base font-semibold text-emerald-700">
            {totalPaid.toLocaleString()}원
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground">잔여 금액</div>
          <div className="text-base font-semibold text-amber-700">
            {remainingCalc.toLocaleString()}원
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground">총 대여금</div>
          <div className="text-base font-semibold text-foreground">
            {principalNumber.toLocaleString()}원
          </div>
        </div>
      </div>

      {(message || error) && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
          {message && <span className="text-emerald-700">{message}</span>}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}
    </form>
  );
}
