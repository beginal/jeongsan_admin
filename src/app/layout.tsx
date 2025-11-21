import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "정산봇 - 배달 정산 플랫폼",
  description: "배달 정산 관련 - 나중에 수정 예정"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
          __html: `(function(){try{var stored=localStorage.getItem("admin-v2-theme");var prefers=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;if(stored==="dark"||(!stored&&prefers)){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
        }}
      />
    </head>
  );
}
