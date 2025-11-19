"use client";

// 로컬 복사본: src/lib/validators.ts의 은행별 포맷 로직과 동일하게 유지

const bankAccountRules: Record<
  string,
  { maxLength: number; formatLength: number; pattern: RegExp }
> = {
  "국민은행": {
    maxLength: 14,
    formatLength: 16,
    pattern: /(\d{6})(\d{2})(\d{6})/,
  }, // 6-2-6 (123456-12-123456)
  "신한은행": {
    maxLength: 11,
    formatLength: 13,
    pattern: /(\d{3})(\d{2})(\d{6})/,
  }, // 3-2-6 (110-12-123456)
  "우리은행": {
    maxLength: 13,
    formatLength: 15,
    pattern: /(\d{4})(\d{3})(\d{6})/,
  }, // 4-3-6 (1002-123-123456)
  "하나은행": {
    maxLength: 14,
    formatLength: 16,
    pattern: /(\d{3})(\d{6})(\d{5})/,
  }, // 3-6-5 (123-123456-12345)
  "NH농협은행": {
    maxLength: 13,
    formatLength: 16,
    pattern: /(\d{3})(\d{4})(\d{4})(\d{2})/,
  }, // 3-4-4-2 (351-1234-1234-12)
  "농협은행": {
    maxLength: 13,
    formatLength: 16,
    pattern: /(\d{3})(\d{4})(\d{4})(\d{2})/,
  }, // 3-4-4-2 (351-1234-1234-12)
  "기업은행": {
    maxLength: 14,
    formatLength: 17,
    pattern: /(\d{3})(\d{6})(\d{2})(\d{3})/,
  }, // 3-6-2-3 (010-123456-12-123)
  "카카오뱅크": {
    maxLength: 13,
    formatLength: 15,
    pattern: /(\d{4})(\d{2})(\d{7})/,
  }, // 4-2-7 (3333-12-1234567)
  "토스뱅크": {
    maxLength: 16,
    formatLength: 19,
    pattern: /(\d{4})(\d{4})(\d{4})(\d{4})/,
  }, // 4-4-4-4 (1000-1000-1000-1000)
  "케이뱅크": {
    maxLength: 12,
    formatLength: 14,
    pattern: /(\d{3})(\d{3})(\d{6})/,
  }, // 3-3-6 (100-100-123456)
};

export function getAccountMaxDigits(bankName?: string | null): number {
  if (!bankName) return 20;
  const rule = bankAccountRules[bankName];
  return rule ? rule.maxLength : 20;
}

function formatAccountNumber(value: string, bankName?: string): string {
  const numbers = value.replace(/\D/g, "");
  if (!bankName || !numbers) return numbers;

  const rule = bankAccountRules[bankName];
  if (rule) {
    const limitedNumbers = numbers.slice(0, rule.maxLength);

    switch (bankName) {
      case "국민은행":
        if (limitedNumbers.length >= 8) {
          return limitedNumbers.replace(
            /(\d{6})(\d{2})(\d{6})/,
            "$1-$2-$3"
          );
        }
        break;
      case "신한은행":
        if (limitedNumbers.length >= 7) {
          return limitedNumbers.replace(
            /(\d{3})(\d{2})(\d{6})/,
            "$1-$2-$3"
          );
        }
        break;
      case "우리은행":
        if (limitedNumbers.length >= 10) {
          return limitedNumbers.replace(
            /(\d{4})(\d{3})(\d{6})/,
            "$1-$2-$3"
          );
        }
        break;
      case "하나은행":
        if (limitedNumbers.length >= 11) {
          return limitedNumbers.replace(
            /(\d{3})(\d{6})(\d{5})/,
            "$1-$2-$3"
          );
        }
        break;
      case "NH농협은행":
      case "농협은행":
        if (limitedNumbers.length >= 11) {
          return limitedNumbers.replace(
            /(\d{3})(\d{4})(\d{4})(\d{2})/,
            "$1-$2-$3-$4"
          );
        }
        break;
      case "기업은행":
        if (limitedNumbers.length >= 11) {
          return limitedNumbers.replace(
            /(\d{3})(\d{6})(\d{2})(\d{3})/,
            "$1-$2-$3-$4"
          );
        }
        break;
      case "카카오뱅크":
        if (limitedNumbers.length >= 10) {
          return limitedNumbers.replace(
            /(\d{4})(\d{2})(\d{7})/,
            "$1-$2-$3"
          );
        }
        break;
      case "토스뱅크":
        if (limitedNumbers.length >= 12) {
          return limitedNumbers.replace(
            /(\d{4})(\d{4})(\d{4})(\d{4})/,
            "$1-$2-$3-$4"
          );
        }
        break;
      case "케이뱅크":
        if (limitedNumbers.length >= 9) {
          return limitedNumbers.replace(
            /(\d{3})(\d{3})(\d{6})/,
            "$1-$2-$3"
          );
        }
        break;
    }

    return limitedNumbers;
  }

  const limitedNumbers = numbers.slice(0, 20);
  if (limitedNumbers.length > 4) {
    return limitedNumbers.replace(/(\d{4})(?=\d)/g, "$1-");
  }
  return limitedNumbers;
}

export function formatAccountForDisplay(
  raw: string | null | undefined,
  bankName?: string | null
): string {
  if (!raw) return "-";
  const formatted = formatAccountNumber(String(raw), bankName || undefined);
  return formatted || String(raw);
}

// 마스킹된 계좌번호(숫자 + *)에 대해서도 은행 규칙에 맞춰 하이픈 포맷팅
export function formatMaskedAccountForDisplay(
  masked: string,
  bankName?: string | null
): string {
  if (!masked) return "";
  const s = masked.replace(/[^0-9\*]/g, "");
  if (!s) return "";

  const segMap: Record<string, number[]> = {
    "국민은행": [6, 2, 6],
    "신한은행": [3, 2, 6],
    "우리은행": [4, 3, 6],
    "NH농협은행": [3, 4, 4, 2],
    "농협은행": [3, 4, 4, 2],
    "기업은행": [3, 6, 2, 3],
    "카카오뱅크": [4, 2, 7],
    "토스뱅크": [4, 4, 4, 4],
    "케이뱅크": [3, 3, 6],
  };

  const segments = bankName && segMap[bankName] ? segMap[bankName] : [];
  if (segments.length === 0) {
    let out = "";
    for (let i = 0; i < s.length; i++) {
      if (i > 0 && i % 4 === 0) out += "-";
      out += s[i];
    }
    return out;
  }

  let out = "";
  let idx = 0;
  for (let si = 0; si < segments.length && idx < s.length; si++) {
    const segLen = segments[si];
    const take = Math.min(segLen, s.length - idx);
    out += s.slice(idx, idx + take);
    idx += take;
    if (idx < s.length && si < segments.length - 1) out += "-";
  }
  if (idx < s.length) {
    for (let i = idx; i < s.length; i++) {
      if (i > idx && (i - idx) % 4 === 0) out += "-";
      out += s[i];
    }
  }
  return out;
}
