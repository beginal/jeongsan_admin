import { format as formatDateFns, parseISO, isValid } from "date-fns";

export function formatKRW(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "₩0";
  return `₩${Number(value).toLocaleString("ko-KR")}`;
}

export function formatDate(value: string | Date | null | undefined, fallback = "-") {
  if (!value) return fallback;
  const date = value instanceof Date ? value : parseISO(String(value));
  if (!isValid(date)) return fallback;
  return formatDateFns(date, "yyyy-MM-dd");
}
