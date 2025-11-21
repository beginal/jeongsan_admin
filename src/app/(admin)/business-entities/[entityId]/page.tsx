import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { BusinessEntityBranchesTable, BusinessEntityBranchRow } from "@/components/admin-v2/BusinessEntityBranchesTable";
import { BusinessEntityBranchAssignButton } from "@/components/admin-v2/BusinessEntityBranchAssignButton";

interface BusinessEntityDetailPageProps {
  params: Promise<{ entityId: string }>;
}

type BusinessEntityType = "CORPORATE" | "PERSONAL";

function formatBusinessRegNo(raw?: string | null) {
  if (!raw) return "-";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length !== 10) return digits || "-";
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export default async function BusinessEntityDetailPage({
  params,
}: BusinessEntityDetailPageProps) {
  const { entityId } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[business-entity detail] Supabase env not set");
    notFound();
  }

  const supabase = createClient(supabaseUrl!, serviceRoleKey!);

  const { data: entity, error } = await supabase
    .from("business_entities")
    .select(
      "id, name, type, parent_entity_id, registration_number_enc, status"
    )
    .eq("id", entityId)
    .maybeSingle();

  if (error) {
    console.error("[business-entity detail] Supabase error:", error);
  }

  if (!entity) {
    notFound();
  }

  const type = (entity.type as BusinessEntityType) || "CORPORATE";

  // 소속 지사 목록 (법인/개인에 따라 기준 컬럼 변경)
  let branches: BusinessEntityBranchRow[] | null = null;

  try {
    const { data: affils } = await supabase
      .from("branch_affiliations")
      .select("branch_id, corporate_entity_id, personal_entity_id")
      .or(
        `corporate_entity_id.eq.${entity.id},personal_entity_id.eq.${entity.id}`
      );

    const branchIds = Array.from(
      new Set(
        (affils || []).map((a: any) => String(a.branch_id)).filter(Boolean)
      )
    );

    if (branchIds.length > 0) {
      const { data: branchRows } = await supabase
        .from("new_branches_with_stats")
        .select(
          "id, display_name, branch_name, province, district, platform, rider_count"
        )
        .in("id", branchIds);

      branches =
        branchRows?.map((b: any) => ({
          id: String(b.id),
          platform: (b.platform as string) || "",
          province: (b.province as string) || "",
          district: (b.district as string) || "",
          branchName:
            (b.branch_name as string) ||
            (b.display_name as string) ||
            String(b.id),
          displayName:
            (b.display_name as string) ||
            (b.branch_name as string) ||
            String(b.id),
          riderCount:
            typeof b.rider_count === "number" ? b.rider_count : 0,
        })) ?? [];
    } else {
      branches = [];
    }
  } catch (branchErr) {
    console.error(
      "[business-entity detail] branches load error:",
      branchErr
    );
    branches = [];
  }

  const typeLabel = type === "CORPORATE" ? "법인" : "개인";
  const regNo = formatBusinessRegNo(entity.registration_number_enc);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">사</span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              사업자 관리 / {entity.name || entity.id}
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {entity.name || entity.id}
            </h1>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/business-entities"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="mr-1 text-[11px]">←</span>
            사업자 목록
          </Link>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {typeLabel}
          </span>
          <Link
            href={`/business-entities/${encodeURIComponent(
              String(entity.id)
            )}/edit`}
            className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            사업자 수정
          </Link>
        </div>
      </div>

      {/* Basic info */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            사업자 유형
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {typeLabel}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            사업자명
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {entity.name || "-"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">
            사업자등록번호
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {regNo}
          </div>
        </div>
      </div>

      {/* 소속 지사 */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                소속 지사
              </h2>
              <span className="text-[11px] text-muted-foreground">
                총 {(branches || []).length}곳
              </span>
            </div>
            <BusinessEntityBranchAssignButton entityId={String(entity.id)} />
          </div>
          <BusinessEntityBranchesTable branches={branches || []} />
        </div>
      </div>
    </div>
  );
}
