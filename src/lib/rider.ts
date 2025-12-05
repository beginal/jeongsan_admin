import { normalizePhoneDigits, parsePhoneDigits } from "./phone";

async function findRiderIdByPhones(
  supabase: any,
  phoneValues: Array<string | null | undefined>
) {
  const candidates = new Set<string>();

  phoneValues.forEach((raw) => {
    const full = parsePhoneDigits(raw, 15); // 국제 번호 포함 대비
    if (full) {
      candidates.add(full);
      const tail11 = full.slice(-11);
      if (tail11) candidates.add(tail11);
    }
  });

  const candidateList = Array.from(candidates);
  if (candidateList.length === 0) return null;

  // 1) 정확 일치 (여러 형태 한번에)
  const { data: exactRows } = await supabase
    .from("riders")
    .select("id, phone")
    .in("phone", candidateList)
    .limit(1);
  const exact = Array.isArray(exactRows) ? exactRows[0] : exactRows;
  if (exact?.id) return exact.id as string;

  // 2) 퍼지 매칭(중간에 공백/국가코드 등 끼어있는 경우)
  for (const digits of candidateList) {
    if (digits.length < 6) continue;
    const fuzzyPattern = `%${digits.split("").join("%")}%`;
    const { data: fuzzyRows } = await supabase
      .from("riders")
      .select("id")
      .ilike("phone", fuzzyPattern)
      .limit(1);
    const fuzzy = Array.isArray(fuzzyRows) ? fuzzyRows[0] : fuzzyRows;
    if (fuzzy?.id) return fuzzy.id as string;
  }

  // 3) 끝 4자리 부분 일치
  for (const digits of candidateList) {
    if (digits.length < 4) continue;
    const suffixPattern = `%${digits.slice(-4)}`;
    const { data: suffixRows } = await supabase
      .from("riders")
      .select("id")
      .ilike("phone", suffixPattern)
      .limit(1);
    const suffix = Array.isArray(suffixRows) ? suffixRows[0] : suffixRows;
    if (suffix?.id) return suffix.id as string;
  }

  return null;
}

export async function resolveRiderIdFromUser(
  supabase: any,
  user: any,
  decoded?: any
) {
  const meta = (user?.user_metadata as any) || {};
  let riderId = meta?.rider_id || null;
  const phoneCandidates: Array<string | null> = [
    meta?.phone,
    meta?.phone_number,
    decoded?.phone,
    decoded?.phone_number,
    user?.phone,
  ];

  const tokenEmail = decoded?.email || user?.email;
  if (tokenEmail && tokenEmail.startsWith("rider-")) {
    const m = tokenEmail.match(/^rider-(\d{8,11})@/);
    if (m) phoneCandidates.push(m[1]);
  }

  const normalizedList = phoneCandidates
    .map((p) => normalizePhoneDigits(p))
    .filter(Boolean) as string[];
  const phoneDigits = normalizedList[0] || null;

  // 메타 rider_id가 있지만 실제 row가 없거나 전화번호가 다르면 무시하고 재해석
  if (riderId) {
    const { data: riderRow } = await supabase
      .from("riders")
      .select("id, phone")
      .eq("id", riderId)
      .limit(1)
      .maybeSingle();

    const rowPhone = riderRow ? normalizePhoneDigits(riderRow.phone) : null;
    if (!riderRow || (phoneDigits && rowPhone && rowPhone !== phoneDigits)) {
      riderId = null;
    }
  }

  // 전화번호 기반 재해석은 항상 시도해 더 신뢰도 높은 결과를 우선 사용
  const resolved = await findRiderIdByPhones(supabase, phoneCandidates);
  if (resolved) riderId = resolved;

  if (!riderId && (user?.id || decoded?.sub)) {
    const candidate = user?.id || decoded?.sub;
    const { data: riderByUserId } = await supabase
      .from("riders")
      .select("id")
      .eq("id", candidate)
      .maybeSingle();
    riderId = riderByUserId?.id || riderId;
  }

  return { riderId, phoneDigits, meta };
}
