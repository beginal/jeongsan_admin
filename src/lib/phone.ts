// 전화번호 유틸: 숫자만 추출, 표시용 포맷, 마스킹

/** 숫자만 추출 (최대 11자리) */
export function parsePhoneDigits(raw?: string | null, maxLen = 11): string {
  return (raw || "").replace(/\D/g, "").slice(0, maxLen);
}

/** 표시용 포맷(02/휴대폰 모두 지원) */
export function formatPhone(raw?: string | null): string {
  const digits = parsePhoneDigits(raw);
  if (!digits) return "";

  // 서울(02) 지역번호
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 2)}-${digits.slice(-2)}`;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  // 일반 휴대폰
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

/** 뒤 4자리를 제외하고 마스킹 */
export function maskPhone(raw?: string | null): string {
  const digits = parsePhoneDigits(raw);
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
