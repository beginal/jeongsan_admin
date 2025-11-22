'use client';

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginMode = "admin" | "rider";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const sessionStatus = searchParams.get("session");

  const [adminEmail, setAdminEmail] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint =
        mode === "admin" ? "/api/auth/login" : "/api/auth/login-rider";
      const payload =
        mode === "admin"
          ? { email: adminEmail.trim(), password }
          : { phone: riderPhone.replace(/\D/g, ""), password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "로그인에 실패했습니다.");
      }

      if (mode === "rider") {
        router.push("/rider");
      } else {
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError(err.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              정산봇 로그인
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              관리자와 라이더 계정을 각각 분리해서 관리합니다.
            </p>
          </div>

          {sessionStatus === "expired" && !error && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              세션이 만료되어 자동으로 로그아웃되었습니다. 다시 로그인해 주세요.
            </div>
          )}

          <div className="mb-4 flex rounded-full bg-muted/70 p-1 text-xs shadow-sm">
            <button
              type="button"
              aria-pressed={mode === "admin"}
              onClick={() => {
                setMode("admin");
                setError(null);
              }}
              className={`flex-1 rounded-full px-3 py-2 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                mode === "admin"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              관리자 로그인
            </button>
            <button
              type="button"
              aria-pressed={mode === "rider"}
              onClick={() => {
                setMode("rider");
                setError(null);
              }}
              className={`flex-1 rounded-full px-3 py-2 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                mode === "rider"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              라이더 로그인
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-5 shadow-md sm:px-6">
            {error && (
              <div
                className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            {mode === "admin" ? (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1">
                  <label
                    htmlFor="admin-email"
                    className="block text-xs font-medium text-muted-foreground"
                  >
                    이메일
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    required
                    value={adminEmail}
                    aria-invalid={Boolean(error)}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                    }}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder="admin@example.com"
                  />
                </div>

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
                    autoComplete="current-password"
                    required
                    value={password}
                    aria-invalid={Boolean(error)}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder="8자 이상, 문자/숫자 포함"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    8자 이상, 숫자/문자 포함 비밀번호를 입력해 주세요.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "로그인 중..." : "관리자 로그인"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/signup")}
                    className="flex h-10 flex-1 items-center justify-center rounded-md border border-primary/70 bg-background text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                  >
                    관리자 회원가입
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1">
                  <label
                    htmlFor="phone"
                    className="block text-xs font-medium text-muted-foreground"
                  >
                    휴대폰 번호
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                    value={riderPhone}
                    aria-invalid={Boolean(error)}
                    onChange={(e) => setRiderPhone(formatPhone(e.target.value))}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder="010-0000-0000"
                    maxLength={13}
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="password-rider"
                    className="block text-xs font-medium text-muted-foreground"
                  >
                    비밀번호
                  </label>
                  <input
                    id="password-rider"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    aria-invalid={Boolean(error)}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder="8자 이상, 문자/숫자 포함"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    가입 시 설정한 비밀번호를 입력해 주세요.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "로그인 중..." : "라이더 로그인"}
                </button>
              </form>
            )}
          </div>

          <div className="mt-4 space-y-1 text-center text-[11px] text-muted-foreground">
            <p>
              관리자 계정이 필요하다면 시스템 담당자에게 별도로 회원가입/권한
              생성을 요청하거나{" "}
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="font-medium text-primary hover:underline"
              >
                회원가입
              </button>
              을 진행하세요.
            </p>
            <p>
              라이더 로그인 및 회원가입 플로우는 추후 이 화면에서 통합 지원될
              예정입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
