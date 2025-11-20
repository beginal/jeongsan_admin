'use client';

import type { ReactNode, ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  BriefcaseBusiness,
  Building2,
  CarFront,
  LayoutDashboard,
  Percent,
  Wallet,
  Wand2,
} from "lucide-react";

type NavGroupKey = "dashboard" | "settlement" | "branch" | "rider" | "lease" | "loan";

type IconComponent = ComponentType<{ className?: string }>;

type NavItem = {
  label: string;
  href: string;
  icon?: IconComponent;
};

type NavSection = {
  key: NavGroupKey;
  label: string;
  href?: string;
  icon?: IconComponent;
  items?: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    key: "dashboard",
    label: "대시보드",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    key: "settlement",
    label: "정산마법사",
    icon: Wand2,
    items: [
      { label: "일 정산", href: "/settlement-wizard/daily" },
      { label: "주 정산", href: "/settlement-wizard/weekly" },
    ],
  },
  {
    key: "branch",
    label: "지사/사업자/프로모션",
    icon: Building2,
    items: [
      { label: "지사 목록", href: "/branches", icon: Building2 },
      {
        label: "사업자 목록",
        href: "/business-entities",
        icon: BriefcaseBusiness,
      },
      {
        label: "프로모션 목록",
        href: "/promotions",
        icon: Percent,
      },
    ],
  },
  {
    key: "rider",
    label: "라이더 목록",
    href: "/riders",
    icon: Bike,
  },
  {
    key: "lease",
    label: "리스렌탈 목록",
    href: "/lease-rentals",
    icon: CarFront,
  },
  {
    key: "loan",
    label: "대여금 관리",
    href: "/loan-management",
    icon: Wallet,
  },
];

function AdminSidebarContent() {
  const pathname = usePathname();

  const initialOpenSections = useMemo(() => {
    const activeKeys = NAV_SECTIONS.filter(
      (section) =>
        section.items &&
        section.items.some((item) =>
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
        )
    ).map((section) => section.key);

    return activeKeys as NavGroupKey[];
  }, [pathname]);

  const [openSections, setOpenSections] =
    useState<NavGroupKey[]>(initialOpenSections);

  const toggleSection = (key: NavGroupKey) => {
    setOpenSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <nav className="flex h-full flex-col">
      <div className="mb-2 flex items-center px-6 pb-3 pt-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            정
          </span>
          <span>정산봇</span>
        </Link>
      </div>

      {/* 스크롤 가능한 영역 */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-2">
          {NAV_SECTIONS.map((section) =>
            section.items && section.items.length > 0 ? (
              <SidebarSection
                key={section.key}
                section={section}
                currentPath={pathname}
                isOpen={openSections.includes(section.key)}
                onToggle={() => toggleSection(section.key)}
              />
            ) : (
              <TopLevelLink
                key={section.key}
                section={section}
                currentPath={pathname}
              />
            )
          )}
        </div>
      </div>

      {/* User info at sidebar bottom */}
      <div className="border-t border-border px-3 pb-4 pt-3">
        <SidebarUserSection />
      </div>
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 lg:flex lg:flex-col lg:border-r lg:border-border lg:bg-sidebar">
      <AdminSidebarContent />
    </aside>
  );
}

interface AdminSidebarMobileProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebarMobile({
  open,
  onClose,
}: AdminSidebarMobileProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex lg:hidden">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-50 flex h-full w-64 flex-col border-r border-border bg-sidebar">
        <AdminSidebarContent />
      </aside>
    </div>
  );
}

interface SidebarSectionProps {
  section: NavSection;
  currentPath: string;
  isOpen: boolean;
  onToggle: () => void;
}

function SidebarSection({
  section,
  currentPath,
  isOpen,
  onToggle,
}: SidebarSectionProps) {
  const items = section.items ?? [];
  const isAnyChildActive = items.some((item) =>
    currentPath.startsWith(item.href)
  );

  const SectionIcon = section.icon;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isAnyChildActive || isOpen
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-2">
          {SectionIcon && (
            <SectionIcon className="h-4 w-4 text-muted-foreground" />
          )}
          <span>{section.label}</span>
        </span>
        <span
          className={cn(
            "text-xs transition-transform",
            isOpen ? "rotate-90" : ""
          )}
        >
          ▸
        </span>
      </button>
      <div className={cn("space-y-1 pl-3", !isOpen && "hidden")}>
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? currentPath === "/"
              : currentPath.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "admin-sidebar-subnav flex items-center rounded-md px-3 py-1.5 text-xs transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface TopLevelLinkProps {
  section: NavSection;
  currentPath: string;
}

function TopLevelLink({ section, currentPath }: TopLevelLinkProps) {
  const href = section.href ?? "#";
  const isActive =
    href === "/"
      ? currentPath === "/"
      : currentPath.startsWith(href);

  const Icon = section.icon;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <span>{section.label}</span>
    </Link>
  );
}

function SidebarUserSection() {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("관리자");
  const [userEmail, setUserEmail] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" });
        if (!res.ok) return;
        const data = (await res.json()) as { name?: string; email?: string };
        if (cancelled) return;
        if (data.name) setUserName(data.name);
        if (data.email) setUserEmail(data.email);
      } catch {
        // ignore
      }
    }

    fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative text-xs">
      {open && (
        <div className="mb-2 rounded-md border border-border bg-card py-1 text-left shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            정보 수정
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            비밀번호 변경
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-muted"
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              } catch {
                window.location.href = "/login";
              }
            }}
          >
            로그아웃
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials}
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-foreground">{userName}</div>
          <div className="text-[11px] text-muted-foreground">{userEmail}</div>
        </div>
      </button>
    </div>
  );
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
