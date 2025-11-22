import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "정산봇 - 배달 정산 플랫폼",
  description: "배달 정산 관련 - 나중에 수정 예정",
  icons: {
    icon: "/favicon.png",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("admin-v2-theme")?.value;
  const initialThemeClass = themeCookie === "dark" ? "dark" : undefined;

  return (
    <html lang="en" className={initialThemeClass} suppressHydrationWarning>
      <HeadThemeScript />
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

function HeadThemeScript() {
  return (
    <head>
      <script
        id="theme-init"
        dangerouslySetInnerHTML={{
          __html: `(() => {
  try {
    var storageTheme = localStorage.getItem("admin-v2-theme");
    var cookieMatch = document.cookie.match(/(?:^|; )admin-v2-theme=([^;]+)/);
    var cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = storageTheme === "dark" || storageTheme === "light"
      ? storageTheme
      : cookieTheme === "dark" || cookieTheme === "light"
        ? cookieTheme
        : prefersDark
          ? "dark"
          : "light";
    var root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.style.colorScheme = theme;
    document.cookie = "admin-v2-theme=" + theme + "; path=/; max-age=31536000; SameSite=Lax";
  } catch (e) {}
})();`,
        }}
      />
    </head>
  );
}
