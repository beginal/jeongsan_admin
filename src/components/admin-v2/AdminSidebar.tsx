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
  MinusCircle,
  Percent,
  Wallet,
  Wand2,
  CalendarClock,
  CalendarRange,
  Users,
  ListChecks,
} from "lucide-react";
import { GlassButton } from "@/components/ui/glass/GlassButton";

type NavGroupKey =
  | "dashboard"
  | "settlement"
  | "branch"
  | "rider"
  | "lease"
  | "finance";

type IconComponent = ComponentType<{ className?: string }>;

type NavItem = {
  label: string;
  href: string;
  icon?: IconComponent;
  matchExact?: boolean;
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
      { label: "일 정산", href: "/settlement-wizard/daily", icon: CalendarClock },
      { label: "주 정산", href: "/settlement-wizard/weekly", icon: CalendarRange },
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
    label: "라이더 관리",
    icon: Bike,
    items: [
      { label: "라이더 목록", href: "/riders", icon: Users },
      { label: "익일정산 목록", href: "/settlement-requests", icon: ListChecks, matchExact: true },
    ],
  },
  {
    key: "lease",
    label: "리스렌탈 목록",
    href: "/lease-rentals",
    icon: CarFront,
  },
  {
    key: "finance",
    label: "금액/차감 관리",
    icon: Wallet,
    items: [
      { label: "대여금 관리", href: "/loan-management", icon: Wallet },
      { label: "미차감 관리", href: "/uncollected-deductions", icon: MinusCircle },
    ],
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
    <aside className="hidden w-64 lg:flex lg:flex-col lg:border-r lg:border-white/20 lg:bg-sidebar/80 lg:backdrop-blur-md shadow-xl shadow-black/5 z-30">
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
  const isItemActive = (item: NavItem) =>
    item.matchExact ? currentPath === item.href : currentPath.startsWith(item.href);

  const matchingItems = items
    .filter(isItemActive)
    .sort((a, b) => b.href.length - a.href.length);
  const activeHref = matchingItems[0]?.href ?? null;
  const isAnyChildActive = Boolean(activeHref);
  // 대분류 active 표시 조건: 실제 active 소분류가 있을 때만
  const isSectionActive = isAnyChildActive;

  const SectionIcon = section.icon;

  return (
    <div className="space-y-1">
      <GlassButton
        type="button"
        variant="ghost"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 h-auto overflow-hidden",
          isSectionActive
            ? "bg-surface-100 text-primary shadow-glass-sm hover:bg-surface-200 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full before:bg-primary"
            : "text-muted-foreground hover:bg-surface-50 hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-3">
          {SectionIcon && (
            <SectionIcon className={cn("h-4 w-4 transition-colors", isSectionActive ? "text-primary" : "text-muted-foreground")} />
          )}
          <span>{section.label}</span>
        </span>
        <span
          className={cn(
            "text-xs transition-transform duration-200 text-muted-foreground/70",
            isOpen ? "rotate-90" : ""
          )}
        >
          ▸
        </span>
      </GlassButton>
      <div className={cn("space-y-1 pl-3 overflow-hidden transition-all", !isOpen && "hidden")}>
        {items.map((item) => {
          const isActive =
            activeHref === item.href ||
            (item.matchExact
              ? currentPath === item.href
              : item.href === "/"
                ? currentPath === "/"
                : currentPath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "admin-sidebar-subnav flex items-center rounded-lg px-3 py-2 text-xs transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary font-semibold translate-x-1"
                  : "text-muted-foreground hover:bg-surface-50 hover:text-foreground hover:translate-x-1"
              )}
            >
              {item.icon && (
                <item.icon
                  className={cn(
                    "mr-2 h-4 w-4 text-muted-foreground",
                    isActive ? "text-primary" : ""
                  )}
                />
              )}
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
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden",
        isActive
          ? "bg-surface-100 text-primary shadow-glass-sm before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-full before:bg-primary"
          : "text-muted-foreground hover:bg-surface-50 hover:text-foreground"
      )}
    >
      {Icon && <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />}
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
          <GlassButton
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground h-auto rounded-none"
          >
            정보 수정
          </GlassButton>
          <GlassButton
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground h-auto rounded-none"
          >
            비밀번호 변경
          </GlassButton>
          <GlassButton
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 py-1.5 text-xs text-red-600 hover:bg-muted hover:text-red-700 h-auto rounded-none"
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
          </GlassButton>
        </div>
      )}

      <GlassButton
        type="button"
        variant="ghost"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-muted h-auto"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials}
        </div>
        <div className="flex-1 text-left">
          <div className="text-xs font-medium text-foreground">{userName}</div>
          <div className="text-[11px] text-muted-foreground">{userEmail}</div>
        </div>
      </GlassButton>
    </div>
  );
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
