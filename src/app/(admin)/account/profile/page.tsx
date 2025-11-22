"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { TextField } from "@/components/ui/FormField";
import { showToast } from "@/components/ui/Toast";
import { User } from "lucide-react";
import { formatPhone, parsePhoneDigits } from "@/lib/phone";

type MeResponse = {
  name?: string;
  email?: string;
  phone?: string | null;
  company?: string | null;
  businessNumber?: string | null;
};

export default function AccountProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const formatBusinessNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data: MeResponse = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data as any);
        if (!cancelled) {
          setName(data.name || "");
          // email은 표시/수정하지 않음
          setPhone(formatPhone(parsePhoneDigits(data.phone || "")));
          setCompany(data.company || "");
          setBusinessNumber(formatBusinessNumber(data.businessNumber || ""));
        }
      } catch {
        // ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const phoneDigits = phone.replace(/\D/g, "");
      const bizDigits = businessNumber.replace(/\D/g, "");
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phoneDigits,
          company,
          businessNumber: bizDigits,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "정보를 수정하지 못했습니다.");
      }
      showToast("프로필 정보를 저장했습니다.", "success");
      router.push("/");
    } catch (err: any) {
      showToast(err?.message || "정보를 수정하지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="프로필 수정"
        description="이름, 연락처, 회사 정보를 변경합니다."
        icon={<User className="h-5 w-5" />}
      />

      <Section>
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField
            label="이름"
            value={name}
            onChange={setName}
            required
          />
          <TextField
            label="연락처 (선택)"
            value={phone}
            onChange={(v) => setPhone(formatPhone(parsePhoneDigits(v)))}
            placeholder="숫자/하이픈 입력"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <TextField
              label="회사명 (선택)"
              value={company}
              onChange={setCompany}
              placeholder="회사명"
            />
            <TextField
              label="사업자등록번호 (선택)"
              value={businessNumber}
              onChange={(v) => setBusinessNumber(formatBusinessNumber(v))}
              placeholder="숫자만 입력"
            />
          </div>
          <div className="flex justify-end">
            <GlassButton type="submit" variant="primary" disabled={loading} isLoading={loading}>
              저장
            </GlassButton>
          </div>
        </form>
      </Section>
    </div>
  );
}
