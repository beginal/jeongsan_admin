import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: { riderId: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[admin-v2/rider detail API] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_v2_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const riderId = params.riderId;

    const { data: ridersData, error: ridersError } = await supabase.rpc(
      "get_riders_for_admin"
    );

    if (ridersError) {
      console.error(
        "[admin-v2/rider detail API] get_riders_for_admin error:",
        ridersError
      );
      return NextResponse.json(
        { error: "라이더 정보를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const rider = Array.isArray(ridersData)
      ? (ridersData as any[]).find(
          (r) => String(r.id) === String(riderId)
        )
      : null;

    if (!rider) {
      return NextResponse.json(
        { error: "해당 라이더를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { data: branchData } = await supabase
      .from("rider_new_branches")
      .select(
        "new_branch_id, is_primary, status, new_branches:new_branch_id (id, display_name, platform, region, branch_name)"
      )
      .eq("rider_id", rider.id)
      .eq("status", "active");

    const assignedBranches =
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

    const { data: allBranches } = await supabase
      .from("new_branches")
      .select("id, display_name, branch_name, province, district, platform")
      .order("province", { ascending: true })
      .order("district", { ascending: true });

    const branches =
      allBranches?.map((b: any) => ({
        id: String(b.id),
        name: b.display_name || b.branch_name || String(b.id),
        province: b.province || "",
        district: b.district || "",
        platform: b.platform || "",
      })) ?? [];

    return NextResponse.json({ rider, assignedBranches, branches });
  } catch (error) {
    console.error("[admin-v2/rider detail API] Unexpected error:", error);
    return NextResponse.json(
      { error: "라이더 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { riderId: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[admin-v2/rider edit API] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_v2_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const riderId = params.riderId;

    const body = await request.json().catch(() => ({}));

    const {
      name,
      phone,
      baeminId,
      bankName,
      accountHolder,
      accountNumber,
      taxName,
      taxResidentNumber,
      branchIds,
      primaryBranchId,
    } = body || {};

    const updates: Record<string, any> = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (baeminId !== undefined) updates.baeminId = baeminId || null;
    if (bankName !== undefined) updates.bankName = bankName || null;
    if (accountHolder !== undefined)
      updates.accountHolder = accountHolder || null;
    if (accountNumber !== undefined)
      updates.accountNumber = accountNumber || null;
    if (taxName !== undefined) updates.taxName = taxName || null;
    if (taxResidentNumber !== undefined)
      updates.taxResidentNumber = taxResidentNumber || null;

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase.rpc(
        "update_rider_with_encryption",
        {
          rider_id_param: riderId,
          updates,
        }
      );

      if (error) {
        console.error(
          "[admin-v2/rider edit API] update_rider_with_encryption error:",
          error
        );
        return NextResponse.json(
          { error: error.message || "라이더 정보를 수정하지 못했습니다." },
          { status: 400 }
        );
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        return NextResponse.json(
          {
            error: result?.message || "라이더 정보를 수정하지 못했습니다.",
          },
          { status: 400 }
        );
      }
    }

    // 지사 변경 처리 (선택적)
    if (Array.isArray(branchIds)) {
      const { data: branchMeta, error: bmErr } = await supabase
        .from("new_branches")
        .select("id, platform")
        .in("id", branchIds as string[]);

      if (bmErr) {
        return NextResponse.json(
          { error: "지사 정보를 확인할 수 없습니다." },
          { status: 400 }
        );
      }

      const counts: Record<string, number> = {};
      for (const b of branchMeta || []) {
        const p = String((b as any).platform || "").toLowerCase();
        counts[p] = (counts[p] || 0) + 1;
      }
      if ((counts["coupang"] || 0) > 1 || (counts["baemin"] || 0) > 1) {
        return NextResponse.json(
          { error: "플랫폼별 지사는 1개만 선택할 수 있습니다" },
          { status: 400 }
        );
      }

      const { data: currentRnb } = await supabase
        .from("rider_new_branches")
        .select("id,new_branch_id,is_primary,status")
        .eq("rider_id", riderId);

      const currentActiveIds = new Set(
        (currentRnb || [])
          .filter((r) => r.status === "active")
          .map((r) => r.new_branch_id)
      );
      const desiredIds = new Set(branchIds as string[]);

      const toDeactivate =
        currentRnb
          ?.filter(
            (r) =>
              r.status === "active" &&
              !desiredIds.has(r.new_branch_id as string)
          )
          .map((r) => r.new_branch_id) ?? [];

      if (toDeactivate.length > 0) {
        await supabase
          .from("rider_new_branches")
          .update({
            status: "inactive",
            end_date: new Date().toISOString(),
          })
          .eq("rider_id", riderId)
          .in("new_branch_id", toDeactivate as string[]);
      }

      const toAdd = Array.from(desiredIds).filter(
        (id) => !currentActiveIds.has(id)
      );
      const upserts = toAdd.map((id) => ({
        rider_id: riderId,
        new_branch_id: id,
        status: "active",
        end_date: null,
        assigned_at: new Date().toISOString(),
      }));
      if (upserts.length > 0) {
        await supabase
          .from("rider_new_branches")
          .upsert(upserts, { onConflict: "rider_id,new_branch_id" });
        await supabase
          .from("rider_new_branches")
          .update({ status: "active", end_date: null })
          .eq("rider_id", riderId)
          .in("new_branch_id", toAdd);
      }

      const chosenPrimary =
        typeof primaryBranchId === "string" && primaryBranchId
          ? primaryBranchId
          : Array.from(desiredIds)[0] || null;

      if (chosenPrimary) {
        await supabase
          .from("rider_new_branches")
          .update({ is_primary: false })
          .eq("rider_id", riderId);
        await supabase
          .from("rider_new_branches")
          .update({
            is_primary: true,
            status: "active",
            end_date: null,
          })
          .eq("rider_id", riderId)
          .eq("new_branch_id", chosenPrimary);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-v2/rider edit API] Unexpected error:", error);
    return NextResponse.json(
      { error: "라이더 정보를 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { riderId: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[admin-v2/rider delete API] Supabase env not set");
    return NextResponse.json(
      { error: "Supabase 환경 변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_v2_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const riderId = params.riderId;

    // 라이더와 연결된 소속 지사 비활성화
    await supabase
      .from("rider_new_branches")
      .update({
        status: "inactive",
        end_date: new Date().toISOString(),
      })
      .eq("rider_id", riderId)
      .eq("status", "active");

    // 차량 배정 비활성화
    await supabase
      .from("vehicle_assignments")
      .update({
        is_active: false,
        end_date: new Date().toISOString(),
      })
      .eq("rider_id", riderId)
      .eq("is_active", true);

    // 라이더 자체 삭제 (또는 추후 필요시 소프트 삭제로 변경 가능)
    const { error: deleteError } = await supabase
      .from("riders")
      .delete()
      .eq("id", riderId);

    if (deleteError) {
      console.error(
        "[admin-v2/rider delete API] riders delete error:",
        deleteError
      );
      return NextResponse.json(
        { error: "라이더를 삭제하지 못했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-v2/rider delete API] Unexpected error:", error);
    return NextResponse.json(
      { error: "라이더를 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
