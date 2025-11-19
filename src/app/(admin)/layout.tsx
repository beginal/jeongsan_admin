'use client';

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { AdminSidebar, AdminSidebarMobile } from "@/components/admin-v2/AdminSidebar";

type ThemeMode = "light" | "dark";

interface AdminV2LayoutProps {
  children: ReactNode;
}

export default function AdminV2Layout({ children }: AdminV2LayoutProps) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-slate-900">
      <AdminSidebar />
      <AdminSidebarMobile open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:px-6">
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="사이드바 열기"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:text-foreground dark:border-slate-700 dark:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:text-foreground dark:border-slate-700 dark:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/30 px-4 py-6 dark:bg-slate-950 lg:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
