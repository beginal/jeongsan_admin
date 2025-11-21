import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAuth } from "@/lib/auth";
import { BusinessEntityEditForm } from "@/components/admin-v2/BusinessEntityEditForm";

interface BusinessEntityEditPageProps {
  params: Promise<{ entityId: string }>;
}

type BusinessEntityType = "CORPORATE" | "PERSONAL";

function formatBusinessRegNo(raw?: string | null) {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length !== 10) return digits || "";
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export default async function BusinessEntityEditPage({
  params,
}: BusinessEntityEditPageProps) {
  const { entityId } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[business-entity edit] Supabase env not set");
    notFound();
  }

  const auth = await requireAdminAuth();
  if ("response" in auth) redirect("/login");

  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: { Authorization: `Bearer ${auth.token}` },
    },
  });
  const adminId = auth.user.id;

  const { data: entity, error } = await supabase
    .from("business_entities")
    .select(
      "id, name, type, parent_entity_id, registration_number_enc"
    )
    .eq("id", entityId)
    .eq("created_by", adminId)
    .maybeSingle();

  if (error) {
    console.error("[business-entity edit] Supabase error:", error);
  }

  if (!entity) {
    notFound();
  }

  const type = (entity.type as BusinessEntityType) || "CORPORATE";
  const typeLabel = type === "CORPORATE" ? "법인" : "개인";
  const initialRegNo = formatBusinessRegNo(entity.registration_number_enc);

  // 상위 법인 선택용 옵션 (개인 사업자일 때만)
  let corporateOptions:
    | { id: string; name: string; regNo: string }[]
    | [] = [];

  if (type === "PERSONAL") {
    const { data: corps } = await supabase
      .from("business_entities")
      .select("id, name, registration_number_enc")
      .eq("created_by", adminId)
      .eq("type", "CORPORATE")
      .order("name", { ascending: true });

    corporateOptions =
      corps?.map((c: any) => ({
        id: String(c.id),
        name: c.name as string,
        regNo: formatBusinessRegNo(c.registration_number_enc),
      })) ?? [];
  }

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
              사업자 관리 / {entity.name || entity.id} / 수정
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              사업자 수정
            </h1>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <a
            href={`/business-entities/${encodeURIComponent(
              String(entity.id)
            )}`}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="mr-1 text-[11px]">←</span>
            사업자 정보
          </a>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {typeLabel}
          </span>
        </div>
      </div>

      <BusinessEntityEditForm
        entityId={String(entity.id)}
        initialName={entity.name || ""}
        initialType={type}
        initialRegNo={initialRegNo}
        initialParentId={
          entity.parent_entity_id
            ? String(entity.parent_entity_id)
            : null
        }
        corporateOptions={corporateOptions}
      />
    </div>
  );
}
