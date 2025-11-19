'use client';

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginMode = "admin" | "rider";

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const sessionStatus = searchParams.get("session");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 라이더 로그인은 아직 백엔드 연동 전이므로 일단 패스
      if (mode === "rider") {
        setError("라이더 로그인은 추후 오픈될 예정입니다.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "로그인에 실패했습니다.");
      }

      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
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

          <div className="mb-3 flex rounded-full bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("admin");
                setError(null);
              }}
              className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors ${
                mode === "admin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              관리자 로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("rider");
                setError(null);
              }}
              className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors ${
                mode === "rider"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              라이더 로그인
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-5 shadow-sm sm:px-6">
            {mode === "admin" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
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
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-9 flex-1 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "로그인 중..." : "관리자 로그인"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/signup")}
                    className="flex h-9 flex-1 items-center justify-center rounded-md border border-primary bg-background text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    관리자 회원가입
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="rider@example.com"
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
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-9 w-full items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
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

