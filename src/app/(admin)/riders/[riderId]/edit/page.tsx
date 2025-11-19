import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { RiderEditForm } from "@/components/admin-v2/RiderEditForm";

interface RiderEditPageProps {
  params: Promise<{ riderId: string }>;
}

export default async function RiderEditPage({ params }: RiderEditPageProps) {
  const { riderId } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[rider edit] Supabase env not set");
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

  const { data: ridersData, error: ridersError } = await supabase.rpc(
    "get_riders_for_admin"
  );

  if (ridersError) {
    console.error("[rider edit] get_riders_for_admin error:", ridersError);
    notFound();
  }

  const rider = Array.isArray(ridersData)
    ? (ridersData as any[]).find((r) => String(r.id) === String(riderId))
    : null;

  if (!rider) {
    notFound();
  }

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
              라이더 정보 편집
            </h1>
          </div>
        </div>
      </div>

      <RiderEditForm riderId={String(riderId)} />
    </div>
  );
}

