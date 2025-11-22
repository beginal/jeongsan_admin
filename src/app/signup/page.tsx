"use client";

import { useId, useState, type ReactNode } from "react";
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
  const passwordMismatch =
    form.password.length > 0 &&
    form.passwordConfirm.length > 0 &&
    form.password !== form.passwordConfirm;

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
            noValidate
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1 w-8 rounded-full bg-primary/70" />
              <p className="text-xs font-semibold text-muted-foreground">
                기본 정보
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  이름
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  autoComplete="name"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="홍길동"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="admin@example.com"
                />
                <p className="text-[11px] text-muted-foreground">
                  로그인에 사용하는 이메일입니다.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="phoneNumber"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  연락처
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  value={form.phoneNumber}
                  onChange={(e) =>
                    updateField("phoneNumber", formatPhoneNumber(e.target.value))
                  }
                  maxLength={13}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="010-0000-0000"
                />
                <p className="text-[11px] text-muted-foreground">
                  하이픈은 자동으로 입력됩니다.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="companyName"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  회사명
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  autoComplete="organization"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="정산봇 주식회사"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="businessNumber"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  사업자등록번호
                </label>
                <input
                  id="businessNumber"
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.businessNumber}
                  onChange={(e) =>
                    updateField(
                      "businessNumber",
                      formatBusinessNumber(e.target.value)
                    )
                  }
                  maxLength={12}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="000-00-00000"
                />
              </div>

            </div>

            <div className="mb-2 mt-4 flex items-center gap-2">
              <span className="h-1 w-8 rounded-full bg-primary/70" />
              <p className="text-xs font-semibold text-muted-foreground">
                보안 설정
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  aria-invalid={passwordMismatch}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="8자 이상, 문자/숫자 포함"
                />
                <p className="text-[11px] text-muted-foreground">
                  8자 이상, 숫자와 문자를 조합해 주세요.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="passwordConfirm"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  비밀번호 확인
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.passwordConfirm}
                  aria-invalid={passwordMismatch}
                  onChange={(e) =>
                    updateField("passwordConfirm", e.target.value)
                  }
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="비밀번호를 다시 입력"
                />
                {passwordMismatch && (
                  <p className="text-[11px] text-red-600" role="alert">
                    비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
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

              <div className="space-y-1.5">
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
              <TermsInline title="개인정보 수집·이용 상세">
                <ol className="list-decimal space-y-2 pl-4">
                  <li>
                    수집 항목
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      <li>
                        관리자/사업자: 이름, 이메일(ID), 비밀번호(해시), 휴대전화, 회사명, 사업자등록번호,
                        내부 생성 관리자 ID, 지사/사업자 설정 정보
                      </li>
                      <li>
                        라이더: 이름, 연락처, 주민·외국인등록번호(식별/세무), 라이선스·배민 ID, 소속
                        지사·플랫폼, 승인 상태/사유, 정산·대여금·프로모션 이력, 계좌정보(은행·예금주·계좌),
                        세무용 성명·식별번호
                      </li>
                      <li>
                        정산/업로드 데이터: 업로드한 엑셀 내 오더번호·시간·지사명·정산금액·보험료·지원금·차감내역 등
                      </li>
                      <li>
                        서비스 이용기록: 접속 일시·IP·User-Agent, 세션/쿠키(admin_v2_token 등), 요청/오류 로그,
                        장치 식별 정보, 보안 이벤트
                      </li>
                      <li>문의/고객센터: 문의 내용, 첨부파일, 연락처(도입 시)</li>
                    </ul>
                  </li>
                  <li>
                    이용 목적
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      <li>회원 식별·본인확인, 계정/세션 관리</li>
                      <li>
                        라이더 승인·배정, 지사/사업자 관리, 정산·대여금/리스 관리, 프로모션 운영/정산 지급,
                        세무 신고/증빙
                      </li>
                      <li>결제·정산 처리, 환불, 회계/세무 대응</li>
                      <li>부정 이용·이상거래 탐지, 접근제어, 보안 사고 대응, 로그 기록</li>
                      <li>공지·상담, 법령 준수 및 분쟁 대응, 서비스 품질·프로세스 개선</li>
                    </ul>
                  </li>
                  <li>
                    보유·이용 기간
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      <li>원칙: 탈퇴 또는 목적 달성 시 지체 없이 파기</li>
                      <li>
                        예외(법령): 계약·거래/정산·대여금 5년, 소비자 불만/분쟁 3년, 전자금융거래 5년,
                        접속기록 1년, 세법상 거래·증빙 5년 등 관계법령 보존 후 파기
                      </li>
                    </ul>
                  </li>
                  <li>
                    동의 거부 권리: 동의를 거부할 수 있으나, 필수 항목 미동의 시 회원가입·라이더 관리·정산 기능이
                    제한될 수 있습니다.
                  </li>
                </ol>
              </TermsInline>
          
              <div className="space-y-1.5">
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
              <TermsInline title="마케팅 정보 수신 상세">
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    수집/이용: 이메일, 휴대전화번호, 푸시 토큰, 서비스 이용/정산 이력 일부(맞춤 안내 목적 한정)
                  </li>
                  <li>목적: 이벤트·혜택·신규 기능·서비스 공지, 만족도 조사, 맞춤형 소식 발송</li>
                  <li>수단: 이메일, SMS/MMS, 알림톡/푸시 등(각 메시지에 수신 거부 링크 표시)</li>
                  <li>
                    보유 기간: 동의 철회 또는 탈퇴 시까지. 철회 즉시 발송 중단 및 관련 데이터 파기(법정 보관 예외)
                  </li>
                  <li>
                    권리: 동의하지 않아도 기본 서비스 이용 가능. 마이페이지/문의 등을 통해 언제든 수신 거부·동의 철회
                    가능
                  </li>
                </ul>
              </TermsInline>
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

function TermsInline({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="space-y-2 text-[11px] text-foreground">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-left font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span>{title}</span>
        <span className="text-muted-foreground text-[10px]">{open ? "접기" : "자세히 보기"}</span>
      </button>
      <div
        id={contentId}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden rounded-md border border-dashed border-border/70 bg-card/50 px-3 py-2 text-muted-foreground">
          <div className="space-y-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
