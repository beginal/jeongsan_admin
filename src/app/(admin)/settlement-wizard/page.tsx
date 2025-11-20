"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, ShieldCheck, Trash2 } from "lucide-react";

type BranchOption = {
  id: string;
  name: string;
  displayName?: string;
  branchName?: string;
  province?: string;
  district?: string;
  platform?: string;
  corporateName?: string | null;
  personalName?: string | null;
};

type PromotionOption = {
  id: string;
  name: string;
  status: "active" | "scheduled" | "ended";
  branchActive?: boolean;
};

type PromotionDetail = {
  type?: string;
  summary?: string;
  assignments?: Record<
    string,
    { startDate: string | null; endDate: string | null; active?: boolean }
  >;
};

type UploadEntry = {
  id: string;
  file: File;
  password: string;
  branchId: string | null;
  guessed: string | null;
};

const excelAccept = ".xls,.xlsx,.xlsm";

const statusClass = (s: PromotionOption["status"]) => {
  if (s === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "scheduled") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

const buildPromotionSummary = (type?: string, cfg?: Record<string, any>) => {
  if (!cfg) return "";
  if (type === "excess") {
    const threshold = cfg.threshold ?? cfg.targetCount ?? 0;
    const amt = cfg.amountPerExcess ?? cfg.amount ?? 0;
    return `임계 ${threshold.toLocaleString()}건 초과 시 +${amt.toLocaleString()}원/건`;
  }
  if (type === "milestone") {
    const first = Array.isArray(cfg.milestones) ? cfg.milestones[0] : null;
    if (first) {
      return `목표 ${Number(first.threshold || 0).toLocaleString()}건 → ${Number(first.amount || 0).toLocaleString()}원`;
    }
  }
  if (type === "milestone_per_unit") {
    const first = Array.isArray(cfg.milestonePerUnit) ? cfg.milestonePerUnit[0] : null;
    if (first) {
      return `기준 ${first.threshold} / ${first.unitSize}건당 ${Number(first.unitAmount || 0).toLocaleString()}원`;
    }
  }
  return "";
};

export default function SettlementWizardStep1() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [promotionByBranch, setPromotionByBranch] = useState<Record<string, PromotionOption[]>>({});
  const [promotionDetail, setPromotionDetail] = useState<Record<string, PromotionDetail>>({});
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [globalPassword, setGlobalPassword] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [branchRes, promoRes] = await Promise.all([
          fetch("/api/branches"),
          fetch("/api/promotions"),
        ]);

        const [branchData, promoData] = await Promise.all([
          branchRes.json().catch(() => ({})),
          promoRes.json().catch(() => ({})),
        ]);

        if (!branchRes.ok || branchData?.error) {
          throw new Error(branchData?.error || "지사 목록을 불러오지 못했습니다.");
        }
        if (!promoRes.ok || promoData?.error) {
          throw new Error(promoData?.error || "프로모션 목록을 불러오지 못했습니다.");
        }

        if (cancelled) return;

        const branchList: BranchOption[] = (branchData.branches || []).map((b: any) => ({
          id: String(b.id),
          name: b.display_name || b.branch_name || String(b.id),
          displayName: b.display_name || undefined,
          branchName: b.branch_name || undefined,
          province: b.province || "",
          district: b.district || "",
          platform: b.platform || "",
          corporateName: b.corporate_entity_name || null,
          personalName: b.personal_entity_name || null,
        }));
        setBranches(branchList);

        const map: Record<string, PromotionOption[]> = {};
        const promoIds = new Set<string>();
        const promotionsArr: any[] = Array.isArray(promoData.promotions)
          ? promoData.promotions
          : [];
        promotionsArr.forEach((p: any) => {
          // 지사 단위 진행 중인 프로모션만 표시
          const isActive = p.status === "active";
          if (!isActive) return;
          const promo: PromotionOption = {
            id: String(p.id),
            name: p.name || "",
            status: p.status || "ended",
          } as PromotionOption;
          const assigned = Array.isArray(p.branches) ? p.branches : [];
          assigned.forEach((b: any) => {
            const bid = String(b.branchId || b.branch_id || "");
            if (!bid) return;
            if (b.active === false) return; // 지사 배정이 비활성화된 경우 제외
            promoIds.add(promo.id);
            (map[bid] = map[bid] || []).push(promo);
          });
        });
        setPromotionByBranch(map);

        // 프로모션 상세(설정/기간) 로드
        if (promoIds.size > 0) {
          const detailEntries = await Promise.all(
            Array.from(promoIds).map(async (pid) => {
              try {
                const res = await fetch(`/api/promotions/${encodeURIComponent(pid)}`);
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data?.error) return null;
                const promo = data.promotion || {};
                const cfg = promo.config || {};
                const assignmentsArr: any[] = Array.isArray(data.assignments)
                  ? data.assignments
                  : [];
                const byBranch: Record<string, { startDate: string | null; endDate: string | null; active?: boolean }> = {};
                assignmentsArr.forEach((a) => {
                  const bid = String(a.branch_id || a.id || "");
                  if (!bid) return;
                  byBranch[bid] = {
                    startDate: a.start_date ? String(a.start_date) : null,
                    endDate: a.end_date ? String(a.end_date) : null,
                    active: a.active ?? a.is_active ?? true,
                  };
                });

                const summary = buildPromotionSummary(promo.type as string, cfg);

                return [pid, { type: promo.type as string, summary, assignments: byBranch }] as const;
              } catch {
                return null;
              }
            })
          );

          const detailMap: Record<string, PromotionDetail> = {};
          detailEntries.forEach((entry) => {
            if (!entry) return;
            const [pid, detail] = entry;
            detailMap[pid] = detail;
          });
          setPromotionDetail(detailMap);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "데이터를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const guessBranchId = (fileName: string) => {
    const lower = fileName.toLowerCase();
    // 분리 가능한 패턴들로 토큰화 (언더스코어, 하이픈, 공백 등)
    const parts = lower
      .replace(/\.xlsx|\.xlsm|\.xls/i, "")
      .split(/[\s_\-\.]+/)
      .filter(Boolean);

    // 우선순위: 지사명 → 구/군 → 시/도 → 법인/개인 명칭
    const scored = branches.map((b) => {
      let score = 0;
      const tokens = [
        b.branchName,
        b.displayName,
        b.name,
        b.district,
        b.province,
        b.corporateName,
        b.personalName,
      ]
        .filter(Boolean)
        .map((t) => String(t).toLowerCase());

      tokens.forEach((t, idx) => {
        const exact = parts.includes(t);
        const partial = !exact && lower.includes(t);
        if (exact) score += 5 - idx; // branchName/displayName 우선
        else if (partial) score += 1;
      });

      return { id: b.id, score };
    });

    const best = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    return best ? best.id : null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setFileError(null);
    const next: UploadEntry[] = [];
    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!["xls", "xlsx", "xlsm"].includes(ext)) {
        setFileError("엑셀 파일(.xls, .xlsx, .xlsm)만 업로드 가능합니다.");
        return;
      }
      const duplicate = uploads.some(
        (u) => u.file.name === file.name && u.file.size === file.size
      );
      if (duplicate) return;
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
        file,
        password: "",
        branchId: guessBranchId(file.name),
        guessed: guessBranchId(file.name),
      });
    });
    if (next.length > 0) {
      setUploads((prev) => [...prev, ...next]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const branchOptions = useMemo(() => branches, [branches]);

  const applyPasswordToAll = () => {
    if (!globalPassword.trim()) return;
    setUploads((prev) => prev.map((u) => ({ ...u, password: globalPassword })));
  };

  const isStepComplete = useMemo(() => {
    if (uploads.length === 0) return false;
    return uploads.every((u) => u.password.trim() && u.branchId);
  }, [uploads]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="text-lg font-semibold">S1</span>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">정산 마법사 / Step 1</div>
          <h1 className="text-lg font-semibold text-foreground">파일 업로드 및 검증</h1>
          <p className="text-xs text-muted-foreground">엑셀 파일을 업로드하고 지사/프로모션을 매핑한 뒤 비밀번호를 입력합니다.</p>
        </div>
        <div className="ml-auto text-[11px] text-muted-foreground">Step 1 / 3</div>
      </div>

      <div
        className={`rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm shadow-sm transition ${
          dragActive ? "border-primary bg-primary/5" : ""
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={excelAccept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <Upload className="h-10 w-10 text-primary" />
          <div className="text-base font-semibold text-foreground">엑셀 파일 업로드</div>
          <div className="text-xs">파일을 드래그해서 놓거나 클릭해서 선택하세요 (.xls, .xlsx, .xlsm)</div>
          {fileError && (
            <p className="text-[11px] text-red-600">{fileError}</p>
          )}
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={loading}
            >
              파일 선택
            </button>
            <span className="text-muted-foreground">최대 5개, 10MB 이하</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">업로드된 파일</h2>
              <p className="text-[11px] text-muted-foreground">파일별 비밀번호와 지사 매핑을 완료한 뒤 Step 2로 이동하세요.</p>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <input
                type="password"
                className="h-8 w-44 rounded-md border border-border bg-background px-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="비밀번호 일괄 입력"
                value={globalPassword}
                onChange={(e) => setGlobalPassword(e.target.value)}
              />
              <button
                type="button"
                className="inline-flex items-center gap-1 h-8 rounded-md border border-border bg-background px-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={applyPasswordToAll}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> 모든 파일에 적용
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 h-8 rounded-md border border-border bg-background px-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setUploads([])}
              >
                <Trash2 className="h-3.5 w-3.5" /> 전체 삭제
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card text-sm shadow-sm">
            <div className="divide-y divide-border">
              {uploads.map((u) => {
                const branchPromos = promotionByBranch[u.branchId || ""] || [];
                return (
                  <div key={u.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                    <div className="min-w-[200px] flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        <span className="truncate">{u.file.name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {(u.file.size / 1024).toFixed(1)} KB
                      </div>
                      {u.guessed && (
                        <div className="text-[11px] text-emerald-700">추정 지사: {branches.find((b) => b.id === u.guessed)?.name || u.guessed}</div>
                      )}
                    </div>
                    <div className="w-full max-w-[220px] space-y-1.5 text-xs">
                      <label className="text-[11px] text-muted-foreground">파일 비밀번호</label>
                      <input
                        type="password"
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={u.password}
                        onChange={(e) =>
                          setUploads((prev) =>
                            prev.map((x) =>
                              x.id === u.id ? { ...x, password: e.target.value } : x
                            )
                          )
                        }
                        placeholder="파일 암호 입력"
                      />
                    </div>
                    <div className="w-full max-w-[260px] space-y-1.5 text-xs">
                      <label className="text-[11px] text-muted-foreground">소속 지사</label>
                      <select
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={u.branchId || ""}
                        onChange={(e) =>
                          setUploads((prev) =>
                            prev.map((x) =>
                              x.id === u.id ? { ...x, branchId: e.target.value || null } : x
                            )
                          )
                        }
                      >
                        <option value="">지사 선택</option>
                        {branchOptions.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} {b.province || b.district ? `(${[b.province, b.district].filter(Boolean).join(" ")})` : ""}
                          </option>
                        ))}
                      </select>
                      {u.guessed && !u.branchId && (
                        <div className="text-[11px] text-emerald-700">파일명 기반 추정 지사를 선택해 두었습니다.</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-[220px] space-y-1.5 text-xs">
                      <div className="text-[11px] text-muted-foreground">적용 프로모션</div>
                      {branchPromos.length === 0 ? (
                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                          연결된 프로모션이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {branchPromos.map((p) => (
                            <div
                              key={p.id}
                              className={`flex flex-wrap items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-medium ${statusClass(p.status)}`}
                            >
                              <span className="text-foreground">{p.name}</span>
                              {promotionDetail[p.id]?.summary && (
                                <span className="text-muted-foreground">
                                  · {promotionDetail[p.id]?.summary}
                                </span>
                              )}
                              {(() => {
                                const assign = promotionDetail[p.id]?.assignments?.[u.branchId || ""];
                                if (!assign || (!assign.startDate && !assign.endDate)) return null;
                                const start = assign.startDate ? assign.startDate.slice(0, 10) : "";
                                const end = assign.endDate ? assign.endDate.slice(0, 10) : "";
                                return (
                                  <span className="text-muted-foreground">
                                    · {start || "상시"} ~ {end || "상시"}
                                  </span>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-8 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() =>
                          setUploads((prev) => prev.filter((x) => x.id !== u.id))
                        }
                      >
                        제거
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 text-xs">
        <div className="flex-1 text-muted-foreground">
          Step 1 완료 후 다음 단계에서 정산 설정을 이어갈 수 있습니다.
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => router.push("/")}
        >
          취소
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
          disabled={!isStepComplete}
          onClick={() => alert("Step1 데이터 저장 후 다음 스텝으로 이어집니다. (추후 구현)")}
        >
          다음 단계
        </button>
      </div>
    </div>
  );
}
