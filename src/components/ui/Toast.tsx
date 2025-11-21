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

  useEffect(() => {
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "min-w-[240px] rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur",
            toast.tone === "success"
              ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100"
              : toast.tone === "error"
                ? "border-red-300/50 bg-red-500/10 text-red-100"
                : "border-slate-300/50 bg-slate-500/10 text-slate-100"
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
