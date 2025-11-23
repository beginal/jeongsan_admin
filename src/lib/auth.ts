import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

type AdminAuthSuccess = {
  supabase: SupabaseClient;
  serviceSupabase: SupabaseClient | null;
  user: User;
  token: string;
};

type AdminAuthFailure = {
  response: NextResponse;
};

type RiderAuthSuccess = {
  supabase: SupabaseClient;
  serviceSupabase: SupabaseClient | null;
  user: User;
  token: string;
};

type RiderAuthFailure = {
  response: NextResponse;
};

function missingEnvResponse() {
  return NextResponse.json(
    { error: "Supabase 환경 변수가 설정되지 않았습니다." },
    { status: 500 }
  );
}

async function createAuthedServerClient(url: string, anonKey: string, token?: string) {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
    },
    global: token
      ? {
          headers: { Authorization: `Bearer ${token}` },
        }
      : undefined,
  });
}

/**
 * 관리자 세션을 확인하고 Supabase 클라이언트를 제공합니다.
 * - 기본 supabase: anon 키 + Authorization 헤더(토큰) → RLS가 켜진 경우 안전
 * - serviceSupabase: 서비스 롤 키로 동작 (가능하면 사용 최소화)
 */
export async function requireAdminAuth(): Promise<AdminAuthSuccess | AdminAuthFailure> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response: missingEnvResponse() };
  }

  const token = (await cookies()).get("admin_v2_token")?.value;
  if (!token) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = await createAuthedServerClient(supabaseUrl, supabaseAnonKey, token);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const serviceSupabase = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

  return { supabase, serviceSupabase, user: data.user, token };
}

/**
 * 라이더 세션을 확인하고 Supabase 클라이언트를 제공합니다.
 * - anon 키 + Authorization 헤더(토큰)로 동작 (RLS 전제)
 */
export async function requireRiderAuth(): Promise<RiderAuthSuccess | RiderAuthFailure> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response: missingEnvResponse() };
  }

  const token = (await cookies()).get("rider_v2_token")?.value;
  if (!token) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = await createAuthedServerClient(supabaseUrl, supabaseAnonKey, token);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const serviceSupabase = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

  return { supabase, serviceSupabase, user: data.user, token };
}
