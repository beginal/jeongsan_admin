"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ToastTone = "info" | "success" | "error";

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type Listener = (toast: Toast) => void;

const listeners = new Set<Listener>();

export function showToast(message: string, tone: ToastTone = "info") {
  const toast: Toast = { id: crypto.randomUUID(), message, tone };
  listeners.forEach((fn) => fn(toast));
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler: Listener = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3000);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "min-w-[240px] rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur transition",
            "bg-white/90 text-slate-900 border-slate-200 dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-700",
            toast.tone === "success" &&
              "border-emerald-200 text-emerald-900 bg-emerald-50/95 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100",
            toast.tone === "error" &&
              "border-red-200 text-red-900 bg-red-50/95 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100",
            toast.tone === "info" &&
              "border-slate-200 text-slate-900 bg-slate-50/95 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-100"
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
