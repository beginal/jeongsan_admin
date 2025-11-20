import { NextResponse } from "next/server";
import { decrypt } from "officecrypto-tool";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type RiderSummary = {
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
};

type OrderDetail = {
  licenseId: string;
  riderName: string;
  riderSuffix?: string;
  branchName: string;
  orderNo: string;
  acceptedAt: string;
  acceptedAtMs: number;
  peakTime: string;
  judgementDate: string;
};

type MissionRow = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  amount: number;
  licenseId?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

const formatJudgementDate = (y: number, m: number, d: number, H: number) => {
  // 06:00~05:59 기준으로 일자 판정
  const date = new Date(y, m - 1, d);
  if (H < 6) {
    date.setDate(date.getDate() - 1);
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const parseExcelDate = (value: any) => {
  if (typeof value !== "number") return null;
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) return null;
  const ms =
    Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S || 0)) +
    Math.round(((parsed.S || 0) % 1) * 1000);
  const text = `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)} ${pad(parsed.H)}:${pad(parsed.M)}:${pad(Math.floor(parsed.S || 0))}`;
  const judgementDate = formatJudgementDate(parsed.y, parsed.m, parsed.d, parsed.H);
  return { ms, text, judgementDate };
};

const findHeaderRow = (sheet: XLSX.WorkSheet, matcher: (v: string) => boolean) => {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "string" && matcher(cell.v)) {
        return r;
      }
    }
  }
  return -1;
};

const splitRider = (full: string) => {
  const m = full.match(/^(.*?)(\d{4})$/);
  if (m) return { name: m[1] || full, suffix: m[2] || "" };
  return { name: full, suffix: "" };
};

const parseSummarySheet = (wb: XLSX.WorkBook, branchName: string): RiderSummary[] => {
  const ws = wb.Sheets["종합"];
  if (!ws) return [];
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");

  const findCol = (label: string) => {
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const v = ws[XLSX.utils.encode_cell({ r, c })]?.v;
        if (v === label) return { row: r, col: c };
      }
    }
    return { row: -1, col: -1 };
  };

  const cols = {
    license: findCol("라이선스 ID"),
    name: findCol("성함"),
    totalOrders: findCol("총 정산 오더수"),
    settlementAmount: findCol("정산금액"),
    supportTotal: findCol("총 지원금"),
    deduction: findCol("차감내역"),
    totalSettlement: findCol("총 정산금액"),
    fee: findCol("⑧수수료 차감 금액"),
    employment: findCol("③기사부담 고용보험"),
    accident: findCol("⑤기사부담 산재보험"),
    timeInsurance: findCol("⑥시간제보험"),
    retro: findCol("⑦보험료 소급"),
  };

  const headerRow = Math.max(
    ...Object.values(cols).map((v) => v.row).filter((v) => v >= 0),
    0
  );
  if (cols.license.col < 0 || cols.name.col < 0) return [];

  const summaries: RiderSummary[] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const licCell = ws[XLSX.utils.encode_cell({ r, c: cols.license.col })];
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: cols.name.col })];
    const totalCell = ws[XLSX.utils.encode_cell({ r, c: cols.totalOrders.col })];
    const getNum = (col: number) => {
      if (col < 0) return 0;
      const raw = ws[XLSX.utils.encode_cell({ r, c: col })]?.v;
      if (typeof raw === "number") return raw;
      const num = Number(raw);
      return Number.isFinite(num) ? num : 0;
    };

    const licenseId = licCell?.v != null ? String(licCell.v).trim() : "";
    const riderNameRaw = nameCell?.v != null ? String(nameCell.v).trim() : "";
    const { name: riderName, suffix } = splitRider(riderNameRaw || "");
    const totalOrders = totalCell?.v != null ? Math.round(getNum(cols.totalOrders.col)) : 0;

    const settlementAmount = getNum(cols.settlementAmount.col);
    const supportTotal = getNum(cols.supportTotal.col);
    const deduction = getNum(cols.deduction.col);
    const totalSettlement = getNum(cols.totalSettlement.col);
    const fee = getNum(cols.fee.col);
    const employment = getNum(cols.employment.col);
    const accident = getNum(cols.accident.col);
    const timeInsurance = getNum(cols.timeInsurance.col);
    const retro = getNum(cols.retro.col);

    if (!licenseId && !riderName && !totalOrders) continue;
    if (!licenseId && riderName) {
      summaries.push({
        licenseId: "-",
        riderName,
        riderNameRaw,
        totalOrders: totalOrders || 0,
        branchName,
        settlementAmount,
        supportTotal,
        deduction,
        totalSettlement,
        fee,
        employment,
        accident,
        timeInsurance,
        retro,
      });
    } else {
      summaries.push({
        licenseId: licenseId || "-",
        riderName: riderName || "-",
        riderNameRaw,
        totalOrders: totalOrders || 0,
        branchName,
        settlementAmount,
        supportTotal,
        deduction,
        totalSettlement,
        fee,
        employment,
        accident,
        timeInsurance,
        retro,
      });
    }
  }

  return summaries;
};

const parseOrderDetails = (
  wb: XLSX.WorkBook,
  branchName: string,
  licenseByName: Map<string, string>
): OrderDetail[] => {
  const ws = wb.Sheets["오더별 상세 내역서"];
  if (!ws) return [];

  const headerRow = findHeaderRow(ws, (v) => v === "이름");
  if (headerRow < 0) return [];

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  const colIdx = {
    name: -1,
    orderNo: -1,
    accepted: -1,
    peak: -1,
  };

  for (let c = range.s.c; c <= range.e.c; c++) {
    const val = ws[XLSX.utils.encode_cell({ r: headerRow, c })]?.v;
    if (val === "이름") colIdx.name = c;
    if (val === "축약형 주문번호") colIdx.orderNo = c;
    if (val === "수락시간") colIdx.accepted = c;
    if (val === "피크타임") colIdx.peak = c;
  }

  const details: OrderDetail[] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: colIdx.name })];
    const orderCell = ws[XLSX.utils.encode_cell({ r, c: colIdx.orderNo })];
    const acceptCell = ws[XLSX.utils.encode_cell({ r, c: colIdx.accepted })];
    const peakCell = ws[XLSX.utils.encode_cell({ r, c: colIdx.peak })];

    const riderNameRaw = nameCell?.v != null ? String(nameCell.v).trim() : "";
    if (!riderNameRaw) continue;
    const { name: riderName, suffix: riderSuffix } = splitRider(riderNameRaw);

    const orderNo = orderCell?.v != null ? String(orderCell.v).trim() : "";
    const peakTime = peakCell?.v != null ? String(peakCell.v).trim() : "";

    const parsedDate = parseExcelDate(acceptCell?.v);
    if (!parsedDate) continue;

    const licenseId = licenseByName.get(riderName) || "-";

    details.push({
      licenseId,
      riderName,
      riderSuffix,
      branchName,
      orderNo,
      acceptedAt: parsedDate.text,
      acceptedAtMs: parsedDate.ms,
      peakTime,
      judgementDate: parsedDate.judgementDate,
    });
  }

  return details;
};

const parseMissionSheet = (wb: XLSX.WorkBook): MissionRow[] => {
  const ws = wb.Sheets["협력사 자체 미션"];
  if (!ws) return [];
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");

  // 헤더 행 찾기
  let headerRow = -1;
  for (let r = range.s.r; r <= range.e.r; r++) {
    const firstCell = ws[XLSX.utils.encode_cell({ r, c: range.s.c })];
    if (firstCell && firstCell.v === "미션 명") {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) return [];

  const colMap: Record<string, number> = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const v = ws[XLSX.utils.encode_cell({ r: headerRow, c })]?.v;
    if (v) colMap[String(v)] = c;
  }

  const result: MissionRow[] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const status = ws[XLSX.utils.encode_cell({ r, c: colMap["달성 유무"] })]?.v;
    if (status !== "달성") continue;
    const nameRaw = ws[XLSX.utils.encode_cell({ r, c: colMap["이름"] })]?.v;
    if (!nameRaw) continue;
    const missionName = ws[XLSX.utils.encode_cell({ r, c: colMap["미션 명"] })]?.v || "";

    const startRaw = ws[XLSX.utils.encode_cell({ r, c: colMap["미션 시작"] })]?.v;
    const endRaw = ws[XLSX.utils.encode_cell({ r, c: colMap["미션 종료"] })]?.v;
    const amountRaw =
      ws[XLSX.utils.encode_cell({ r, c: colMap["협력사 자체미션 금액"] })]?.v ??
      ws[XLSX.utils.encode_cell({ r, c: colMap["금액"] })]?.v ??
      0;

    const startParsed = parseExcelDate(startRaw);
    const endParsed = parseExcelDate(endRaw);

    result.push({
      name: String(nameRaw),
      startDate: startParsed ? startParsed.text.slice(0, 10) : startRaw || null,
      endDate: endParsed ? endParsed.text.slice(0, 10) : endRaw || null,
      amount:
        typeof amountRaw === "number"
          ? amountRaw
          : Number.isFinite(Number(amountRaw))
            ? Number(amountRaw)
            : 0,
    });
  }

  return result;
};

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const password = String(form.get("password") || "");
    const branchName = String(form.get("branchName") || "");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "파일이 전달되지 않았습니다." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "비밀번호가 필요합니다." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const decrypted = await decrypt(buf, { password });
    const wb = XLSX.read(decrypted, { type: "buffer" });

    const summaries = parseSummarySheet(wb, branchName);
    const licenseByName = new Map(summaries.map((s) => [s.riderName, s.licenseId]));
    const details = parseOrderDetails(wb, branchName, licenseByName);
    const missions = parseMissionSheet(wb);

    return NextResponse.json({ summaries, details, missions });
  } catch (e: any) {
    console.error("[settlement/parse] error:", e);
    return NextResponse.json(
      { error: e?.message || "정산 파일을 파싱하지 못했습니다." },
      { status: 500 }
    );
  }
}
