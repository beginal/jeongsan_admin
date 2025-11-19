import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SensitiveDetailRow } from "@/components/admin-v2/SensitiveDetailRow";
import { RiderDeleteButton } from "@/components/admin-v2/RiderDeleteButton";

interface RiderDetailPageProps {
  params: Promise<{ riderId: string }>;
}

export default async function RiderDetailPage({
  params,
}: RiderDetailPageProps) {
  const { riderId } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[rider detail] Supabase env not set");
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("admin_v2_token")?.value;

  if (!token) {
    notFound();
  }

  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: ridersData, error: ridersError } = await supabase
    .rpc("get_riders_for_admin");

  if (ridersError) {
    console.error("[rider detail] get_riders_for_admin error:", ridersError);
    notFound();
  }

  const rider = Array.isArray(ridersData)
    ? (ridersData as any[]).find((r) => String(r.id) === String(riderId))
    : null;

  if (!rider) {
    notFound();
  }

  const { data: branchData } = await supabase
    .from("rider_new_branches")
    .select(
      "new_branch_id, is_primary, status, new_branches:new_branch_id (id, display_name, platform, region, branch_name)"
    )
    .eq("rider_id", rider.id)
    .eq("status", "active");

  const branches =
    branchData?.map((rb: any) => ({
      branchId: rb.new_branch_id,
      name:
        rb.new_branches?.display_name ||
        rb.new_branches?.branch_name ||
        rb.new_branch_id,
      platform: rb.new_branches?.platform || "",
      isPrimary: rb.is_primary,
      status: rb.status,
    })) ?? [];

  const { data: assignmentData } = await supabase
    .from("vehicle_assignments")
    .select(
      "id, start_date, end_date, is_active, vehicles(id, plate_number, model, daily_fee, weekly_fee, color)"
    )
    .eq("rider_id", rider.id)
    .order("start_date", { ascending: false });

  const assignments =
    assignmentData?.map((a: any) => {
      const vehicleRaw = Array.isArray(a.vehicles) ? a.vehicles[0] : a.vehicles;
      return {
        id: a.id,
        startDate: a.start_date,
        endDate: a.end_date,
        isActive: a.is_active,
        vehicle: vehicleRaw
          ? {
              id: vehicleRaw.id,
              plateNumber: vehicleRaw.plate_number,
              model: vehicleRaw.model,
              dailyFee: vehicleRaw.daily_fee,
              weeklyFee: vehicleRaw.weekly_fee,
              color: vehicleRaw.color,
            }
          : null,
      };
    }) ?? [];

  const primaryBranch =
    branches.find((b) => b.isPrimary) || branches[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">
              {rider.name?.slice(0, 1) || "R"}
            </span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              라이더 관리 / {rider.name || riderId}
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {rider.name || riderId}
            </h1>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <a
            href="/riders"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="mr-1 text-[11px]">←</span>
            라이더 목록
          </a>
          <RiderDeleteButton riderId={String(riderId)} />
          <a
            href={`/riders/${encodeURIComponent(
              String(riderId)
            )}/edit`}
            className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            라이더 수정
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            소속 지사
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {primaryBranch
              ? primaryBranch.name
              : "소속 지사 정보 없음"}
          </div>
          {primaryBranch?.platform && (
            <p className="mt-1 text-xs text-muted-foreground">
              플랫폼: {primaryBranch.platform}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            연락처
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {rider.phone || "-"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            이메일: {rider.email || "-"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            상태
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {rider.verification_status === "approved"
              ? "승인됨"
              : rider.verification_status === "rejected"
                ? "반려됨"
                : "대기"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            가입 완료:{" "}
            {rider.registration_completed_at || "-"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            기본 정보
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            <DetailRow label="이름" value={rider.name || "-"} />
            <DetailRow label="전화번호" value={rider.phone || "-"} />
            <DetailRow label="이메일" value={rider.email || "-"} />
            <DetailRow
              label="배민 ID"
              value={rider.baemin_id || "-"}
            />
            <SensitiveDetailRow
              label="주민등록번호"
              value={rider.resident_number}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            계좌 정보
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            <DetailRow
              label="은행명"
              value={rider.bank_name || "-"}
            />
            <DetailRow
              label="예금주"
              value={rider.account_holder || "-"}
            />
            <SensitiveDetailRow
              label="계좌번호"
              value={rider.account_number}
              type="account"
              bankName={rider.bank_name}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            원천세 신고 정보
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            <DetailRow
              label="신고 이름"
              value={rider.tax_name || rider.name || "-"}
            />
            <SensitiveDetailRow
              label="주민등록번호(마스킹)"
              value={rider.tax_resident_number}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            소속 지사
          </h2>
          <div className="mt-3 space-y-1.5 text-xs">
            {branches.length === 0 && (
              <p className="text-muted-foreground">
                소속 지사 정보가 없습니다.
              </p>
            )}
            {branches.map((b) => (
              <div
                key={String(b.branchId)}
                className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2"
              >
                <div>
                  <div className="text-xs font-medium text-foreground">
                    {b.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    플랫폼: {b.platform || "-"}
                  </div>
                </div>
                {b.isPrimary && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    대표
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            차량 배정
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            {assignments.length === 0 && (
              <p className="text-muted-foreground">
                차량 배정 정보가 없습니다.
              </p>
            )}
            {assignments.map((a) => (
              <div
                key={a.id}
                className="space-y-1 rounded-md border border-border bg-muted/40 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {a.vehicle
                      ? `${a.vehicle.model || ""} (${a.vehicle.plateNumber || "-"})`
                      : "차량 정보 없음"}
                  </span>
                  <span
                    className={
                      a.isActive
                        ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                        : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                    }
                  >
                    {a.isActive ? "활성" : "종료"}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {a.startDate || "-"} ~ {a.endDate || "현재"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">
        {label}
      </div>
      <div className="flex-1 text-xs text-foreground">{value}</div>
    </div>
  );
}
