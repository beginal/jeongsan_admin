// 전화번호 유틸: 숫자만 추출, 표시용 포맷, 마스킹

/** 숫자만 추출 (최대 11자리) */
export function parsePhoneDigits(raw?: string | null, maxLen = 11): string {
  return (raw || "").replace(/\D/g, "").slice(0, maxLen);
}

/**
 * 인증/조회용 표준화 숫자 (비어 있으면 null 반환, 뒤에서 11자리까지만 사용)
 * - 기존 parsePhoneDigits는 빈 문자열을 반환했으나, 라이더 식별에서는 null 여부가 중요해 별도 함수로 분리
 */
export function normalizePhoneDigits(raw?: string | null): string | null {
  const digits = parsePhoneDigits(raw);
  return digits ? digits.slice(-11) : null;
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
