"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, ShieldCheck, Trash2, RefreshCcw } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import SettlementRowDrawer from "@/components/admin-v2/SettlementRowDrawer";
import { utils, writeFile } from "xlsx";

type BranchOption = {
  id: string;
  name: string;
  displayName?: string;
  branchName?: string;
  province?: string;
  district?: string;
  platform?: string;
  corporateName?: string | null;
  personalName?: string | null;
  feeType?: "per_case" | "percentage" | null;
  feeValue?: number | null;
};

type BranchRider = {
  id: string;
  name: string;
  phone: string;
  phoneSuffix: string;
};

type RentalFeeMap = Record<string, number>;

type PromotionOption = {
  id: string;
  name: string;
  status: "active" | "scheduled" | "ended";
  config?: any;
  startDate?: string | null;
  endDate?: string | null;
};

type PromotionDetail = {
  type?: string;
  summaryLines?: string[];
  peakLines?: string[];
  typeLabel?: string;
  startDate?: string | null;
  endDate?: string | null;
  assignments?: Record<
    string,
    { startDate: string | null; endDate: string | null; active?: boolean }
  >;
};

type UploadEntry = {
  id: string;
  file: File;
  password: string;
  branchId: string | null;
  guessed: string | null;
};

type ParsedFileResult = {
  summaries: {
    licenseId: string;
    riderName: string;
    riderNameRaw: string;
    totalOrders: number;
    branchName: string;
    settlementAmount: number;
    supportTotal: number;
    deduction: number;
    totalSettlement: number;
    fee: number;
    employment: number;
    accident: number;
    timeInsurance: number;
    retro: number;
  }[];
  _sourceFile?: string;
  _branchId?: string | null;
  _branchLabel?: string | null;
  details: {
    licenseId: string;
    riderName: string;
    riderSuffix?: string;
    branchName: string;
    orderNo: string;
    acceptedAt: string;
    acceptedAtMs: number;
    peakTime: string;
    judgementDate: string;
  }[];
  missions: Record<string, any>[];
};

type PeakCount = {
  Breakfast: number;
  Lunch_Peak: number;
  Post_Lunch: number;
  Dinner_Peak: number;
  Post_Dinner: number;
  total: number;
};

type AggRider = {
  key: string;
  licenseId: string;
  riderName: string;
  riderSuffix: string;
  totalOrders: number;
  branchCounts: Record<string, number>;
  peakByDate: Record<string, PeakCount>;
  peakByBranch: Record<string, Record<string, PeakCount>>;
  details: ParsedFileResult["details"];
};

type SummaryFinancial = {
  branchName: string;
  settlementAmount: number;
  supportTotal: number;
  deduction: number;
  totalSettlement: number;
  fee: number;
  employment: number;
  accident: number;
  timeInsurance: number;
  retro: number;
};

type RawRiderSummary = {
  key: string;
  licenseId: string;
  riderName: string;
  riderSuffix: string;
  rawName: string;
  branchName: string;
  orderCount: number;
  fin: SummaryFinancial;
  sourceFile?: string;
};

type Step3Row = {
  key: string;
  licenseId: string;
  riderName: string;
  riderSuffix: string;
  branchName: string;
  orderCount: number;
  loanPayment: number;
  rentCost: string;
  nextDaySettlement: number;
  actualDeposit: number;
  payout: string;
  fee: number;
  peakScore: string;
  promoBasis: string;
  promoAmount: number;
  settlementAmount: number;
  supportTotal: number;
  deduction: number;
  totalSettlement: number;
  overallTotal: number;
  employment: number;
  accident: number;
  timeInsurance: number;
  retro: number;
  withholding: number;
  matchedRiderId?: string;
  matchedRiderName?: string;
  rentCostValue?: number;
  isChild?: boolean;
  parentKey?: string;
  sourceFile?: string;
};

const excelAccept = ".xls,.xlsx,.xlsm";

const statusClass = (s: PromotionOption["status"]) => {
  if (s === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "scheduled") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

const redCellClass =
  "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-100";
const blueCellClass =
  "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-100";
const purpleCellClass =
  "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-100";

const buildPromotionSummary = (type?: string, cfgRaw?: Record<string, any>) => {
  const cfg = cfgRaw?.config ? cfgRaw.config : cfgRaw;
  const lines: string[] = [];
  const typeLabel =
    type === "excess"
      ? "건수 초과 보상"
      : type === "milestone"
        ? "목표 달성 보상"
        : type === "milestone_per_unit"
          ? "단위당 보상"
          : type || "";

  if (!cfg) return { lines, peakLines: [], typeLabel };

  if (type === "excess") {
    const src = cfg.excess ?? cfg;
    const threshold =
      src.threshold ?? src.targetCount ?? src.base_count ?? src.count ?? 0;
    const amt =
      src.amountPerExcess ??
      src.amount ??
      src.amount_per_excess ??
      src.excess_amount ??
      0;
    lines.push(`임계 ${Number(threshold).toLocaleString()}건 초과 시 +${Number(amt).toLocaleString()}원/건`);
  } else if (type === "milestone") {
    const srcTop: any =
      cfg.milestones ?? cfg.milestone ?? cfg.tiers ?? cfg.levels ?? [];
    const ms: any[] = Array.isArray(srcTop)
      ? srcTop
      : Array.isArray(srcTop?.tiers)
        ? srcTop.tiers
        : Array.isArray(srcTop?.levels)
          ? srcTop.levels
          : [];
    ms.forEach((m: any, idx: number) => {
      const threshold =
        m.threshold ?? m.targetCount ?? m.target_count ?? m.base_count ?? 0;
      const amount =
        m.amount ??
        m.rewardAmount ??
        m.reward_amount ??
        m.value ??
        0;
      lines.push(
        `단계${idx + 1}: ${Number(threshold || 0).toLocaleString()}건 → ${Number(amount || 0).toLocaleString()}원`
      );
    });
  } else if (type === "milestone_per_unit") {
    const arrTop: any =
      cfg.milestonePerUnit ?? cfg.milestone_per_unit ?? cfg.tiers ?? cfg.levels;
    const arr: any[] = Array.isArray(arrTop) ? arrTop : Array.isArray(arrTop?.tiers) ? arrTop.tiers : [];
    arr.forEach((m: any, idx: number) => {
      const threshold = m.threshold ?? m.start ?? m.base_count ?? 0;
      const unitSize = m.unitSize ?? m.size ?? m.per ?? 0;
      const unitAmount = m.unitAmount ?? m.amount ?? m.unit_amount ?? 0;
      lines.push(
        `단계${idx + 1}: 기준 ${threshold ?? "-"}, ${unitSize ?? "-"}건당 ${Number(unitAmount || 0).toLocaleString()}원`
      );
    });
  }

  const peak = cfg.peakPrecondition as any;
  const peakLines: string[] = [];
  if (peak && Array.isArray(peak.conditions) && peak.conditions.length > 0) {
    peakLines.push(`피크타임 (${peak.mode || "AND"})`);
    const minScore = peak.minScore ?? peak.min_score;
    if (minScore != null && minScore !== "") {
      peakLines.push(`적용 기준: 피크점수 ${minScore}점 이상`);
    }
    peak.conditions.forEach((c: any, idx: number) => {
      const slot = c.slot || "-";
      const min = c.minCount ?? "-";
      peakLines.push(`조건${idx + 1}: ${slot} 최소 ${min}건`);
    });
  }

  return { lines, peakLines, typeLabel };
};

const normalizeDate = (v: any): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const dd = String(v.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(v);
};

const splitRider = (full: string) => {
  const m = full.match(/^(.*?)(\d{4})$/);
  if (m) return { name: m[1] || full, suffix: m[2] || "" };
  return { name: full, suffix: "" };
};

const createEmptyPeak = (): PeakCount => ({
  Breakfast: 0,
  Lunch_Peak: 0,
  Post_Lunch: 0,
  Dinner_Peak: 0,
  Post_Dinner: 0,
  total: 0,
});

const normalizeLic = (id: string | null | undefined) => (id ? String(id).trim() : "-");

const formatCurrency = (v: number | string) => {
  const num = typeof v === "number" ? v : Number(v || 0);
  return num.toLocaleString();
};

const formatMissionLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${mm}/${dd}(${weekday})`;
};

const formatPeakScoreText = (peak?: { score: number; threshold: number | null } | null) => {
  if (!peak) return "-";
  const thresholdText = peak.threshold ? ` / 기준 ${peak.threshold}점` : "";
  return `${peak.score.toLocaleString()}점${thresholdText}`;
};

const sanitizeFileName = (name: string) => {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");
};

export default function WeeklySettlementWizardPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastLoadKeyRef = useRef<number | null>(null);

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [promotionByBranch, setPromotionByBranch] = useState<Record<string, PromotionOption[]>>({});
  const [promotionDetail, setPromotionDetail] = useState<Record<string, PromotionDetail>>({});
  const [branchRiders, setBranchRiders] = useState<Record<string, BranchRider[]>>({});
  const [rentalFeeByRider, setRentalFeeByRider] = useState<RentalFeeMap>({});
  const [nextDayPayoutByLicense, setNextDayPayoutByLicense] = useState<Record<string, number>>({});
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [globalPassword, setGlobalPassword] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{
    riders: AggRider[];
    branches: string[];
    missions: Record<string, any>[];
    rawRowsByRider: Record<string, RawRiderSummary[]>;
    summaries: Map<
      string,
      {
        licenseId: string;
        name: string;
        rawName: string;
        suffix: string;
        total: number;
        branchName: string;
        fin: SummaryFinancial;
      }
    >;
  } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<Step3Row | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const licenseColWidth = 140;
  const riderColWidth = 100;

  useEffect(() => {
    if (lastLoadKeyRef.current === reloadKey) return;
    lastLoadKeyRef.current = reloadKey;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [branchRes, promoRes, ridersRes, rentalsRes] = await Promise.all([
          fetch("/api/branches"),
          fetch("/api/promotions"),
          fetch("/api/branch-riders").catch(() => null),
          fetch("/api/lease-rentals").catch(() => null),
        ]);

        const [branchData, promoData, ridersData, rentalsData] = await Promise.all([
          branchRes.json().catch(() => ({})),
          promoRes.json().catch(() => ({})),
          ridersRes ? ridersRes.json().catch(() => ({} as any)) : {},
          rentalsRes ? rentalsRes.json().catch(() => ({})) : {},
        ]);

        if (!branchRes.ok || branchData?.error) {
          throw new Error(branchData?.error || "지사 목록을 불러오지 못했습니다.");
        }
        if (!promoRes.ok || promoData?.error) {
          throw new Error(promoData?.error || "프로모션 목록을 불러오지 못했습니다.");
        }

        if (cancelled) return;

        const branchList: BranchOption[] = (branchData.branches || []).map((b: any) => ({
          id: String(b.id),
          name: b.display_name || b.branch_name || String(b.id),
          displayName: b.display_name || undefined,
          branchName: b.branch_name || undefined,
          province: b.province || "",
          district: b.district || "",
          platform: b.platform || "",
          corporateName: b.corporate_entity_name || null,
          personalName: b.personal_entity_name || null,
          feeType: b.fee_type || null,
          feeValue: b.fee_value != null ? Number(b.fee_value) : null,
        }));
        if (branchList.length === 0) {
          throw new Error("지사 목록이 비어있습니다. 다시 불러와 주세요.");
        }
        setBranches(branchList);

        const map: Record<string, PromotionOption[]> = {};
        const detailMap: Record<string, PromotionDetail> = {};
        const promotionsArr: any[] = Array.isArray(promoData.promotions)
          ? promoData.promotions
          : [];

        promotionsArr.forEach((p: any) => {
          const promoId = String(p.id);
          const cfg = p.config || {};
          const isActive = p.status === "active";
          const summary = buildPromotionSummary(p.type as string, cfg);

          const assigned = Array.isArray(p.branches) ? p.branches : [];
          const byBranch: Record<string, { startDate: string | null; endDate: string | null; active?: boolean }> = {};

          assigned.forEach((b: any) => {
            const bid = String(b.branchId || b.branch_id || b.id || "");
            if (!bid) return;
            const assignmentActive = b.active ?? b.is_active ?? b.isActive ?? true;
            if (!assignmentActive) return;

            const startDate = normalizeDate(
              b.startDate ?? b.start_date ?? b.start_at ?? b.startAt
            );
            const endDate = normalizeDate(
              b.endDate ?? b.end_date ?? b.end_at ?? b.endAt
            );

            byBranch[bid] = { startDate, endDate, active: assignmentActive };

            if (isActive) {
              const promo: PromotionOption = {
                id: promoId,
                name: p.name || "",
                status: p.status || "ended",
                config: cfg,
                startDate: normalizeDate(p.start_date ?? p.startDate ?? p.start_at ?? p.startAt),
                endDate: normalizeDate(p.end_date ?? p.endDate ?? p.end_at ?? p.endAt),
              };
              (map[bid] = map[bid] || []).push(promo);
            }
          });

          detailMap[promoId] = {
            type: p.type as string,
            typeLabel: summary.typeLabel,
            summaryLines: summary.lines,
            peakLines: summary.peakLines,
            startDate: normalizeDate(p.start_date ?? p.startDate ?? p.start_at ?? p.startAt),
            endDate: normalizeDate(p.end_date ?? p.endDate ?? p.end_at ?? p.endAt),
            assignments: byBranch,
          };
        });

        setPromotionByBranch(map);
        setPromotionDetail(detailMap);
        if (ridersRes && ridersRes.ok && (ridersData as any)?.ridersByBranch) {
          const riderMap: Record<string, BranchRider[]> = {};
          Object.entries((ridersData as any).ridersByBranch as Record<string, any[]>).forEach(
            ([bid, rows]) => {
              riderMap[bid] = rows.map((r: any) => ({
                id: String(r.id),
                name: r.name || "",
                phone: r.phone || "",
                phoneSuffix: r.phoneSuffix || "",
              }));
            }
          );
          setBranchRiders(riderMap);
        }
        if (rentalsRes && rentalsRes.ok && Array.isArray((rentalsData as any)?.rentals)) {
          const feeMap: RentalFeeMap = {};
          (rentalsData as any).rentals.forEach((r: any) => {
            if (r.riderId && r.dailyFee) {
              feeMap[String(r.riderId)] = Number(r.dailyFee) || 0;
            }
          });
          setRentalFeeByRider(feeMap);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "데이터를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const guessBranchId = (fileName: string) => {
    const lower = fileName.toLowerCase();
    // 분리 가능한 패턴들로 토큰화 (언더스코어, 하이픈, 공백 등)
    const parts = lower
      .replace(/\.xlsx|\.xlsm|\.xls/i, "")
      .split(/[\s_\-\.]+/)
      .filter(Boolean);

    // 우선순위: 지사명 → 구/군 → 시/도 → 법인/개인 명칭
    const scored = branches.map((b) => {
      let score = 0;
      const tokens = [
        b.branchName,
        b.displayName,
        b.name,
        b.district,
        b.province,
        b.corporateName,
        b.personalName,
      ]
        .filter(Boolean)
        .map((t) => String(t).toLowerCase());

      tokens.forEach((t, idx) => {
        const exact = parts.includes(t);
        const partial = !exact && lower.includes(t);
        if (exact) score += 5 - idx; // branchName/displayName 우선
        else if (partial) score += 1;
      });

      return { id: b.id, score };
    });

    const best = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    return best ? best.id : null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setFileError(null);
    const next: UploadEntry[] = [];
    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!["xls", "xlsx", "xlsm"].includes(ext)) {
        setFileError("엑셀 파일(.xls, .xlsx, .xlsm)만 업로드 가능합니다.");
        return;
      }
      const duplicate = uploads.some(
        (u) => u.file.name === file.name && u.file.size === file.size
      );
      if (duplicate) return;
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
        file,
        password: "",
        branchId: guessBranchId(file.name),
        guessed: guessBranchId(file.name),
      });
    });
    if (next.length > 0) {
      setUploads((prev) => [...prev, ...next]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const branchOptions = useMemo(() => branches, [branches]);

  const applyPasswordToAll = () => {
    if (!globalPassword.trim()) return;
    setUploads((prev) => prev.map((u) => ({ ...u, password: globalPassword })));
  };

  const parseUploadsForStep2 = async () => {
    setParseError(null);
    setParsed(null);
    setParsing(true);
    try {
      if (uploads.length === 0) {
        throw new Error("업로드된 파일이 없습니다.");
      }
      if (uploads.some((u) => !u.password || !u.branchId)) {
        throw new Error("모든 파일의 비밀번호와 지사를 입력해주세요.");
      }

      const results: ParsedFileResult[] = [];
      const nameSuffixKeyMap = new Map<string, string>();
      const resolveRiderKey = (licRaw?: string | null, name?: string, suffix?: string | null) => {
        const lic = normalizeLic(licRaw);
        const sp = splitRider(name || "");
        const nm = (sp.name || name || "-").trim();
        const sx = (suffix || sp.suffix || "").trim();
        const nsKey = `${nm}__${sx || "no-suffix"}`;
        if (nameSuffixKeyMap.has(nsKey)) {
          const existing = nameSuffixKeyMap.get(nsKey)!;
          if (lic && lic !== "-" && existing !== lic) {
            // 이미 같은 이름/뒷번호로 병합된 키가 있으면 그대로 사용
            return existing;
          }
          return existing;
        }
        const base = lic && lic !== "-" ? lic : nsKey;
        nameSuffixKeyMap.set(nsKey, base);
        return base;
      };
      for (const u of uploads) {
        const branchLabel =
          branches.find((b) => b.id === u.branchId)?.name || u.branchId || "";
        const form = new FormData();
        form.append("file", u.file);
        form.append("password", u.password);
        form.append("branchName", branchLabel);
        form.append("branchId", u.branchId || "");

        const res = await fetch("/api/settlement/parse", {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "파일을 파싱하지 못했습니다.");
        }
        results.push({
          ...(data as ParsedFileResult),
          _sourceFile: u.file.name,
          _branchId: u.branchId,
          _branchLabel: branchLabel,
        });
      }

      // 병합 및 집계
      const summaryMap = new Map<
        string,
        {
          licenseId: string;
          name: string;
          rawName: string;
          suffix: string;
          total: number;
          branchName: string;
          fin: SummaryFinancial;
        }
      >();
      const rawRowsByRider: Record<string, RawRiderSummary[]> = {};
      results.forEach((r) => {
        r.summaries.forEach((s) => {
          const lic = normalizeLic(s.licenseId);
          const sp = splitRider(s.riderName || "-");
          const riderKey = resolveRiderKey(lic, s.riderName || s.riderNameRaw, sp.suffix);
          const prev = summaryMap.get(riderKey);
          summaryMap.set(riderKey, {
            licenseId: prev?.licenseId || lic || riderKey,
            name: prev?.name || sp.name || "-",
            rawName: prev?.rawName || s.riderNameRaw || s.riderName || "-",
            suffix: prev?.suffix || sp.suffix || "",
            total: (prev?.total || 0) + (s.totalOrders || 0),
            branchName: prev?.branchName || s.branchName || r._branchLabel || "-",
            fin: {
              branchName: prev?.fin.branchName || s.branchName || r._branchLabel || "-",
              settlementAmount: (prev?.fin.settlementAmount || 0) + (s.settlementAmount || 0),
              supportTotal: (prev?.fin.supportTotal || 0) + (s.supportTotal || 0),
              deduction: (prev?.fin.deduction || 0) + (s.deduction || 0),
              totalSettlement: (prev?.fin.totalSettlement || 0) + (s.totalSettlement || 0),
              fee: (prev?.fin.fee || 0) + (s.fee || 0),
              employment: (prev?.fin.employment || 0) + (s.employment || 0),
              accident: (prev?.fin.accident || 0) + (s.accident || 0),
              timeInsurance: (prev?.fin.timeInsurance || 0) + (s.timeInsurance || 0),
              retro: (prev?.fin.retro || 0) + (s.retro || 0),
            },
          });

          const rawEntry: RawRiderSummary = {
            key: riderKey,
            licenseId: lic || riderKey,
            riderName: sp.name || "-",
            riderSuffix: sp.suffix || "",
            rawName: s.riderNameRaw || s.riderName || "-",
            branchName: s.branchName || r._branchLabel || "-",
            orderCount: s.totalOrders || 0,
            fin: {
              branchName: s.branchName || r._branchLabel || "-",
              settlementAmount: s.settlementAmount || 0,
              supportTotal: s.supportTotal || 0,
              deduction: s.deduction || 0,
              totalSettlement: s.totalSettlement || 0,
              fee: s.fee || 0,
              employment: s.employment || 0,
              accident: s.accident || 0,
              timeInsurance: s.timeInsurance || 0,
              retro: s.retro || 0,
            },
            sourceFile: r._sourceFile,
          };
          (rawRowsByRider[riderKey] = rawRowsByRider[riderKey] || []).push(rawEntry);
        });
      });

      const riderMap = new Map<string, AggRider>();
      const branchSet = new Set<string>();

      results.forEach((r) => {
        r.details.forEach((d) => {
          const lic = normalizeLic(d.licenseId);
          const sp = splitRider(d.riderName || "-");
          const riderKey =
            resolveRiderKey(lic, d.riderName, d.riderSuffix) ||
            resolveRiderKey(lic, summaryMap.get(lic)?.name, d.riderSuffix);
          const name = sp.name || "-";
          const summaryForKey = summaryMap.get(riderKey || lic);
          const suffix =
            d.riderSuffix || sp.suffix || summaryForKey?.suffix || "";
          const branchLabel = r._branchLabel || d.branchName;
          const existing =
            riderMap.get(riderKey) ||
            ({
              key: riderKey,
              licenseId: lic,
              riderName: name,
              riderSuffix: suffix,
              totalOrders: 0,
              branchCounts: {},
              peakByDate: {},
              peakByBranch: {},
              details: [],
            } as AggRider);

          existing.riderName = existing.riderName || name;
          existing.riderSuffix = existing.riderSuffix || suffix;
          existing.details.push({
            ...d,
            riderName: name,
            riderSuffix: suffix,
            branchName: branchLabel,
          });
          existing.branchCounts[branchLabel] =
            (existing.branchCounts[branchLabel] || 0) + 1;
          branchSet.add(branchLabel);

          const peakKey = d.judgementDate;
          existing.peakByDate[peakKey] = existing.peakByDate[peakKey] || createEmptyPeak();
          existing.peakByBranch[branchLabel] = existing.peakByBranch[branchLabel] || {};
          existing.peakByBranch[branchLabel][peakKey] =
            existing.peakByBranch[branchLabel][peakKey] || createEmptyPeak();
          const shift = d.peakTime as keyof AggRider["peakByDate"][string];
          if (shift && existing.peakByDate[peakKey][shift] !== undefined) {
            existing.peakByDate[peakKey][shift]! += 1;
            existing.peakByBranch[branchLabel][peakKey][shift]! += 1;
          }
          existing.peakByDate[peakKey].total += 1;
          existing.peakByBranch[branchLabel][peakKey].total += 1;

          riderMap.set(riderKey, existing);
        });
      });

      summaryMap.forEach((s, riderKey) => {
        if (s.branchName) branchSet.add(s.branchName);
        if (!riderMap.has(riderKey)) {
          riderMap.set(riderKey, {
            key: riderKey,
            licenseId: s.licenseId || riderKey,
            riderName: s.name || "-",
            riderSuffix: s.suffix || "",
            totalOrders: s.total || 0,
            branchCounts: {},
            peakByDate: {},
            peakByBranch: {},
            details: [],
          });
        }
      });

      // 총 오더수 설정
      riderMap.forEach((r, riderKey) => {
        const lic = normalizeLic(r.licenseId || riderKey);
        const summary = summaryMap.get(riderKey);
        const counted = Object.values(r.branchCounts).reduce((a, b) => a + b, 0);
        r.totalOrders = summary?.total ?? counted;
        if (!r.riderName || r.riderName === "-") {
          r.riderName = summary?.name || "-";
        }
        if (!r.riderSuffix) {
          r.riderSuffix = summary?.suffix || "";
        }
        r.licenseId = summary?.licenseId || lic || riderKey;
        r.key = riderKey;
        r.details.sort((a, b) => b.acceptedAtMs - a.acceptedAtMs);
      });

      const ridersArr = Array.from(riderMap.values()).map((r) => {
        const sum = summaryMap.get(r.key);
        if (sum) {
          if (!r.riderName || r.riderName === "-") {
            r.riderName = sum.name || r.riderName;
          }
          r.totalOrders = sum.total || r.totalOrders;
          r.riderSuffix = sum.suffix || splitRider(sum.rawName || "").suffix || r.riderSuffix;
          r.licenseId = sum.licenseId || r.licenseId;
        }
        return r;
      });

      const branchesUsed = Array.from(branchSet).sort((a, b) => a.localeCompare(b, "ko"));

      setParsed({
        riders: ridersArr.sort((a, b) => (a.riderName || "").localeCompare(b.riderName || "", "ko")),
        branches: branchesUsed,
        missions: results.flatMap((r) => r.missions || []),
        rawRowsByRider,
        summaries: summaryMap,
      });
      setSelectedRider(null);
      setExpandedRows({});
    } catch (e: any) {
      setParseError(e.message || "파싱 중 오류가 발생했습니다.");
    } finally {
      setParsing(false);
    }
  };

  const isStepComplete = useMemo(() => {
    if (uploads.length === 0) return false;
    return uploads.every((u) => u.password.trim() && u.branchId);
  }, [uploads]);

  const branchIdByLabel = useMemo(() => {
    const map: Record<string, string> = {};
    branches.forEach((b) => {
      [b.name, b.displayName, b.branchName].filter(Boolean).forEach((lbl) => {
        map[String(lbl)] = b.id;
      });
    });
    return map;
  }, [branches]);

  const resolveBranchId = useCallback(
    (label?: string | null) => {
      if (!label) return null;
      const id = branchIdByLabel[label];
      if (id) return id;
      if (branchRiders[label]) return label;
      return null;
    },
    [branchIdByLabel, branchRiders]
  );

  const findMatchedRider = useCallback(
    (branchLabel?: string | null, suffix?: string | null) => {
      if (!suffix) return null;
      const bid = resolveBranchId(branchLabel);
      if (!bid) return null;
      const list = branchRiders[bid];
      if (!list) return null;
      return list.find((r) => r.phoneSuffix === suffix) || null;
    },
    [branchRiders, resolveBranchId]
  );

  const calcPromoAmount = useCallback(
    (promo: PromotionOption, orders: number, branchId: string) => {
      const detail = promotionDetail[promo.id];
      const type = detail?.type || promo.config?.type || promo.status;
      const cfg = promo.config || {};
      let amount = 0;

      if (type === "excess") {
        const src = cfg.excess ?? cfg;
        const threshold =
          src.threshold ?? src.targetCount ?? src.base_count ?? src.count ?? 0;
        const per = src.amountPerExcess ?? src.amount ?? src.amount_per_excess ?? src.excess_amount ?? 0;
        if (orders > threshold) {
          amount = (orders - threshold) * per;
        }
      } else if (type === "milestone") {
        const tiers: any[] =
          cfg.milestones ??
          cfg.milestone ??
          cfg.tiers ??
          cfg.levels ??
          [];
        const arr = Array.isArray(tiers)
          ? tiers
          : tiers && Array.isArray((tiers as any).tiers)
            ? (tiers as any).tiers
            : [];
        const achieved = arr.filter((t: any) => orders >= (t.threshold ?? t.targetCount ?? t.target_count ?? 0));
        if (achieved.length > 0) {
          const best = achieved.reduce((p: any, c: any) =>
            (c.threshold ?? c.targetCount ?? c.target_count ?? 0) >
            (p.threshold ?? p.targetCount ?? p.target_count ?? 0)
              ? c
              : p
          );
          amount = best.amount ?? best.rewardAmount ?? best.reward_amount ?? best.value ?? 0;
        }
      } else if (type === "milestone_per_unit") {
        const tiers: any[] =
          cfg.milestonePerUnit ?? cfg.milestone_per_unit ?? cfg.tiers ?? cfg.levels ?? [];
        const arr = Array.isArray(tiers)
          ? tiers
          : tiers && Array.isArray((tiers as any).tiers)
            ? (tiers as any).tiers
            : [];
        arr.forEach((t: any) => {
          const threshold = t.threshold ?? t.start ?? t.base_count ?? 0;
          const unitSize = t.unitSize ?? t.size ?? t.per ?? 1;
          const unitAmount = t.unitAmount ?? t.amount ?? t.unit_amount ?? 0;
          if (orders > threshold) {
            const steps = Math.floor((orders - threshold) / unitSize) + 1;
            amount += steps * unitAmount;
          }
        });
      }

      const typeLabel = detail?.typeLabel || "";
      return { amount, typeLabel };
    },
    [promotionDetail]
  );

  const calcPeakScore = useCallback(
    (promo: PromotionOption | undefined, peakByDate: AggRider["peakByDate"]) => {
      if (!promo) return null;
      const cfg = promo.config || {};
      const peak =
        cfg.peakPrecondition ??
        cfg.peak_precondition ??
        cfg.peak_pre_condition ??
        cfg.peak;
      if (!peak || !Array.isArray(peak.conditions) || peak.conditions.length === 0) return null;
      const mode = String(peak.mode || "AND").toUpperCase();
      const thresholdRaw = peak.minScore ?? peak.min_score;
      const thresholdNum = Number(thresholdRaw);
      const threshold =
        Number.isFinite(thresholdNum) && thresholdNum > 0 ? thresholdNum : null;

      let score = 0;
      Object.values(peakByDate || {}).forEach((counts) => {
        const conditionsMet = peak.conditions.map((c: any) => {
          const slot = c.slot as keyof typeof counts;
          const min = c.minCount ?? c.min_count ?? 0;
          const actual = slot ? Number(counts[slot] || 0) : 0;
          return actual >= min;
        });
        const ok =
          mode === "OR"
            ? conditionsMet.some(Boolean)
            : conditionsMet.length > 0 && conditionsMet.every(Boolean);
        if (ok) score += 1;
      });

      return {
        score,
        threshold,
        meets: threshold == null ? true : score >= threshold,
      };
    },
    []
  );

  const missionTotals = useMemo(() => {
    if (!parsed) return {} as Record<string, Record<string, number>>;
    const nameToLic: Record<string, string> = {};
    const licenseToKey: Record<string, string> = {};
    parsed.summaries?.forEach((v, lic) => {
      if (v.name) nameToLic[v.name] = lic;
      if (v.licenseId) licenseToKey[v.licenseId] = lic;
    });
    const totals: Record<string, Record<string, number>> = {};
    parsed.missions.forEach((m: any) => {
      const date = m.startDate || m["startDate"];
      if (!date) return;
      const rawName = m.name || m["이름"] || "";
      const { name } = splitRider(String(rawName));
      const licKey =
        licenseToKey[m.licenseId] ||
        m.licenseId ||
        nameToLic[name];
      if (!licKey) return;
      const amount = Number(m.amount ?? m["amount"] ?? 0) || 0;
      if (!totals[date]) totals[date] = {};
      totals[date][licKey] = (totals[date][licKey] || 0) + amount;
    });
    return totals;
  }, [parsed]);

  const missionDates = useMemo(
    () =>
      Object.keys(missionTotals).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      ),
    [missionTotals]
  );

  const getSummaryFor = (r: { riderName?: string; riderSuffix?: string; licenseId?: string; key?: string }) => {
    if (r.key && parsed?.summaries.has(r.key)) return parsed?.summaries.get(r.key);
    return r.licenseId ? parsed?.summaries.get(r.licenseId) : undefined;
  };

  const step3Data = useMemo(() => {
    if (!parsed) return { rows: [] as Step3Row[], childRowsByKey: {} as Record<string, Step3Row[]> };

    const riderLookup: Record<string, AggRider> = {};
    parsed.riders.forEach((r) => {
      riderLookup[r.key] = r;
    });

    const childRowsByKey: Record<string, Step3Row[]> = {};
    Object.entries(parsed.rawRowsByRider || {}).forEach(([key, raws]) => {
      const rider = riderLookup[key];
      childRowsByKey[key] = raws.map((raw, idx) => {
        const branchId = branchIdByLabel[raw.branchName] || "";
        const branchObj =
          (branchId && branches.find((b) => b.id === branchId)) ||
          branches.find(
            (b) =>
              b.name === raw.branchName ||
              b.displayName === raw.branchName ||
              b.branchName === raw.branchName
          );
        const promos = branchId ? promotionByBranch[branchId] || [] : [];
        const orderCount = raw.orderCount || 0;

        const promoLines: string[] = [];
        let promoTotal = 0;
        let peakInfoForDisplay: { score: number; threshold: number | null } | null = null;
        const branchPeak: AggRider["peakByDate"] = rider?.peakByBranch?.[raw.branchName] || {};
        promos.forEach((p) => {
          const { amount, typeLabel } = calcPromoAmount(p, orderCount, branchId);
          const peakInfo = calcPeakScore(p, branchPeak);
          if (peakInfo && !peakInfoForDisplay) {
            peakInfoForDisplay = { score: peakInfo.score, threshold: peakInfo.threshold };
          }
          if (peakInfo && !peakInfo.meets) {
            promoLines.push(`[${typeLabel || "피크"}] 피크점수 ${peakInfo.score}점`);
            return;
          }
          if (amount && typeLabel) {
            promoLines.push(`[${typeLabel}] ${formatCurrency(amount)}원`);
            promoTotal += amount;
          }
        });

        const peakScoreText = formatPeakScoreText(peakInfoForDisplay);

        const missionSum = 0;
        const overallTotal = raw.fin.totalSettlement + promoTotal + missionSum;
        const withholding = Math.floor((overallTotal * 0.033) / 10) * 10;

        let fee = raw.fin.fee || 0;
        if (branchObj?.feeType && branchObj?.feeValue != null) {
          if (branchObj.feeType === "per_case") {
            fee = Math.round((branchObj.feeValue || 0) * orderCount);
          } else if (branchObj.feeType === "percentage") {
            const base = raw.fin.settlementAmount || raw.fin.totalSettlement;
            fee = Math.round(base * ((branchObj.feeValue || 0) / 100));
          }
        }

        const loanPayment = 0;
        const nextDaySettlement = 0;
        const rentCostValue = raw.fin ? Number((raw.fin as any).rentCost || 0) : 0;
        const actualDeposit = Math.round(
          (raw.fin.totalSettlement || 0) -
            (raw.fin.employment || 0) -
            (raw.fin.accident || 0) -
            withholding -
            (raw.fin.timeInsurance || 0) -
            loanPayment -
            (rentCostValue || 0) -
            fee -
            nextDaySettlement
        );

        return {
          key: `${key}-child-${idx}`,
          parentKey: key,
          isChild: true,
          licenseId: raw.licenseId || key,
          riderName: raw.riderName || raw.rawName || "-",
          riderSuffix: raw.riderSuffix || "-",
          branchName: raw.branchName,
          orderCount,
          loanPayment,
          rentCost: "-",
          nextDaySettlement,
          actualDeposit,
          payout: "-",
          fee,
          peakScore: peakScoreText,
          promoBasis: promoLines.join("\n"),
          promoAmount: promoTotal,
          settlementAmount: raw.fin.settlementAmount || 0,
          supportTotal: raw.fin.supportTotal || 0,
          deduction: raw.fin.deduction || 0,
          totalSettlement: raw.fin.totalSettlement || 0,
          overallTotal,
          employment: raw.fin.employment || 0,
          accident: raw.fin.accident || 0,
          timeInsurance: raw.fin.timeInsurance || 0,
          retro: raw.fin.retro || 0,
          withholding,
          matchedRiderId: undefined,
          matchedRiderName: undefined,
          rentCostValue,
          sourceFile: raw.sourceFile,
        };
      });
    });

    const rows = [...parsed.riders]
      .sort((a, b) => (a.riderName || "").localeCompare(b.riderName || "", "ko"))
      .map((r) => {
        const summary = parsed.summaries.get(r.key);
        const orderCount = r.totalOrders || summary?.total || 0;
        const primaryBranch =
          Object.entries(r.branchCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          summary?.branchName ||
          "-";
        const branchId = branchIdByLabel[primaryBranch] || "";
        const branchObj =
          (branchId && branches.find((b) => b.id === branchId)) ||
          branches.find(
            (b) =>
              b.name === primaryBranch || b.displayName === primaryBranch || b.branchName === primaryBranch
          );
        const promos = branchId ? promotionByBranch[branchId] || [] : [];

        const promoLines: string[] = [];
        let promoTotal = 0;
        let peakInfoForDisplay: { score: number; threshold: number | null } | null = null;
        const branchPeak: AggRider["peakByDate"] = r.peakByBranch?.[primaryBranch] || {};
        const aggregatedPeak: AggRider["peakByDate"] = r.peakByDate || {};
        promos.forEach((p) => {
          const { amount, typeLabel } = calcPromoAmount(p, orderCount, branchId);
          // 피크 점수는 업로드된 모든 파일의 합산 데이터를 기준으로 계산
          const peakInfo = calcPeakScore(p, aggregatedPeak);
          if (peakInfo && !peakInfoForDisplay) {
            peakInfoForDisplay = { score: peakInfo.score, threshold: peakInfo.threshold };
          }
          if (peakInfo && !peakInfo.meets) {
            promoLines.push(`[${typeLabel || "피크"}] 피크점수 ${peakInfo.score}점`);
            return;
          }
          if (amount && typeLabel) {
            promoLines.push(`[${typeLabel}] ${formatCurrency(amount)}원`);
            promoTotal += amount;
          }
        });

        const fin = summary?.fin;
        const settlementAmount = fin?.settlementAmount || 0;
        const supportTotal = fin?.supportTotal || 0;
        const deduction = fin?.deduction || 0;
        const totalSettlement = fin?.totalSettlement || 0;
        let fee = fin?.fee || 0;
        if (branchObj?.feeType && branchObj?.feeValue != null) {
          if (branchObj.feeType === "per_case") {
            fee = Math.round((branchObj.feeValue || 0) * orderCount);
          } else if (branchObj.feeType === "percentage") {
            const base = settlementAmount || totalSettlement;
            fee = Math.round(base * ((branchObj.feeValue || 0) / 100));
          }
        }
        const employment = fin?.employment || 0;
        const accident = fin?.accident || 0;
        const timeInsurance = fin?.timeInsurance || 0;
        const retro = fin?.retro || 0;

        const riderSuffixResolved =
          r.riderSuffix ||
          summary?.suffix ||
          splitRider(summary?.rawName || "").suffix ||
          "";
        const matched = findMatchedRider(primaryBranch, riderSuffixResolved);

        const missionSum = missionDates.reduce((acc, d) => {
          const amt = missionTotals[d]?.[r.key] || 0;
          return acc + amt;
        }, 0);

        const rentCostWeekly =
          matched?.id && rentalFeeByRider[matched.id]
            ? rentalFeeByRider[matched.id] * 7
            : 0;

        const overallTotal = totalSettlement + promoTotal + missionSum;
        const withholding = Math.floor((overallTotal * 0.033) / 10) * 10;

        const peakScoreText = formatPeakScoreText(peakInfoForDisplay);
        const rentCostDisplay =
          rentCostWeekly && rentCostWeekly > 0
            ? `-${formatCurrency(rentCostWeekly)}원`
            : "-";

        const loanPayment = 0;
        const nextDaySettlement = nextDayPayoutByLicense[r.licenseId] || 0;
        const actualDeposit = Math.round(
          totalSettlement -
            employment -
            accident -
            withholding -
            timeInsurance -
            (rentCostWeekly || 0) -
            loanPayment -
            fee -
            nextDaySettlement
        );

        return {
          key: r.key,
          licenseId: r.licenseId || "-",
          riderName: r.riderName || summary?.name || "-",
          riderSuffix: riderSuffixResolved || "-",
          branchName: primaryBranch,
          orderCount,
          loanPayment,
          rentCost: rentCostDisplay,
          nextDaySettlement,
          actualDeposit,
          payout: "-",
          fee,
          peakScore: peakScoreText,
          promoBasis: promoLines.join("\n"),
          promoAmount: promoTotal,
          settlementAmount,
          supportTotal,
          deduction,
          totalSettlement,
          overallTotal,
          employment,
          accident,
          timeInsurance,
          retro,
          withholding,
          matchedRiderId: matched?.id,
          matchedRiderName: matched?.name,
          rentCostValue: rentCostWeekly,
        };
      });

    return { rows, childRowsByKey };
  }, [
    parsed,
    branchIdByLabel,
    promotionByBranch,
    branches,
    missionDates,
    missionTotals,
    findMatchedRider,
    rentalFeeByRider,
    calcPromoAmount,
    calcPeakScore,
    nextDayPayoutByLicense,
  ]);

  const step3Rows = step3Data.rows;
  const childRowsByKey = step3Data.childRowsByKey;

  useEffect(() => {
    if (!parsed) {
      setNextDayPayoutByLicense({});
      return;
    }
    const licenses = Array.from(
      new Set(
        parsed.riders
          .map((r) => (r.licenseId || r.key || "").trim())
          .filter(Boolean)
      )
    );
    if (licenses.length === 0) {
      setNextDayPayoutByLicense({});
      return;
    }

    // 판정일자 범위 계산 (익일정산 합산 시 기간 제한)
    const dates: string[] = [];
    parsed.riders.forEach((r) => {
      r.details.forEach((d) => {
        if (d.judgementDate) dates.push(d.judgementDate);
      });
    });
    dates.sort();
    const startDate = dates[0] || null;
    const endDate = dates[dates.length - 1] || null;

    let cancelled = false;
    async function fetchNextDay() {
      try {
        const res = await fetch("/api/settlement/daily/net-payout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseIds: licenses,
            startDate,
            endDate,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          console.warn("[weekly] next-day payout fetch failed:", data?.error || res.statusText);
          if (!cancelled) setNextDayPayoutByLicense({});
          return;
        }
        if (!cancelled) {
          setNextDayPayoutByLicense(data.totals || {});
        }
      } catch (e) {
        console.warn("[weekly] next-day payout fetch error:", e);
        if (!cancelled) setNextDayPayoutByLicense({});
      }
    }
    fetchNextDay();
    return () => {
      cancelled = true;
    };
  }, [parsed]);

  const displayRows: Step3Row[] = useMemo(() => {
    const list: Step3Row[] = [];
    step3Rows.forEach((row) => {
      list.push(row);
      const children = childRowsByKey[row.key];
      if (expandedRows[row.key] && children && children.length > 1) {
        list.push(...children);
      }
    });
    return list;
  }, [step3Rows, childRowsByKey, expandedRows]);

  const openDetail = (row: Step3Row) => {
    setDetailRow(row);
    requestAnimationFrame(() => setDetailOpen(true));
  };

  const closeDetail = () => setDetailOpen(false);

  const handleExportXlsx = () => {
    if (!parsed || step3Rows.length === 0) {
      showToast("내보낼 데이터가 없습니다.", "info");
      return;
    }

    const branchLabelForFile = (() => {
      const labels = new Set<string>();
      uploads.forEach((u) => {
        const label = branches.find((b) => b.id === u.branchId)?.name || u.branchId || "";
        if (label) labels.add(label);
      });
      if (labels.size === 1) return Array.from(labels)[0];
      if (parsed.branches?.length === 1) return parsed.branches[0];
      return null;
    })();

    const fileName = sanitizeFileName(
      branchLabelForFile ? `${branchLabelForFile}-settlement-step3-weekly.xlsx` : "settlement-step3-weekly.xlsx"
    );

    const formatAmount = (v: number | string) => formatCurrency(v || 0);
    const formatNegative = (v: number | undefined | null) =>
      v && v !== 0 ? `-${formatCurrency(v)}` : "-";

    const missionHeaders = missionDates.map((d) => formatMissionLabel(d));
    const headers = [
      "라이더명",
      "라이선스 ID",
      "오더수",
      "대여금",
      "렌트비용",
      "익일정산 합계",
      "실제 입금액",
      "수수료",
      "지사",
      "피크 점수",
      "프모 기준",
      "프로모션",
      ...missionHeaders,
      "정산금액",
      "총 지원금",
      "차감내역",
      "총 정산금액",
      "전체 총 금액",
      "고용보험",
      "산재보험",
      "시간제보험",
      "보험료 소급",
      "원천세",
    ];

    const data = step3Rows.map((row) => {
      const missionCols = missionDates.map((d) => {
        const amt = missionTotals[d]?.[row.key] || 0;
        return amt ? formatAmount(amt) : "-";
      });
      return [
        row.riderName,
        row.licenseId,
        row.orderCount,
        row.loanPayment ? formatNegative(row.loanPayment) : "-",
        row.rentCostValue ? formatNegative(row.rentCostValue) : "-",
        row.nextDaySettlement ? formatNegative(row.nextDaySettlement) : "-",
        row.actualDeposit ? formatAmount(row.actualDeposit) : "-",
        formatNegative(row.fee),
        row.branchName || "-",
        row.peakScore || "-",
        row.promoBasis || "-",
        row.promoAmount ? formatAmount(row.promoAmount) : "-",
        ...missionCols,
        row.settlementAmount ? formatAmount(row.settlementAmount) : "-",
        row.supportTotal ? formatAmount(row.supportTotal) : "-",
        row.deduction ? formatAmount(row.deduction) : "-",
        row.totalSettlement ? formatAmount(row.totalSettlement) : "-",
        row.overallTotal ? formatAmount(row.overallTotal) : "-",
        row.employment ? formatAmount(row.employment) : "-",
        row.accident ? formatAmount(row.accident) : "-",
        row.timeInsurance ? formatAmount(row.timeInsurance) : "-",
        row.retro ? formatAmount(row.retro) : "-",
        row.withholding ? formatAmount(row.withholding) : "-",
      ];
    });

    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet([headers, ...data]);
    utils.book_append_sheet(wb, ws, "Step3");
    writeFile(wb, fileName || "settlement-step3-weekly.xlsx");
    showToast("Step3 테이블을 XLSX로 저장했습니다.", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">정산 마법사 / Step 1</div>
          <h1 className="text-lg font-semibold text-foreground">파일 업로드 및 검증</h1>
          <p className="text-xs text-muted-foreground">엑셀 파일을 업로드하고 지사/프로모션을 매핑한 뒤 비밀번호를 입력합니다.</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Step 1 / 3</span>
        </div>
      </div>

      <div
        className={`rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm shadow-sm transition ${
          dragActive ? "border-primary bg-primary/5" : ""
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={excelAccept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <Upload className="h-10 w-10 text-primary" />
          <div className="text-base font-semibold text-foreground">엑셀 파일 업로드</div>
          <div className="text-xs">파일을 드래그해서 놓거나 클릭해서 선택하세요 (.xls, .xlsx, .xlsm)</div>
          {fileError && (
            <p className="text-[11px] text-red-600">{fileError}</p>
          )}
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={loading}
            >
              파일 선택
            </button>
            <span className="text-muted-foreground">최대 5개, 10MB 이하</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">업로드된 파일</h2>
              <p className="text-[11px] text-muted-foreground">파일별 비밀번호와 지사 매핑을 완료한 뒤 Step 2로 이동하세요.</p>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <input
                type="password"
                className="h-8 w-44 rounded-md border border-border bg-background px-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="비밀번호 일괄 입력"
                value={globalPassword}
                onChange={(e) => setGlobalPassword(e.target.value)}
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 h-8 rounded-md border border-border bg-background px-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={applyPasswordToAll}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> 모든 파일에 적용
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 h-8 rounded-md border border-border bg-background px-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setUploads([])}
              >
                <Trash2 className="h-3.5 w-3.5" /> 전체 삭제
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card text-sm shadow-sm">
            <div className="divide-y divide-border">
              {uploads.map((u) => {
                const branchPromos = promotionByBranch[u.branchId || ""] || [];
                return (
                  <div key={u.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                    <div className="min-w-[200px] flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        <span className="truncate">{u.file.name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {(u.file.size / 1024).toFixed(1)} KB
                      </div>
                      {u.guessed && (
                        <div className="text-[11px] text-emerald-700">추정 지사: {branches.find((b) => b.id === u.guessed)?.name || u.guessed}</div>
                      )}
                    </div>
                    <div className="w-full max-w-[220px] space-y-1.5 text-xs">
                      <label className="text-[11px] text-muted-foreground">파일 비밀번호</label>
                      <input
                        type="password"
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={u.password}
                        onChange={(e) =>
                          setUploads((prev) =>
                            prev.map((x) =>
                              x.id === u.id ? { ...x, password: e.target.value } : x
                            )
                          )
                        }
                        placeholder="파일 암호 입력"
                      />
                    </div>
                    <div className="w-full max-w-[260px] space-y-1.5 text-xs">
                      <div className="text-[11px] text-muted-foreground">소속 지사</div>
                      <select
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={u.branchId || ""}
                        onChange={(e) =>
                          setUploads((prev) =>
                            prev.map((x) =>
                              x.id === u.id ? { ...x, branchId: e.target.value || null } : x
                            )
                          )
                        }
                      >
                        <option value="">지사 선택</option>
                        {branchOptions.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} {b.province || b.district ? `(${[b.province, b.district].filter(Boolean).join(" ")})` : ""}
                          </option>
                        ))}
                      </select>
                      {u.guessed && !u.branchId && (
                        <div className="text-[11px] text-emerald-700">파일명 기반 추정 지사를 선택해 두었습니다.</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-[220px] space-y-1.5 text-xs">
                      <div className="text-[11px] text-muted-foreground">적용 프로모션</div>
                      {branchPromos.length === 0 ? (
                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                          연결된 프로모션이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {branchPromos.map((p) => (
                            <div
                              key={p.id}
                              className={`flex flex-col gap-1 rounded-md border px-2 py-2 text-[11px] font-medium ${statusClass(p.status)}`}
                            >
                              <div className="flex items-center gap-1 text-foreground">
                                <span>{p.name}</span>
                                {promotionDetail[p.id]?.typeLabel && (
                                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {promotionDetail[p.id]?.typeLabel}
                                  </span>
                                )}
                              </div>
                              {promotionDetail[p.id]?.typeLabel && (
                                <div className="text-muted-foreground">유형: {promotionDetail[p.id]?.typeLabel}</div>
                              )}
                              {promotionDetail[p.id]?.summaryLines?.map((line, idx) => (
                                <div key={idx} className="whitespace-pre-line text-muted-foreground leading-snug">
                                  · {line}
                                </div>
                              ))}
                              {(() => {
                                const assign = promotionDetail[p.id]?.assignments?.[u.branchId || ""];
                                const startRaw =
                                  assign?.startDate ??
                                  promotionDetail[p.id]?.startDate ??
                                  "";
                                const endRaw =
                                  assign?.endDate ??
                                  promotionDetail[p.id]?.endDate ??
                                  "";
                                if (!assign && !startRaw && !endRaw) return null;
                                const start = startRaw ? startRaw.slice(0, 10) : "";
                                const end = endRaw ? endRaw.slice(0, 10) : "";
                                return (
                                  <div className="text-muted-foreground">
                                    기간: {start || "-"} ~ {end || "-"}
                                  </div>
                                );
                              })()}
                              {promotionDetail[p.id]?.peakLines?.map((line, idx) => (
                                <div key={`peak-${idx}`} className="text-amber-700">
                                  · {line}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        className="inline-flex h-8 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => setReloadKey((k) => k + 1)}
                        title="데이터 다시 불러오기"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() =>
                          setUploads((prev) => prev.filter((x) => x.id !== u.id))
                        }
                      >
                        제거
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">정산 마법사 / Step 2</div>
            <h2 className="text-base font-semibold text-foreground">정산 파일 파싱 및 라이더별 집계</h2>
            <p className="text-xs text-muted-foreground">
              업로드한 파일을 해석해 라이더별 총 오더/지사별 오더, 피크타임 집계, 상세 오더 내역을 보여줍니다.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px]">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
              onClick={parseUploadsForStep2}
              disabled={parsing || uploads.length === 0 || uploads.some((u) => !u.password || !u.branchId)}
            >
              {parsing ? "파싱 중..." : "파일 파싱"}
            </button>
            {!parsing && parseError && (
              <span className="text-[11px] text-red-600">{parseError}</span>
            )}
          </div>
        </div>

        {!parsed && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            파일 파싱 결과가 여기에 표시됩니다. 모든 파일에 지사와 비밀번호를 입력한 뒤 “파일 파싱”을 눌러주세요.
          </div>
        )}

        {parsed && (
            <div className="space-y-3">
            <div className="overflow-x-auto overflow-y-auto rounded-lg border border-border max-h-[460px]">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 z-10 bg-muted/70 text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 text-center font-semibold">라이선스 ID</th>
                    <th className="px-3 py-2 text-center font-semibold">라이더명</th>
                    <th className="px-3 py-2 text-center font-semibold">뒷번호</th>
                    <th className="px-3 py-2 text-center font-semibold">총 오더</th>
                    {parsed.branches.map((b) => (
                      <th key={b} className="px-3 py-2 text-center font-semibold">
                        {b} 오더
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.riders.map((r) => {
                    const isSelected = selectedRider === r.key;
                    return (
                      <tr
                        key={r.key}
                        className={`border-b border-border cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-muted/70" : ""}`}
                        onClick={() =>
                          setSelectedRider((prev) => (prev === r.key ? null : r.key))
                        }
                      >
                    <td className="px-3 py-2 align-top text-center text-foreground">{r.licenseId}</td>
                    <td className="px-3 py-2 align-top text-center text-foreground">
                      {(() => {
                        const summary = getSummaryFor(r);
                        const primaryBranch =
                          summary?.branchName ||
                          Object.entries(r.branchCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
                          "-";
                        const match = findMatchedRider(
                          primaryBranch,
                          r.riderSuffix ||
                            summary?.suffix ||
                            splitRider(summary?.rawName || "").suffix ||
                            ""
                        );
                        if (match) {
                          return (
                            <a
                              href={`/riders/${match.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary underline underline-offset-2"
                            >
                              {r.riderName}
                            </a>
                          );
                        }
                        return r.riderName;
                      })()}
                    </td>
                        <td className="px-3 py-2 align-top text-center text-foreground">
                          {r.riderSuffix ||
                            getSummaryFor(r)?.suffix ||
                            splitRider(getSummaryFor(r)?.rawName || "").suffix ||
                            "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-center font-semibold text-foreground">
                          {r.totalOrders.toLocaleString()}
                        </td>
                        {parsed.branches.map((b) => (
                          <td key={b} className="px-3 py-2 align-top text-center text-foreground">
                            {(r.branchCounts[b] || 0).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {parsed.riders.map((r) => {
              if (selectedRider !== r.key) return null;

              const peakEntries = Object.entries(r.peakByDate).sort((a, b) =>
                a[0].localeCompare(b[0])
              );

              return (
                <div key={`${r.licenseId}-details`} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {r.riderName} ({r.licenseId}) 상세
                    </span>
                    <span>건수 {r.totalOrders.toLocaleString()}</span>
                  </div>

                  <div className="text-[11px] font-semibold text-foreground">판정일자 피크타임 집계</div>

                  <div className="overflow-x-auto rounded-md border border-border bg-background">
                    <table className="min-w-full text-[11px]">
                      <thead className="sticky top-0 z-10 bg-muted/70 text-muted-foreground backdrop-blur">
                        <tr>
                          <th className="px-2 py-1 text-center font-semibold">판정일자</th>
                          <th className="px-2 py-1 text-center font-semibold">Breakfast</th>
                          <th className="px-2 py-1 text-center font-semibold">Lunch_Peak</th>
                          <th className="px-2 py-1 text-center font-semibold">Post_Lunch</th>
                          <th className="px-2 py-1 text-center font-semibold">Dinner_Peak</th>
                          <th className="px-2 py-1 text-center font-semibold">Post_Dinner</th>
                          <th className="px-2 py-1 text-center font-semibold">합계</th>
                        </tr>
                      </thead>
                      <tbody>
                        {peakEntries.map(([date, v]) => (
                          <tr key={date} className="border-t border-border">
                            <td className="px-2 py-1 text-center text-foreground">{date}</td>
                            <td className="px-2 py-1 text-center text-foreground">{v.Breakfast}</td>
                            <td className="px-2 py-1 text-center text-foreground">{v.Lunch_Peak}</td>
                            <td className="px-2 py-1 text-center text-foreground">{v.Post_Lunch}</td>
                            <td className="px-2 py-1 text-center text-foreground">{v.Dinner_Peak}</td>
                            <td className="px-2 py-1 text-center text-foreground">{v.Post_Dinner}</td>
                            <td className="px-2 py-1 text-center font-semibold text-foreground">{v.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] font-semibold text-foreground">오더 상세 내역</div>

                  <div className="overflow-x-auto rounded-md border border-border bg-background max-h-[360px]">
                    <table className="min-w-full text-[11px]">
                      <thead className="sticky top-0 z-10 bg-muted/70 text-muted-foreground backdrop-blur">
                        <tr>
                          <th className="px-2 py-1 text-center font-semibold">No</th>
                          <th className="px-2 py-1 text-center font-semibold">라이더명</th>
                          <th className="px-2 py-1 text-center font-semibold">뒷번호</th>
                          <th className="px-2 py-1 text-center font-semibold">지사</th>
                          <th className="px-2 py-1 text-center font-semibold">주문번호</th>
                          <th className="px-2 py-1 text-center font-semibold">수락시간</th>
                          <th className="px-2 py-1 text-center font-semibold">피크타임</th>
                          <th className="px-2 py-1 text-center font-semibold">판정일자</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.details.map((d, idx) => (
                          <tr key={`${d.orderNo}-${idx}`} className="border-t border-border">
                            <td className="px-2 py-1 text-center text-foreground">{idx + 1}</td>
                            <td className="px-2 py-1 text-center text-foreground">{d.riderName}</td>
                            <td className="px-2 py-1 text-center text-foreground">{d.riderSuffix || "-"}</td>
                            <td className="px-2 py-1 text-center text-foreground">{d.branchName}</td>
                            <td className="px-2 py-1 text-center text-foreground">{d.orderNo}</td>
                            <td className="px-2 py-1 text-center text-foreground">{d.acceptedAt}</td>
                            <td className="px-2 py-1 text-center text-foreground">{d.peakTime}</td>
                            <td className="px-2 py-1 text-center text-foreground">{d.judgementDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3 */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">정산 마법사 / Step 3</div>
            <h2 className="text-base font-semibold text-foreground">최종 정산 검토</h2>
            <p className="text-xs text-muted-foreground">
              라이선스/라이더별 정산 결과를 확인하고 프로모션·공제 내역을 검토합니다.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">20행 가량 표시 후 스크롤</span>
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
              onClick={handleExportXlsx}
              disabled={!parsed || step3Rows.length === 0}
            >
              XLSX 내보내기
            </button>
          </div>
        </div>

        {!parsed && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            Step 2에서 파일을 파싱하면 결과가 여기에 표시됩니다.
          </div>
        )}

        {parsed && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <div className="max-h-[1080px] overflow-y-auto">
              <table className="min-w-[2200px] border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-30 bg-muted/90 text-muted-foreground backdrop-blur">
                  <tr>
                    <th
                      className="sticky top-0 z-40 border border-border px-3 py-3 text-center font-semibold whitespace-nowrap bg-card"
                      style={{ left: 0, width: `${riderColWidth}px`, minWidth: `${riderColWidth}px`, maxWidth: `${riderColWidth}px` }}
                    >
                      라이더명
                    </th>
                    <th
                      className="border border-border px-3 py-3 text-center font-semibold whitespace-nowrap"
                      style={{ width: `${licenseColWidth}px`, minWidth: `${licenseColWidth}px`, maxWidth: `${licenseColWidth}px` }}
                    >
                      라이선스 ID
                    </th>
                    <th className="border border-border px-3 py-3 text-center font-semibold whitespace-nowrap">오더수</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${redCellClass}`}>대여금</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${redCellClass}`}>렌트비용</th>
                    <th className="border border-border px-3 py-3 text-center font-semibold whitespace-nowrap">익일정산</th>
                    <th className="border border-border px-3 py-3 text-center font-semibold whitespace-nowrap">실제 입금액</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${redCellClass}`}>수수료</th>
                    <th className="border border-border px-3 py-3 text-center font-semibold whitespace-nowrap">지사</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${purpleCellClass}`}>피크 점수</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${purpleCellClass}`}>프모 기준</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${purpleCellClass}`}>프로모션</th>
                    {missionDates.map((d) => (
                      <th
                        key={`mission-head-${d}`}
                        className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${purpleCellClass}`}
                      >
                        {formatMissionLabel(d)}
                      </th>
                    ))}
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${blueCellClass}`}>정산금액</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${blueCellClass}`}>총 지원금</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${redCellClass}`}>차감내역</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${blueCellClass}`}>총 정산금액</th>
                    <th className="border border-border px-3 py-3 text-center font-semibold whitespace-nowrap">전체 총 금액</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${redCellClass}`}>고용보험</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${redCellClass}`}>산재보험</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${redCellClass}`}>시간제보험</th>
                    <th className={`border border-border px-3 py-3 text-center font-semibold whitespace-nowrap ${redCellClass}`}>보험료 소급</th>
                    <th className="border border-border px-3 py-3 text-center font-semibold whitespace-nowrap">원천세</th>
                    <th className="border border-border px-3 py-3 text-center font-semibold whitespace-nowrap">상세보기</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, idx) => {
                    const hasChildren = (childRowsByKey[row.key]?.length || 0) > 1;
                    const isChild = !!row.isChild;
                    const expanded = expandedRows[row.key];
                    return (
                      <tr key={`${row.key}-${idx}`} className={isChild ? "bg-muted/10" : "bg-background"}>
                      <td
                        className={`sticky z-20 border border-border px-3 py-3 text-center text-foreground whitespace-nowrap ${isChild ? "bg-muted/20" : "bg-card"}`}
                        style={{ left: 0, width: `${riderColWidth}px`, minWidth: `${riderColWidth}px`, maxWidth: `${riderColWidth}px` }}
                      >
                        <div className={`flex items-center gap-2 ${isChild ? "pl-2" : ""}`}>
                          {hasChildren ? (
                            <button
                              type="button"
                              className="h-6 w-6 rounded-md border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted"
                              onClick={() =>
                                setExpandedRows((prev) => ({
                                  ...prev,
                                  [row.key]: !prev[row.key],
                                }))
                              }
                            >
                              {expanded ? "−" : "+"}
                            </button>
                          ) : (
                            <span className="inline-block h-6 w-6" />
                          )}
                          <div className="text-left">
                            <div className="font-semibold leading-tight">
                              {row.matchedRiderId ? (
                                <a
                                  href={`/riders/${row.matchedRiderId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline underline-offset-2"
                                >
                                  {row.riderName}
                                </a>
                              ) : (
                                row.riderName
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">뒷번호 {row.riderSuffix}</div>
                            {row.sourceFile && (
                              <div className="text-[10px] text-muted-foreground">파일: {row.sourceFile}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="border border-border px-3 py-3 text-center font-semibold text-foreground whitespace-nowrap"
                        style={{ width: `${licenseColWidth}px`, minWidth: `${licenseColWidth}px`, maxWidth: `${licenseColWidth}px` }}
                      >
                        {row.licenseId}
                      </td>
                      <td className="border border-border px-3 py-3 text-center font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                        {row.orderCount.toLocaleString()}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${redCellClass}`}>
                        {row.loanPayment ? `-${formatCurrency(row.loanPayment)}원` : "-"}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${redCellClass}`}>
                        {row.rentCost}
                      </td>
                      <td className="border border-border px-3 py-3 text-center whitespace-nowrap">
                        {row.nextDaySettlement ? `-${formatCurrency(row.nextDaySettlement)}원` : "-"}
                      </td>
                      <td className="border border-border px-3 py-3 text-center whitespace-nowrap">
                        {row.actualDeposit ? `${formatCurrency(row.actualDeposit)}원` : "-"}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${redCellClass}`}>
                        {row.fee ? `-${formatCurrency(row.fee)}원` : "-"}
                      </td>
                      <td className="border border-border px-3 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-[3px] text-[11px] font-medium leading-none text-primary">
                          {row.branchName || "-"}
                        </span>
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${purpleCellClass}`}>
                        {row.peakScore}
                      </td>
                      <td
                        className={`border border-border px-3 py-3 text-center text-[12px] ${purpleCellClass}`}
                        style={{ minWidth: "140px", width: "140px" }}
                      >
                        {(row.promoBasis || "-")
                          .split("\n")
                          .map((line, idx) => (
                            <div
                              key={`${row.licenseId}-promo-${idx}`}
                              className={line.includes("피크점수") ? "text-amber-700 font-semibold" : ""}
                            >
                              {line || "-"}
                            </div>
                          ))}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${purpleCellClass}`}>
                        {row.promoAmount ? `${formatCurrency(row.promoAmount)}원` : "-"}
                      </td>
                      {missionDates.map((d) => {
                        const amt = missionTotals[d]?.[row.key] || 0;
                        return (
                          <td
                            key={`mission-${row.key}-${d}`}
                            className={`border border-border px-3 py-3 text-center whitespace-nowrap ${purpleCellClass}`}
                          >
                            {amt ? `${formatCurrency(amt)}원` : "-"}
                          </td>
                        );
                      })}
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${blueCellClass}`}>
                        {row.settlementAmount ? `${formatCurrency(row.settlementAmount)}원` : "-"}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${blueCellClass}`}>
                        {row.supportTotal ? `${formatCurrency(row.supportTotal)}원` : "-"}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${redCellClass}`}>
                        {row.deduction ? `${formatCurrency(row.deduction)}원` : "-"}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${blueCellClass}`}>
                        {row.totalSettlement ? `${formatCurrency(row.totalSettlement)}원` : "-"}
                      </td>
                      <td className="border border-border px-3 py-3 text-center whitespace-nowrap">
                        {row.overallTotal ? `${formatCurrency(row.overallTotal)}원` : "-"}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${redCellClass}`}>
                        {row.employment ? `${formatCurrency(row.employment)}원` : "-"}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${redCellClass}`}>
                        {row.accident ? `${formatCurrency(row.accident)}원` : "-"}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${redCellClass}`}>
                        {row.timeInsurance ? `${formatCurrency(row.timeInsurance)}원` : "-"}
                      </td>
                      <td className={`border border-border px-3 py-3 text-center whitespace-nowrap ${redCellClass}`}>
                        {row.retro ? `${formatCurrency(row.retro)}원` : "-"}
                      </td>
                      <td className="border border-border px-3 py-3 text-center whitespace-nowrap">
                        {row.withholding ? `${formatCurrency(row.withholding)}원` : "-"}
                      </td>
                      <td className="border border-border px-3 py-3 text-center whitespace-nowrap">
                        {row.isChild ? (
                          <span className="text-[11px] text-muted-foreground">-</span>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
                            onClick={() => openDetail(row)}
                          >
                            보기
                          </button>
                        )}
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <SettlementRowDrawer
        open={detailOpen}
        row={detailRow}
        variant="weekly"
        missionDates={missionDates}
        missionTotals={missionTotals}
        onClose={closeDetail}
        onClosed={() => setDetailRow(null)}
      />
    </div>
  );
}
