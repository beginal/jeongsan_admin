"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon, X } from "lucide-react";

export type DateFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  helperText?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  required,
  min,
  max,
  helperText,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => toDate(value), [value]);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const [viewYear, setViewYear] = useState(() => (parsed || today).getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(() => (parsed || today).getUTCMonth());
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getUTCFullYear());
      setViewMonth(parsed.getUTCMonth());
    }
  }, [parsed]);

  const minDate = useMemo(() => toDate(min || undefined), [min]);
  const maxDate = useMemo(() => toDate(max || undefined), [max]);

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const startDay = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();

  const weeks: Array<Array<{ day: number | null; date?: Date; disabled?: boolean }>> = [];
  let current: Array<{ day: number | null; date?: Date; disabled?: boolean }> = [];
  for (let i = 0; i < startDay; i++) current.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(viewYear, viewMonth, d));
    const disabled =
      (minDate && date < minDate) ||
      (maxDate && date > maxDate);
    current.push({ day: d, date, disabled });
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }
  if (current.length) {
    while (current.length < 7) current.push({ day: null });
    weeks.push(current);
  }

  const subtitle = `${viewYear}년 ${viewMonth + 1}월`;

  const applyDate = (date: Date) => {
    onChange(formatDate(date));
    setOpen(false);
  };

  return (
    <div className="space-y-1" ref={ref}>
      {label && (
        <div className="text-[11px] font-semibold text-muted-foreground">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </div>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-left text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <span className={parsed ? "" : "text-muted-foreground"}>
            {parsed ? formatDate(parsed) : placeholder}
          </span>
          <div className="flex items-center gap-2 text-muted-foreground">
            {parsed && (
              <X
                className="h-4 w-4 cursor-pointer hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
              />
            )}
            <CalendarIcon className="h-4 w-4" />
          </div>
        </button>

        {open && (
          <div className="absolute z-30 mt-2 w-72 rounded-lg border border-border bg-card p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted/60"
                onClick={() => {
                  const next = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
                  setViewYear(next.getUTCFullYear());
                  setViewMonth(next.getUTCMonth());
                }}
              >
                ◀
              </button>
              <span>{subtitle}</span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted/60"
                onClick={() => {
                  const next = new Date(Date.UTC(viewYear, viewMonth + 1, 1));
                  setViewYear(next.getUTCFullYear());
                  setViewMonth(next.getUTCMonth());
                }}
              >
                ▶
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
              {weeks.map((week, wi) =>
                week.map((item, di) => {
                  if (!item.day) return <div key={`${wi}-${di}`} className="h-9" />;
                  const isSelected =
                    parsed &&
                    item.date &&
                    formatDate(item.date) === formatDate(parsed);
                  const disabled = item.disabled;
                  return (
                    <button
                      key={`${wi}-${di}`}
                      type="button"
                      disabled={disabled}
                      className={`h-9 w-full rounded-md border border-transparent text-foreground transition ${
                        disabled
                          ? "cursor-not-allowed text-muted-foreground/60"
                          : "hover:border-primary hover:bg-primary/10"
                      } ${isSelected ? "border-primary bg-primary/15 font-semibold" : ""}`}
                      onClick={() => item.date && applyDate(item.date)}
                    >
                      {item.day}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-border px-2 py-1 hover:border-primary hover:text-foreground"
                  onClick={() => applyDate(today)}
                >
                  오늘
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border px-2 py-1 hover:border-primary hover:text-foreground"
                  onClick={() => onChange("")}
                >
                  지우기
                </button>
              </div>
              <span className="text-[11px] text-muted-foreground">형식: YYYY-MM-DD</span>
            </div>
          </div>
        )}
      </div>
      {helperText && (
        <div className="text-[11px] text-muted-foreground">{helperText}</div>
      )}
    </div>
  );
}
