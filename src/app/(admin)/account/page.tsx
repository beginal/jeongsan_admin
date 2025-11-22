"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/glass/PageHeader";
import { Section } from "@/components/ui/glass/Section";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { User, Lock } from "lucide-react";

export default function AccountHomePage() {
  const cards = [
    {
      title: "프로필 수정",
      description: "이름, 연락처, 안내 이메일을 수정합니다.",
      href: "/account/profile",
      icon: <User className="h-5 w-5" />,
      action: "정보 수정",
    },
    {
      title: "비밀번호 변경",
      description: "로그인 비밀번호를 안전하게 변경합니다.",
      href: "/account/password",
      icon: <Lock className="h-5 w-5" />,
      action: "비밀번호 변경",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="계정 설정"
        description="프로필 정보와 비밀번호를 관리합니다."
        icon={<User className="h-5 w-5" />}
      />

      <Section className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {card.icon}
              </span>
              {card.title}
            </div>
            <p className="text-sm text-muted-foreground">{card.description}</p>
            <div className="mt-3">
              <GlassButton variant="outline" size="sm">
                {card.action} →
              </GlassButton>
            </div>
          </Link>
        ))}
      </Section>
    </div>
  );
}
