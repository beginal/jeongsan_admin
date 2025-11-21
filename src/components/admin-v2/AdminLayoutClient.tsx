'use client';

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { AdminSidebar, AdminSidebarMobile } from "@/components/admin-v2/AdminSidebar";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { ToastHost } from "@/components/ui/Toast";

type ThemeMode = "light" | "dark";

interface AdminLayoutClientProps {
  children: ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const refreshingRef = useRef(false);
  const logoutRedirectRef = useRef(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("admin-v2-theme");
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin-v2-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) {
          redirectToLogin();
          return;
        }
        if (!res.ok) throw new Error("세션을 확인하지 못했습니다.");
        const data = await res.json().catch(() => ({}));
        if (!cancelled && typeof data.expiresAt === "number") {
          setExpiresAt(data.expiresAt);
        }
      } catch (e: any) {
        if (!cancelled) setSessionError(e.message || "세션 확인 실패");
      }
    };
    fetchSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(null);
      return;
    }
    const tick = () => setRemainingMs(expiresAt * 1000 - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (remainingMs != null && remainingMs <= 0 && !logoutRedirectRef.current) {
      logoutRedirectRef.current = true;
      router.push("/login?session=expired");
    }
  }, [remainingMs, router]);

  const redirectToLogin = () => {
    if (logoutRedirectRef.current) return;
    logoutRedirectRef.current = true;
    const path =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    const search = new URLSearchParams({ redirect: path }).toString();
    router.replace(`/login?${search}`);
  };

  const refreshSession = async () => {
    if (refreshingRef.current) return;
    const now = Date.now();
    if (lastRefreshedAt && now - lastRefreshedAt < 1500) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setSessionError(null);
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          res.status === 401
            ? "세션이 만료되었습니다. 다시 로그인해 주세요."
            : "세션을 갱신하지 못했습니다.";
        throw Object.assign(new Error(data?.error || message), { status: res.status });
      }
      const data = await res.json().catch(() => ({}));
      if (typeof data.expiresAt === "number") {
        setExpiresAt(data.expiresAt);
        setLastRefreshedAt(Date.now());
      }
    } catch (e: any) {
      setSessionError(e.message || "세션을 갱신하지 못했습니다.");
      if (e?.status === 401) {
        redirectToLogin();
      }
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  };

  const formatRemaining = () => {
    if (remainingMs == null) return "-";
    if (remainingMs <= 0) return "만료됨";
    const totalSeconds = Math.floor(remainingMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const isDanger = remainingMs != null && remainingMs <= 5 * 60 * 1000;

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ToastHost />
      <AdminSidebar />
      <AdminSidebarMobile open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col relative">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/20 bg-background/60 px-4 backdrop-blur-md lg:px-6 transition-all duration-200">
          <div className="flex flex-1 items-center gap-3">
            <GlassButton
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 lg:hidden"
              aria-label="사이드바 열기"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </GlassButton>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface-100/50 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm shadow-sm">
              <span className={isDanger ? "text-red-600 font-semibold" : "text-foreground"}>
                세션 {formatRemaining()}
              </span>
              <GlassButton
                type="button"
                onClick={refreshSession}
                disabled={refreshing}
                variant="primary"
                size="sm"
                className="h-auto px-2.5 py-0.5 text-[10px]"
              >
                {refreshing ? "연장 중..." : "연장"}
              </GlassButton>
            </div>
            <GlassButton
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </GlassButton>
            <GlassButton
              type="button"
              onClick={toggleTheme}
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </GlassButton>
            {sessionError && <span className="text-[11px] text-amber-700">{sessionError}</span>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 scroll-smooth">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
