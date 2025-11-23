import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import Providers from "./providers";
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
  const initialTheme = themeCookie === "dark" ? "dark" : "light";

  return (
    <html lang="en" className={initialThemeClass} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers initialTheme={initialTheme}>{children}</Providers>
      </body>
    </html>
  );
}
