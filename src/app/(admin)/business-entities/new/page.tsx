import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth";
import Link from "next/link";
import { BusinessEntityCreateForm } from "@/components/admin-v2/BusinessEntityCreateForm";

function formatBusinessRegNo(raw?: string | null) {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length !== 10) return digits || "";
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export default async function BusinessEntityNewPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[business-entity new] Supabase env not set");
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

  const { data: corps, error } = await supabase
    .from("business_entities")
    .select("id, name, registration_number_enc")
    .eq("created_by", adminId)
    .eq("type", "CORPORATE")
    .order("name", { ascending: true });

  if (error) {
    console.error("[business-entity new] Supabase error:", error);
  }

  const corporateOptions =
    corps?.map((c: any) => ({
      id: String(c.id),
      name: c.name as string,
      regNo: formatBusinessRegNo(c.registration_number_enc),
    })) ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-semibold">+</span>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              사업자 관리 / 새 사업자 추가
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              새 사업자 추가
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
        </div>
      </div>

      <BusinessEntityCreateForm corporateOptions={corporateOptions} />
    </div>
  );
}
