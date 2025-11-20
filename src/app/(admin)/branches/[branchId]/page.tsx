import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { BranchDeleteButton } from "@/components/admin-v2/BranchDeleteButton";
import { BranchPromotionActions } from "@/components/admin-v2/BranchPromotionActions";

interface BranchDetailPageProps {
  params: Promise<{ branchId: string }>;
}

type BranchPromotionStatus = "active" | "scheduled" | "ended";

const promotionTypeLabel = (type: string | null | undefined) => {
  if (type === "excess") return "건수 초과 보상";
  if (type === "milestone") return "목표 달성 보상";
  if (type === "milestone_per_unit") return "단위당 보상";
  return type || "-";
};

const promotionStatusLabel = (status: BranchPromotionStatus) => {
  if (status === "active") return "진행 중";
  if (status === "scheduled") return "시작 예정";
  return "종료";
};

const promotionStatusClass = (status: BranchPromotionStatus) => {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "scheduled") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const riderStatusLabel = (status: string | null | undefined) => {
  if (status === "approved") return "승인됨";
  if (status === "rejected") return "반려됨";
  return "대기";
};

const riderStatusClass = (status: string | null | undefined) => {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
};

export default async function BranchDetailPage({
  params,
}: BranchDetailPageProps) {
  const { branchId } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[branch detail] Supabase env not set");
    notFound();
  }

  const supabase = createClient(supabaseUrl!, serviceRoleKey!);

  const { data, error } = await supabase
    .from("new_branches_with_stats")
    .select(
      "id, platform, province, district, branch_name, display_name, region, rider_count, promotion_count, updated_at"
    )
    .eq("id", branchId)
    .maybeSingle();

  if (error) {
    console.error("[branch detail] Supabase error:", error);
  }

  if (!data) {
    notFound();
  }

  // 소속(법인/개인) 정보 조회
  let corporateName = "";
  let personalName = "";

  try {
    const { data: affiliation } = await supabase
      .from("branch_affiliations")
      .select("corporate_entity_id, personal_entity_id")
      .eq("branch_id", branchId)
      .maybeSingle();

    if (affiliation?.corporate_entity_id) {
      const { data: corpEntity } = await supabase
        .from("business_entities")
        .select("name")
        .eq("id", affiliation.corporate_entity_id)
        .maybeSingle();
      corporateName = corpEntity?.name ?? "";
    }

    if (affiliation?.personal_entity_id) {
      const { data: personalEntity } = await supabase
        .from("business_entities")
        .select("name")
        .eq("id", affiliation.personal_entity_id)
        .maybeSingle();
      personalName = personalEntity?.name ?? "";
    }
  } catch (affErr) {
    console.error("[branch detail] affiliation load error:", affErr);
  }

  // 지사 정산 수수료 정책 조회 (활성 정책 1개)
  let settlementFee = "";
  try {
    const { data: policy, error: policyError } = await supabase
      .from("branch_settlement_policies")
      .select("fee_type, fee_value")
      .eq("branch_id", branchId)
      .is("effective_to", null)
      .maybeSingle();

    if (policyError) {
      console.error("[branch detail] policy load error:", policyError);
    }

    if (policy) {
      if (policy.fee_type === "per_case") {
        settlementFee = `${Number(policy.fee_value).toLocaleString()}원 / 건`;
      } else if (policy.fee_type === "percentage") {
        settlementFee = `${Number(policy.fee_value)}%`;
      }
    }
  } catch (policyErr) {
    console.error("[branch detail] policy unexpected error:", policyErr);
  }

  const platformLabel =
    data.platform === "coupang"
      ? "쿠팡"
      : data.platform === "baemin"
        ? "배민"
        : data.platform || "기타";

  const branch = {
    shortName: data.district || data.province || data.region || "지사",
    name: data.display_name || data.branch_name || "지사",
    code: data.display_name || "",
    platform: platformLabel,
    province: data.province || "",
    district: data.district || "",
    corporateName,
    personalName,
    settlementFee: settlementFee || "미설정",
    status: "활성" as const,
    riderCount: typeof data.rider_count === "number" ? data.rider_count : 0,
    promotionCount:
      typeof data.promotion_count === "number" ? data.promotion_count : 0,
    lastSettlement: "-",
    updatedAt: data.updated_at
      ? new Date(data.updated_at).toISOString().slice(0, 10)
      : "",
    note: "",
  };

  // 설정된 프로모션 목록 조회
  let branchPromotions: {
    id: string;
    name: string;
    type: string | null;
    status: BranchPromotionStatus;
    startDate: string | null;
    endDate: string | null;
  }[] = [];

  try {
    const { data: assigns, error: assignsError } = await supabase
      .from("promotion_branch_assignments")
      .select(
        "promotion_id, is_active, start_date, end_date, promotions(id, name, type, status, config)"
      )
      .eq("branch_id", branchId);

    if (assignsError) {
      console.error(
        "[branch detail] promotion assignments load error:",
        assignsError
      );
    } else if (assigns && assigns.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const byPromotion = new Map<
        string,
        {
          id: string;
          name: string;
          type: string | null;
          assignments: {
            startDate: string | null;
            endDate: string | null;
            active: boolean;
          }[];
        }
      >();

      for (const raw of assigns as any[]) {
        const p = raw.promotions || {};
        const pid = String(p.id || raw.promotion_id);
        if (!pid) continue;

        const cfg = (p.config || {}) as Record<string, any>;
        const fallbackStart =
          (typeof cfg.startDate === "string" && cfg.startDate) ||
          (typeof cfg.start_date === "string" && cfg.start_date) ||
          null;
        const fallbackEnd =
          (typeof cfg.endDate === "string" && cfg.endDate) ||
          (typeof cfg.end_date === "string" && cfg.end_date) ||
          null;

        const startDate = raw.start_date
          ? String(raw.start_date)
          : fallbackStart;
        const endDate = raw.end_date ? String(raw.end_date) : fallbackEnd;

        let active =
          !!raw.is_active &&
          ((p.status as string | undefined) || "INACTIVE") === "ACTIVE";

        if (active && startDate) {
          const st = new Date(startDate);
          st.setHours(0, 0, 0, 0);
          if (today < st) active = false;
        }
        if (active && endDate) {
          const ed = new Date(endDate);
          ed.setHours(23, 59, 59, 999);
          if (today > ed) active = false;
        }

        let entry = byPromotion.get(pid);
        if (!entry) {
          entry = {
            id: pid,
            name: (p.name as string) || "",
            type: (p.type as string) || null,
            assignments: [],
          };
          byPromotion.set(pid, entry);
        }

        entry.assignments.push({
          startDate,
          endDate,
          active,
        });
      }

      branchPromotions = Array.from(byPromotion.values()).map((item) => {
        const todayInner = new Date();
        todayInner.setHours(0, 0, 0, 0);

        const hasActive = item.assignments.some((a) => a.active);
        const hasFuture = item.assignments.some((a) => {
          if (!a.startDate) return false;
          const st = new Date(a.startDate);
          st.setHours(0, 0, 0, 0);
          return st > todayInner;
        });

        let status: BranchPromotionStatus = "ended";
        if (hasActive) {
          status = "active";
        } else if (hasFuture) {
          status = "scheduled";
        }

        const validStarts = item.assignments
          .map((a) => a.startDate)
          .filter((v): v is string => !!v);
        const validEnds = item.assignments
          .map((a) => a.endDate)
          .filter((v): v is string => !!v);

        const startDate =
          validStarts.length > 0
            ? validStarts.sort((a, b) => a.localeCompare(b))[0]
            : null;
        const endDate =
          validEnds.length > 0
            ? validEnds.sort((a, b) => b.localeCompare(a))[0]
            : null;

        return {
          id: item.id,
          name: item.name,
          type: item.type,
          status,
          startDate,
          endDate,
        };
      });
    }
  } catch (promoErr) {
    console.error("[branch detail] promotion unexpected error:", promoErr);
  }

  // 소속 라이더 목록 조회
  let branchRiders: {
    id: string;
    name: string;
    phone: string;
    verificationStatus: string | null;
    isPrimary: boolean;
  }[] = [];

  try {
    const { data: ridersData, error: ridersError } = await supabase
      .from("rider_new_branches")
      .select(
        "rider_id, is_primary, status, riders:rider_id(id, name, phone, verification_status)"
      )
      .eq("new_branch_id", branchId)
      .eq("status", "active");

    if (ridersError) {
      console.error("[branch detail] riders load error:", ridersError);
    } else if (ridersData && ridersData.length > 0) {
      branchRiders = (ridersData as any[])
        .map((row) => {
          const rider = row.riders || {};
          return {
            id: String(row.rider_id),
            name: (rider.name as string) || "",
            phone: (rider.phone as string) || "",
            verificationStatus: (rider.verification_status as string) || null,
            isPrimary: !!row.is_primary,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }
  } catch (ridersErr) {
    console.error("[branch detail] riders unexpected error:", ridersErr);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
            {branch.shortName}
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              지사 관리 / {branch.code}
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {branch.name}
            </h1>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <a
            href="/branches"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="mr-1 text-[11px]">←</span>
            지사 목록
          </a>
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={
                branch.status === "활성"
                  ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                  : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
              }
            >
              {branch.status}
            </span>
            <span className="text-muted-foreground">
              · 마지막 수정 {branch.updatedAt}
            </span>
          </div>
          <BranchDeleteButton branchId={String(data.id)} />
          <a
            href={`/branches/${data.id}/edit`}
            className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            지사 수정
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            등록 라이더 수
          </div>
          <div className="mt-2 text-xl font-semibold text-foreground">
            {branch.riderCount.toLocaleString()}명
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            지난 30일 기준 활동 라이더
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            진행 중 프로모션
          </div>
          <div className="mt-2 text-xl font-semibold text-foreground">
            {branch.promotionCount}건
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            활성 프로모션 기준
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            최근 정산 완료
          </div>
          <div className="mt-2 text-xl font-semibold text-foreground">
            {branch.lastSettlement}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            마지막 정산 주기 기준
          </p>
        </div>
      </div>

      {/* Detail grid */}
      <div className="space-y-4">
        {/* Branch basic information */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            지사 정보
          </h2>
          <div className="mt-3 space-y-2">
            <DetailRow label="플랫폼" value={branch.platform} />
            <DetailRow label="시/도" value={branch.province || "-"} />
            <DetailRow label="구/시/군" value={branch.district || "-"} />
            <DetailRow label="지사명" value={data.branch_name || ""} />
            <DetailRow label="최종 지사명" value={data.display_name || ""} />
          </div>
        </div>

        {/* Affiliation information */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            소속 정보
          </h2>
          <div className="mt-3 space-y-2">
            <DetailRow
              label="소속(법인)"
              value={branch.corporateName || "-"}
            />
            <DetailRow
              label="소속(개인)"
              value={branch.personalName || "-"}
            />
          </div>
        </div>

        {/* Settlement information */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            정산 정보
          </h2>
          <div className="mt-3 space-y-2">
            <DetailRow
              label="설정된 정산 수수료"
              value={branch.settlementFee}
            />
          </div>
        </div>
      </div>

      {/* Promotions and Riders */}
      <div className="space-y-4">
        {/* Branch promotions */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              설정된 프로모션
            </h2>
            <span className="text-[11px] text-muted-foreground">
              총 {branchPromotions.length}건
            </span>
          </div>
          <div className="mt-3 max-h-64 overflow-x-auto overflow-y-auto rounded-md border border-border bg-muted/40 text-xs">
            <table className="w-full min-w-[520px] text-left">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">프로모션명</th>
                  <th className="px-3 py-2">유형</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">기간</th>
                  <th className="px-3 py-2 text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {branchPromotions.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-[11px] text-muted-foreground"
                    >
                      설정된 프로모션이 없습니다.
                    </td>
                  </tr>
                )}
                {branchPromotions.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 align-middle text-xs text-foreground">
                      {p.name || "-"}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-muted-foreground">
                      {promotionTypeLabel(p.type)}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${promotionStatusClass(
                          p.status
                        )}`}
                      >
                        {promotionStatusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle text-[11px] text-muted-foreground">
                      {p.startDate
                        ? p.startDate.slice(0, 10)
                        : "-"}{" "}
                      ~{" "}
                      {p.endDate
                        ? p.endDate.slice(0, 10)
                        : "현재"}
                    </td>
                    <td className="px-3 py-2 align-middle text-right text-[11px]">
                      <BranchPromotionActions
                        promotionId={p.id}
                        branchId={String(data.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Branch riders */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              소속 라이더
            </h2>
            <span className="text-[11px] text-muted-foreground">
              총 {branchRiders.length}명
            </span>
          </div>
          <div className="mt-3 max-h-64 overflow-x-auto overflow-y-auto rounded-md border border-border bg-muted/40 text-xs">
            <table className="w-full min-w-[520px] text-left">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">라이더명</th>
                  <th className="px-3 py-2">연락처</th>
                  <th className="px-3 py-2">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {branchRiders.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-4 text-center text-[11px] text-muted-foreground"
                    >
                      소속 라이더가 없습니다.
                    </td>
                  </tr>
                )}
                {branchRiders.map((r) => (
                  <tr
                    key={r.id}
                    className="relative cursor-pointer hover:bg-muted/70"
                  >
                    <td className="px-3 py-2 align-middle text-xs font-semibold text-primary">
                      {r.name || "-"}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-muted-foreground">
                      {r.phone || "-"}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${riderStatusClass(
                          r.verificationStatus
                        )}`}
                      >
                        {riderStatusLabel(r.verificationStatus)}
                      </span>
                    </td>
                    <a
                      href={`/riders/${encodeURIComponent(r.id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0"
                      aria-label={`${r.name} 상세 보기`}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex-1 text-right text-sm text-foreground">{value}</div>
    </div>
  );
}

// 기존 BRANCH_DETAILS 목업 데이터는 제거하고 실제 Supabase 데이터를 사용합니다.
