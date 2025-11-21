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
    <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "min-w-[260px] max-w-[90vw] rounded-lg px-4 py-3 text-sm shadow-lg backdrop-blur transition border",
            "bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700",
            toast.tone === "success" &&
              "border-success-200 text-success-900 bg-success-50 dark:border-success-500/50 dark:bg-success-500/15 dark:text-success-100",
            toast.tone === "error" &&
              "border-danger-200 text-danger-900 bg-danger-50 dark:border-danger-500/50 dark:bg-danger-500/15 dark:text-danger-100",
            toast.tone === "info" &&
              "border-info-200 text-info-900 bg-info-50 dark:border-info-500/40 dark:bg-info-500/15 dark:text-info-100"
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
