"use client";

import { useState } from "react";
import {
  formatAccountForDisplay,
  formatMaskedAccountForDisplay,
} from "@/lib/accountFormat";

interface SensitiveDetailRowProps {
  label: string;
  value?: string | null;
  type?: "ssn" | "account";
  bankName?: string | null;
}

export function SensitiveDetailRow({
  label,
  value,
  type = "ssn",
  bankName,
}: SensitiveDetailRowProps) {
  const [visible, setVisible] = useState(false);

  const normalize = (raw?: string | null) => (raw ? String(raw).trim() : "");

  const formatSsn = (raw?: string | null) => {
    const s = normalize(raw).replace(/\D/g, "");
    if (!s) return "-";
    if (s.length <= 6) return s;
    return `${s.slice(0, 6)}-${s.slice(6)}`;
  };

  const maskValue = (formatted: string) => {
    if (!formatted || formatted === "-") return "-";
    const justDigits = formatted.replace(/\D/g, "");
    if (!justDigits) return "-";

    // 주민번호: 앞 6자리만 보이고 나머지는 마스킹, 형식은 6-7 유지
    if (type === "ssn") {
      if (justDigits.length <= 6) return justDigits;
      const visibleFront = justDigits.slice(0, 6);
      const maskedTail = "*".repeat(justDigits.length - 6);
      const masked = visibleFront + maskedTail;
      return `${masked.slice(0, 6)}-${masked.slice(6)}`;
    }

    // 계좌/기타: 뒷 4자리만 보이게 마스킹
    if (justDigits.length <= 4) return "****";
    const visiblePart = justDigits.slice(-4);
    const maskedDigits =
      "*".repeat(Math.max(justDigits.length - 4, 0)) + visiblePart;

    if (type === "account" && bankName) {
      // 계좌번호: 은행 규칙에 맞춰 마스킹된 숫자에도 하이픈 포맷 적용
      return formatMaskedAccountForDisplay(maskedDigits, bankName);
    }

    return maskedDigits;
  };

  const rawNormalized = normalize(value);
  let formatted: string;
  if (type === "account") {
    formatted = formatAccountForDisplay(rawNormalized, bankName);
  } else {
    formatted = formatSsn(rawNormalized);
  }

  const display = visible ? (formatted || "-") : maskValue(formatted);

  const handleCopy = async () => {
    if (!rawNormalized) return;
    try {
      await navigator.clipboard.writeText(rawNormalized);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-1 items-center justify-between gap-2 text-xs text-foreground">
        <span className="truncate">{display}</span>
        {rawNormalized && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {visible ? "🙈" : "👁"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              ⧉
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
