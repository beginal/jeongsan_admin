import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth";
import { BranchEditForm } from "@/components/admin-v2/BranchEditForm";

export default async function BranchNewPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[branch new] Supabase env not set");
    redirect("/login");
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

  return (
    <div className="space-y-6">


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
