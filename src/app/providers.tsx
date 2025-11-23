"use client";

import { HydrationBoundary, QueryClient, QueryClientProvider, type DehydratedState } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
  initialTheme?: "light" | "dark";
  dehydratedState?: DehydratedState | null;
};

export default function Providers({ children, initialTheme = "light", dehydratedState }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Avoid unexpected refetches while navigating between heavy admin pages.
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={initialTheme}
      storageKey="admin-v2-theme"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState ?? undefined}>{children}</HydrationBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
