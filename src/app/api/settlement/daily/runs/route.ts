import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

type SettlementResult = {
  branchId: string;
  licenseId: string;
  riderId?: string | null;
  riderName?: string | null;
  riderSuffix?: string | null;
  orderCount: number;
  settlementAmount: number;
  supportTotal: number;
  deduction: number;
  totalSettlement: number;
  missionTotal: number;
  fee: number;
  employment: number;
  accident: number;
  timeInsurance: number;
  retro: number;
  withholding: number;
  rentCost: number;
  loanPayment: number;
  nextDaySettlement: number;
  netPayout?: number | null; // 프런트에서 전달된 값 (없으면 null)
  // 아래 필드는 상세 근거 저장용
  raw?: any;
};

type MissionRow = {
  branchId: string;
  licenseId: string;
  riderId?: string | null;
  missionDate: string;
  amount: number;
  meta?: any;
};

type OrderRow = {
  branchId: string;
  licenseId: string;
  riderId?: string | null;
  orderNo: string;
  acceptedAt?: string | null;
  judgementDate?: string | null;
  peakTime?: string | null;
  branchName?: string | null;
  raw?: any;
};

type UploadPayload = {
  fileName: string;
  fileHash: string;
  branchId: string;
  settlementDate: string; // 종합 시트 B4 파싱 결과 (YYYY-MM-DD)
  results: SettlementResult[];
  missions: MissionRow[];
  orders?: OrderRow[];
};

type PostBody = {
  uploads: UploadPayload[];
  forceOverwrite?: boolean;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  const supabase = auth.serviceSupabase ?? auth.supabase;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const branchId = searchParams.get("branchId");
  const fileHash = searchParams.get("fileHash");

  if (!date && !fileHash) {
    return NextResponse.json({ error: "date 또는 fileHash 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const runQuery = supabase
      .from("daily_settlement_runs")
      .select("id, settlement_date, branch_id, status, stats, file_refs, confirmed_at, confirmed_by, created_at")
      .order("confirmed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (date) runQuery.eq("settlement_date", date);
    if (branchId) runQuery.eq("branch_id", branchId);
    if (fileHash) runQuery.contains("file_refs", [{ fileHash }]);

    const { data: runs, error: runErr } = await runQuery.limit(5);
    if (runErr) {
      console.error("[settlement/daily GET] run query error:", runErr);
      return NextResponse.json(
        {
          error: "정산 실행을 불러오지 못했습니다.",
          detail: runErr?.message || runErr?.hint || runErr?.details || runErr?.code || null,
        },
        { status: 500 }
      );
    }

    if (!runs || runs.length === 0) {
      return NextResponse.json({ runs: [] });
    }

    // 마지막 confirmed run만 유효
    const confirmed = runs.find((r: any) => r.status === "confirmed") || runs[0];
    const runId = confirmed.id;

    const [{ data: results, error: resErr }, { data: missions, error: misErr }, { data: orders, error: ordErr }] =
      await Promise.all([
        supabase.from("daily_settlement_results").select("*").eq("run_id", runId),
        supabase.from("daily_settlement_missions").select("*").eq("run_id", runId),
        supabase.from("daily_settlement_orders").select("*").eq("run_id", runId),
      ]);

    if (resErr || misErr || ordErr) {
      console.error("[settlement/daily GET] detail error:", resErr || misErr || ordErr);
      return NextResponse.json(
        {
          error: "정산 상세를 불러오지 못했습니다.",
          detail:
            resErr?.message ||
            resErr?.hint ||
            resErr?.details ||
            resErr?.code ||
            misErr?.message ||
            misErr?.hint ||
            misErr?.details ||
            misErr?.code ||
            ordErr?.message ||
            ordErr?.hint ||
            ordErr?.details ||
            ordErr?.code ||
            null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      run: confirmed,
      results: results || [],
      missions: missions || [],
      orders: orders || [],
    });
  } catch (e) {
    console.error("[settlement/daily GET] unexpected error:", e);
    return NextResponse.json({ error: "정산 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if ("response" in auth) return auth.response;
  if (!auth.serviceSupabase) {
    return NextResponse.json(
      { error: "서비스 롤 키가 필요합니다. SUPABASE_SERVICE_ROLE_KEY를 설정해주세요." },
      { status: 500 }
    );
  }
  const supabase = auth.serviceSupabase;

  if (!supabase) {
    return NextResponse.json(
      { error: "서비스 키가 필요합니다. SUPABASE_SERVICE_ROLE_KEY를 설정해주세요." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as PostBody;
  const uploads = Array.isArray(body.uploads) ? body.uploads : [];
  const forceOverwrite = !!body.forceOverwrite;
  if (uploads.length === 0) {
    return NextResponse.json({ error: "업로드 데이터가 없습니다." }, { status: 400 });
  }

  // 파일 해시 중복 여부 확인용
  const fileHashes = uploads.map((u) => u.fileHash).filter(Boolean);

  try {
    const results: any[] = [];

    for (const upload of uploads) {
      const {
        fileName,
        fileHash,
        branchId,
        settlementDate,
        results: resultRows,
        missions,
        orders,
      } = upload;

      if (!branchId || !settlementDate) {
        return NextResponse.json(
          { error: "branchId와 settlementDate가 필요합니다." },
          { status: 400 }
        );
      }
      if (!Array.isArray(resultRows) || resultRows.length === 0) {
        return NextResponse.json({ error: "results가 비어 있습니다." }, { status: 400 });
      }

      const runIdsToDelete: string[] = [];

      // 파일 해시 중복 체크
      if (fileHash) {
        const { data: dupRun, error: dupErr } = await supabase
          .from("daily_settlement_runs")
          .select("id, settlement_date, branch_id")
          .contains("file_refs", [{ fileHash }])
          .limit(1)
          .maybeSingle();
        if (dupErr) {
          console.error("[settlement/daily POST] duplicate hash check error:", dupErr);
        }
        if (dupRun && !forceOverwrite) {
          return NextResponse.json(
            {
              error: "이미 저장된 정산 파일입니다.",
              detail: `fileHash ${fileHash} (run ${dupRun.id})`,
            },
            { status: 409 }
          );
        }
        if (dupRun) {
          runIdsToDelete.push(dupRun.id);
        }
      }

      // 기존 run 여부(날짜+지사)
      const { data: existingRuns, error: existingErr } = await supabase
        .from("daily_settlement_runs")
        .select("id, status, confirmed_at")
        .eq("settlement_date", settlementDate)
        .eq("branch_id", branchId);

      if (existingErr) {
        console.error("[settlement/daily POST] existing check error:", existingErr);
      }
      if (existingRuns && existingRuns.length > 0) {
        if (!forceOverwrite) {
          return NextResponse.json(
            {
              error: "해당 날짜/지사에 이미 저장된 정산이 있습니다.",
              detail: `date ${settlementDate}, branch ${branchId}`,
            },
            { status: 409 }
          );
        }
        existingRuns.forEach((r: any) => {
          if (r?.id) runIdsToDelete.push(r.id);
        });
      }

      if (runIdsToDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("daily_settlement_runs")
          .delete()
          .in("id", runIdsToDelete);
        if (delErr) {
          console.error("[settlement/daily POST] overwrite delete error:", delErr);
          return NextResponse.json(
            { error: "기존 정산을 덮어쓰지 못했습니다.", detail: delErr.message || delErr.code || null },
            { status: 500 }
          );
        }
      }

      // 통계 집계
      const totalOrders = resultRows.reduce((acc, r) => acc + Number(r.orderCount || 0), 0);
      const totalSettlement = resultRows.reduce(
        (acc, r) => acc + Number(r.totalSettlement || 0),
        0
      );
      const riderCount = resultRows.length;

      const runPayload: any = {
        settlement_date: settlementDate,
        branch_id: branchId,
        status: "confirmed",
        file_refs: [
          {
            fileName,
            fileHash,
            uploadedAt: new Date().toISOString(),
          },
        ],
        stats: {
          totalOrders,
          totalSettlement,
          riderCount,
        },
        confirmed_at: new Date().toISOString(),
        confirmed_by: auth.user.id,
        // created_at/updated_at, overwrite_* 등은 DB에 컬럼이 없을 수 있어 제외 (트리거/기본값 사용)
      };

      const { data: runInsert, error: runErr } = await supabase
        .from("daily_settlement_runs")
        .insert(runPayload)
        .select("id")
        .maybeSingle();

      if (runErr || !runInsert) {
        console.error("[settlement/daily POST] run insert error:", runErr);
        return NextResponse.json(
          {
            error: "정산 실행을 저장하지 못했습니다.",
            detail:
              runErr?.message ||
              runErr?.hint ||
              runErr?.details ||
              runErr?.code ||
              (runErr ? JSON.stringify(runErr) : null),
          },
          { status: 500 }
        );
      }

      if (!runInsert) {
        return NextResponse.json(
          {
            error: "정산 실행 삽입 결과가 없습니다.",
            detail: "테이블 스키마 또는 RLS/권한을 확인하세요.",
          },
          { status: 500 }
        );
      }

      const runId = (runInsert as any).id;

      // 결과 insert
      const resultPayloads = resultRows.map((r) => ({
        run_id: runId,
        branch_id: branchId,
        rider_id: r.riderId || null,
        license_id: r.licenseId,
        rider_name: r.riderName || null,
        rider_suffix: r.riderSuffix || null,
        order_count: r.orderCount,
        settlement_amount: r.settlementAmount,
        support_total: r.supportTotal,
        deduction: r.deduction,
        total_settlement: r.totalSettlement,
        mission_total: r.missionTotal,
        fee: r.fee,
        employment: r.employment,
        accident: r.accident,
        time_insurance: r.timeInsurance,
        retro: r.retro,
        withholding: r.withholding,
        rent_cost: r.rentCost,
        loan_payment: r.loanPayment,
        next_day_settlement: r.nextDaySettlement,
        net_payout: r.netPayout ?? null,
        raw: r.raw ?? null,
        created_at: new Date().toISOString(),
      }));

      const { error: resErr } = await supabase.from("daily_settlement_results").insert(resultPayloads);
      if (resErr) {
        console.error("[settlement/daily POST] results insert error:", resErr);
        return NextResponse.json(
          {
            error: "라이더 정산 결과를 저장하지 못했습니다.",
            detail:
              resErr?.message ||
              resErr?.hint ||
              resErr?.details ||
              resErr?.code ||
              (resErr ? JSON.stringify(resErr) : null),
          },
          { status: 500 }
        );
      }

      // 미션 insert
      if (Array.isArray(missions) && missions.length > 0) {
        const missionPayloads = missions.map((m) => ({
          run_id: runId,
          branch_id: m.branchId || branchId,
          rider_id: m.riderId || null,
          license_id: m.licenseId,
          mission_date: m.missionDate,
          amount: m.amount,
          meta: m.meta ?? null,
        }));
        const { error: misErr } = await supabase
          .from("daily_settlement_missions")
          .insert(missionPayloads);
        if (misErr) {
          console.error("[settlement/daily POST] missions insert error:", misErr);
          return NextResponse.json(
            {
              error: "미션 정보를 저장하지 못했습니다.",
              detail:
                misErr?.message ||
                misErr?.hint ||
                misErr?.details ||
                misErr?.code ||
                (misErr ? JSON.stringify(misErr) : null),
            },
            { status: 500 }
          );
        }
      }

      // 오더 insert
      if (Array.isArray(orders) && orders.length > 0) {
        const orderPayloads = orders.map((o) => ({
          run_id: runId,
          branch_id: o.branchId || branchId,
          rider_id: o.riderId || null,
          license_id: o.licenseId,
          order_no: o.orderNo,
          accepted_at: o.acceptedAt || null,
          judgement_date: o.judgementDate || null,
          peak_time: o.peakTime || null,
          branch_name: o.branchName || null,
          raw: o.raw ?? null,
        }));
        const { error: ordErr } = await supabase.from("daily_settlement_orders").insert(orderPayloads);
        if (ordErr) {
          console.error("[settlement/daily POST] orders insert error:", ordErr);
          return NextResponse.json(
            {
              error: "오더 상세를 저장하지 못했습니다.",
              detail:
                ordErr?.message ||
                ordErr?.hint ||
                ordErr?.details ||
                ordErr?.code ||
                (ordErr ? JSON.stringify(ordErr) : null),
            },
            { status: 500 }
          );
        }
      }

      results.push({ runId });
    }

    return NextResponse.json({ ok: true, runs: results, duplicates: fileHashes });
  } catch (e) {
    console.error("[settlement/daily POST] unexpected error:", e);
    return NextResponse.json({ error: "정산 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
