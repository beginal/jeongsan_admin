"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { TextField } from "@/components/ui/FormField";
import { showToast } from "@/components/ui/Toast";
import { Lock } from "lucide-react";

export default function AccountPasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast("현재 비밀번호를 입력하세요.", "error");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      showToast("비밀번호를 8자 이상 입력하세요.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("비밀번호 확인이 일치하지 않습니다.", "error");
      return;
    }
    if (currentPassword === newPassword) {
      showToast("현재 비밀번호와 다른 새 비밀번호를 입력하세요.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "비밀번호를 변경하지 못했습니다.");
      }
      showToast("비밀번호를 변경했습니다.", "success");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      router.push("/");
    } catch (err: any) {
      showToast(err?.message || "비밀번호를 변경하지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="비밀번호 변경"
        description="현재 세션으로 새 비밀번호를 설정합니다."
        icon={<Lock className="h-5 w-5" />}
      />

      <Section>
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField
            label="현재 비밀번호"
            value={currentPassword}
            onChange={setCurrentPassword}
            type="password"
            required
          />
          <TextField
            label="새 비밀번호"
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            required
            helperText="8자 이상 입력하세요."
          />
          <TextField
            label="비밀번호 확인"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            required
          />
          <div className="flex justify-end">
            <GlassButton type="submit" variant="primary" disabled={loading} isLoading={loading}>
              비밀번호 변경
            </GlassButton>
          </div>
        </form>
      </Section>
    </div>
  );
}
