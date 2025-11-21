// 상태 라벨/스타일 매핑을 중앙 집중화

export type Tone = "emerald" | "amber" | "red" | "blue" | "slate" | "neutral";

export interface StatusMeta {
  label: string;
  tone: Tone;
}

const riderStatusMap: Record<string, StatusMeta> = {
  approved: { label: "승인됨", tone: "emerald" },
  pending: { label: "대기", tone: "amber" },
  rejected: { label: "반려됨", tone: "red" },
};

const settlementModeMap: Record<string, StatusMeta> = {
  daily: { label: "익일 정산", tone: "blue" },
  weekly: { label: "주 정산", tone: "slate" },
};

const settlementRequestStatusMap: Record<string, StatusMeta> = {
  pending: { label: "승인 대기", tone: "amber" },
  approved: { label: "승인됨", tone: "emerald" },
  rejected: { label: "반려됨", tone: "red" },
};

const promotionStatusMap: Record<string, StatusMeta> = {
  active: { label: "진행 중", tone: "emerald" },
  scheduled: { label: "시작 예정", tone: "amber" },
  ended: { label: "종료", tone: "slate" },
};

const loanStatusMap: Record<string, StatusMeta> = {
  open: { label: "상환 중", tone: "amber" },
  closed: { label: "완납", tone: "emerald" },
  overdue: { label: "연체", tone: "red" },
};

export function getRiderStatusMeta(status?: string | null): StatusMeta {
  return riderStatusMap[status || ""] || riderStatusMap.pending;
}

export function getSettlementModeMeta(mode?: string | null): StatusMeta {
  return settlementModeMap[mode || ""] || settlementModeMap.weekly;
}

export function getSettlementRequestStatusMeta(status?: string | null): StatusMeta {
  return settlementRequestStatusMap[status || ""] || settlementRequestStatusMap.pending;
}

export function getPromotionStatusMeta(status?: string | null): StatusMeta {
  return promotionStatusMap[status || ""] || promotionStatusMap.ended;
}

export function getLoanStatusMeta(status?: string | null): StatusMeta {
  return loanStatusMap[status || ""] || loanStatusMap.open;
}

/** tone에 따른 기본 뱃지 클래스 */
export function badgeToneClass(tone: Tone): string {
  switch (tone) {
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "red":
      return "border-red-200 bg-red-50 text-red-700";
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "slate":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}
