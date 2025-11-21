'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassButton } from "@/components/ui/glass/GlassButton";

type SignupFormState = {
  name: string;
  email: string;
  companyName: string;
  businessNumber: string;
  phoneNumber: string;
  password: string;
  passwordConfirm: string;
  agreeAll: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
};

const initialForm: SignupFormState = {
  name: "",
  email: "",
  companyName: "",
  businessNumber: "",
  phoneNumber: "",
  password: "",
  passwordConfirm: "",
  agreeAll: false,
  agreePrivacy: false,
  agreeMarketing: false,
};

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField<K extends keyof SignupFormState>(
    key: K,
    value: SignupFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAllAgreeChange(checked: boolean) {
    setForm((prev) => ({
      ...prev,
      agreeAll: checked,
      agreePrivacy: checked,
      agreeMarketing: checked,
    }));
  }

  function handlePrivacyAgreeChange(checked: boolean) {
    setForm((prev) => {
      const next = { ...prev, agreePrivacy: checked };
      next.agreeAll = next.agreePrivacy && next.agreeMarketing;
      return next;
    });
  }

  function handleMarketingAgreeChange(checked: boolean) {
    setForm((prev) => {
      const next = { ...prev, agreeMarketing: checked };
      next.agreeAll = next.agreePrivacy && next.agreeMarketing;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.agreePrivacy) {
      setError("개인정보 수집 및 이용에 동의해야 회원가입이 가능합니다.");
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "회원가입에 실패했습니다.");
      }

      setSuccess("회원가입이 완료되었습니다. 이제 관리자 로그인을 진행해 주세요.");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              정산봇 관리자 회원가입
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              정산봇을 통해 지사, 라이더, 프로모션 정산을 통합 관리할 사업자 정보를
              등록합니다.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card px-6 py-6 shadow-sm"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  이름
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="홍길동"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  이메일
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="admin@example.com"
                />
                <p className="text-[11px] text-muted-foreground">
                  로그인에 사용하는 이메일입니다.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  연락처
                </label>
                <input
                  type="tel"
                  required
                  value={form.phoneNumber}
                  onChange={(e) =>
                    updateField("phoneNumber", formatPhoneNumber(e.target.value))
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="010-0000-0000"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  회사명
                </label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="정산봇 주식회사"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  사업자등록번호
                </label>
                <input
                  type="text"
                  required
                  value={form.businessNumber}
                  onChange={(e) =>
                    updateField(
                      "businessNumber",
                      formatBusinessNumber(e.target.value)
                    )
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="000-00-00000"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  비밀번호
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="8자 이상, 문자/숫자 포함"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.passwordConfirm}
                  onChange={(e) =>
                    updateField("passwordConfirm", e.target.value)
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="비밀번호를 다시 입력"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-lg bg-muted/40 p-4">
              <div className="flex items-center gap-3">
                <input
                  id="agreeAll"
                  type="checkbox"
                  checked={form.agreeAll}
                  onChange={(e) => handleAllAgreeChange(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-0"
                />
                <label
                  htmlFor="agreeAll"
                  className="cursor-pointer text-xs font-medium text-foreground"
                >
                  전체 약관에 동의합니다.
                </label>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    id="agreePrivacy"
                    type="checkbox"
                    checked={form.agreePrivacy}
                    onChange={(e) =>
                      handlePrivacyAgreeChange(e.target.checked)
                    }
                    className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-0"
                  />
                  <label
                    htmlFor="agreePrivacy"
                    className="cursor-pointer text-xs text-foreground"
                  >
                    개인정보 수집 및 이용 동의{" "}
                    <span className="text-red-500">(필수)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    id="agreeMarketing"
                    type="checkbox"
                    checked={form.agreeMarketing}
                    onChange={(e) =>
                      handleMarketingAgreeChange(e.target.checked)
                    }
                    className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-0"
                  />
                  <label
                    htmlFor="agreeMarketing"
                    className="cursor-pointer text-xs text-foreground"
                  >
                    마케팅 정보 수신 동의{" "}
                    <span className="text-gray-500">(선택)</span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-600" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-3 text-xs text-emerald-600" role="status">
                {success}
              </p>
            )}

            <GlassButton
              type="submit"
              disabled={loading}
              variant="primary"
              size="lg"
              className="mt-5 w-full"
            >
              {loading ? "회원가입 처리 중..." : "회원가입"}
            </GlassButton>
          </form>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-medium text-primary hover:underline"
            >
              로그인하러 가기
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function formatBusinessNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
