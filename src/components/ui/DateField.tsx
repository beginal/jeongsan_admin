"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, X } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";

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

function toDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function formatDate(date: Date) {
  return format(date, "yyyy-MM-dd");
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
    return startOfDay(new Date());
  }, []);

  const [viewYear, setViewYear] = useState(() => (parsed || today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (parsed || today).getMonth());
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        (!panelRef.current || !panelRef.current.contains(target))
      ) {
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

  const viewDate = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const startDay = getDay(monthStart);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weeks: Array<Array<{ date: Date | null; disabled?: boolean }>> = [];
  let current: Array<{ date: Date | null; disabled?: boolean }> = [];
  for (let i = 0; i < startDay; i++) current.push({ date: null });
  monthDays.forEach((date) => {
    const disabled =
      Boolean((minDate && date < minDate) || (maxDate && date > maxDate)) || undefined;
    current.push({ date, disabled });
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  });
  if (current.length) {
    while (current.length < 7) current.push({ date: null });
    weeks.push(current);
  }

  const subtitle = format(viewDate, "yyyy년 M월");

  const applyDate = (date: Date) => {
    onChange(formatDate(date));
    setOpen(false);
  };

  useEffect(() => {
    function updatePosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const gap = 8;
      const width = Math.min(Math.max(rect.width, 288), window.innerWidth - gap * 2);
      const left = Math.min(Math.max(rect.left, gap), window.innerWidth - width - gap);
      const top = rect.bottom + gap;
      setPanelPos({ top, left, width });
    }

    if (open) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div className="relative z-10 space-y-1" ref={ref}>
      {label && (
        <div className="text-[11px] font-semibold text-muted-foreground">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </div>
      )}
      <div className="relative">
        <button
          type="button"
          ref={buttonRef}
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

        {open && panelPos &&
          createPortal(
            <div
              ref={panelRef}
              className="fixed z-[120] rounded-lg border border-border bg-card p-3 shadow-xl"
              style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
            >
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted/60"
                  onClick={() => {
                  const next = addMonths(viewDate, -1);
                  setViewYear(next.getFullYear());
                  setViewMonth(next.getMonth());
                }}
              >
                ◀
              </button>
              <span>{subtitle}</span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted/60"
                onClick={() => {
                  const next = addMonths(viewDate, 1);
                  setViewYear(next.getFullYear());
                  setViewMonth(next.getMonth());
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
                  if (!item.date) return <div key={`${wi}-${di}`} className="h-9" />;
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
                      {format(item.date, "d")}
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
            </div>,
            document.body
          )}
      </div>
      {helperText && (
        <div className="text-[11px] text-muted-foreground">{helperText}</div>
      )}
    </div>
  );
}
