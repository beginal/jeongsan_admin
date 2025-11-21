import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAuth } from "@/lib/auth";
import { BranchEditForm } from "@/components/admin-v2/BranchEditForm";

interface BranchEditPageProps {
  params: Promise<{ branchId: string }>;
}

export default async function BranchEditPage({ params }: BranchEditPageProps) {
  const { branchId } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[branch edit] Supabase env not set");
    notFound();
  }

  const auth = await requireAdminAuth();
  if ("response" in auth) redirect("/login");

  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    },
  });
  const adminId = auth.user.id;

  // 기본 지사 정보
  const { data: branch, error: branchError } = await supabase
    .from("new_branches")
    .select("id, platform, province, district, branch_name, display_name")
    .eq("created_by", adminId)
    .eq("id", branchId)
    .maybeSingle();

  if (branchError) {
    console.error("[branch edit] branch load error:", branchError);
  }

  if (!branch) {
    notFound();
  }

  // 소속 정보
  const { data: affiliation } = await supabase
    .from("branch_affiliations")
    .select("corporate_entity_id, personal_entity_id")
    .eq("branch_id", branchId)
    .maybeSingle();

  // 법인/개인 엔티티 목록
  const { data: businessEntities } = await supabase
    .from("business_entities")
    .select("id, name, type, parent_entity_id")
    .eq("created_by", adminId)
    .order("name", { ascending: true });

  const corporateOptions =
    businessEntities
      ?.filter((e) => e.type === "CORPORATE")
      .map((e) => ({
        id: e.id as string,
        name: e.name as string,
        type: "CORPORATE" as const,
        parentEntityId: (e as any).parent_entity_id as string | null,
      })) ?? [];

  const personalOptions =
    businessEntities
      ?.filter((e) => e.type === "PERSONAL")
      .map((e) => ({
        id: e.id as string,
        name: e.name as string,
        type: "PERSONAL" as const,
        parentEntityId: (e as any).parent_entity_id as string | null,
      })) ?? [];

  // 시/도, 구/시/군 옵션
  const { data: provinces } = await supabase
    .from("kr_sido")
    .select("id, name")
    .order("name", { ascending: true });

  const { data: districts } = await supabase
    .from("kr_sigungu")
    .select("id, name, sido_id")
    .order("name", { ascending: true });

  const provinceOptions =
    provinces?.map((p) => ({
      id: p.id as number,
      name: p.name as string,
    })) ?? [];

  const districtOptions =
    districts?.map((d) => ({
      id: d.id as number,
      name: d.name as string,
      sidoId: d.sido_id as number,
    })) ?? [];

  // 정산 수수료 (활성 정책 1건)
  const { data: policy } = await supabase
    .from("branch_settlement_policies")
    .select("fee_type, fee_value")
    .eq("branch_id", branchId)
    .is("effective_to", null)
    .maybeSingle();

  const initialFeeType =
    (policy?.fee_type as "per_case" | "percentage" | undefined) ?? "";
  const initialFeeValue =
    policy?.fee_value != null ? Number(policy.fee_value) : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
            {branch.district || branch.province || "지사"}
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              지사 관리 / {branch.display_name}
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              지사 정보 편집
            </h1>
          </div>
        </div>
      </div>

      <BranchEditForm
        mode="edit"
        branchId={branch.id as string}
        initialPlatform={(branch.platform as string) || "coupang"}
        initialProvince={(branch.province as string) || ""}
        initialDistrict={(branch.district as string) || ""}
        initialBranchName={(branch.branch_name as string) || ""}
        displayName={(branch.display_name as string) || ""}
        corporateOptions={corporateOptions}
        personalOptions={personalOptions}
        provinceOptions={provinceOptions}
        districtOptions={districtOptions}
        initialCorporateId={affiliation?.corporate_entity_id ?? null}
        initialPersonalId={affiliation?.personal_entity_id ?? null}
        initialFeeType={initialFeeType}
        initialFeeValue={initialFeeValue}
      />
    </div>
  );
}
