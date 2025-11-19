import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { BranchEditForm } from "@/components/admin-v2/BranchEditForm";

export default async function BranchNewPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[branch new] Supabase env not set");
    notFound();
  }

  const supabase = createClient(supabaseUrl!, serviceRoleKey!);

  // 법인/개인 엔티티 목록
  const { data: businessEntities } = await supabase
    .from("business_entities")
    .select("id, name, type, parent_entity_id")
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">+</span>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              지사 관리 / 새 지사 추가
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              새 지사 추가
            </h1>
          </div>
        </div>
      </div>

      <BranchEditForm
        mode="create"
        initialPlatform="coupang"
        initialProvince=""
        initialDistrict=""
        initialBranchName=""
        displayName=""
        corporateOptions={corporateOptions}
        personalOptions={personalOptions}
        provinceOptions={provinceOptions}
        districtOptions={districtOptions}
        initialCorporateId={null}
        initialPersonalId={null}
        initialFeeType="per_case"
        initialFeeValue={0}
      />
    </div>
  );
}
