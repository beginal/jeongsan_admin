import type { ReactNode } from "react";
import { Clock4, CreditCard, Gauge, TrendingUp } from "lucide-react";
import { DashboardStats } from "@/components/admin-v2/DashboardStats";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { PageHeader } from "@/components/ui/glass/PageHeader";

export default function AdminV2DashboardPage() {
  const stats = [
    {
      label: "Earned",
      value: "$1,250",
      change: "+12% from last week",
      trend: "up" as const,
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      label: "Hours logged",
      value: "35.5 hrs",
      change: "-2% from last week",
      trend: "down" as const,
      icon: <Clock4 className="h-5 w-5" />,
    },
    {
      label: "Avg. time",
      value: "2:55 hrs",
      change: "No change",
      trend: "neutral" as const,
      icon: <Gauge className="h-5 w-5" />,
    },
    {
      label: "Weekly growth",
      value: "14.5%",
      change: "+4% from last week",
      trend: "up" as const,
      icon: <TrendingUp className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Hello, John"
        description="Here's a summary of your account activity for this week."
      >
        <div className="flex items-center justify-start gap-2 text-sm text-muted-foreground md:justify-end">
          <div className="inline-flex h-9 items-center rounded-full bg-primary/10 px-4 text-primary">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              SF
            </span>
            San Francisco, CA
          </div>
          <span className="text-foreground">&mdash;</span>
          <span className="font-medium text-foreground">8:00 PM</span>
        </div>
      </PageHeader>

      <DashboardStats stats={stats} />

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <GlassCard className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/5 dark:bg-white/5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary/90">Performance</h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                  <span>Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-foreground" />
                  <span>Tracked</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
                Chart placeholder &mdash; connect to your analytics data here.
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/5 dark:bg-white/5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary/90">Active projects</h2>
              <GlassButton
                type="button"
                variant="ghost"
                className="h-auto p-0 text-xs font-medium text-primary hover:bg-transparent hover:underline"
              >
                Browse all
              </GlassButton>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Title</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Owner</th>
                    <th className="px-6 py-3 text-left font-medium">Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <ProjectRow
                    title="Filters AI"
                    dateLabel="Updated on Apr 10, 2024"
                    statusLabel="Ready to ship"
                    statusColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    owner="Michael Johnson"
                  />
                  <ProjectRow
                    title="Design landing page"
                    dateLabel="Created on Mar 05, 2024"
                    statusLabel="Cancelled"
                    statusColor="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    owner="Emily Thompson"
                  />
                  <ProjectRow
                    title="Update documentation"
                    dateLabel="Created on Jan 22, 2024"
                    statusLabel="In testing"
                    statusColor="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                    owner="Michael Johnson"
                  />
                  <ProjectRow
                    title="Add transactions"
                    dateLabel="Created on Apr 25, 2024"
                    statusLabel="Backlog"
                    statusColor="bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
                    owner="Olivia Davis"
                  />
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard title="Goals">
            <div className="space-y-5 pt-2">
              <GoalRow title="Increase monthly revenue" progress={75} tone="primary" />
              <GoalRow title="Ship new analytics dashboard" progress={48} tone="secondary" />
              <GoalRow title="Improve retention for new users" progress={32} tone="accent" />
            </div>
          </GlassCard>

          <GlassCard title="Upcoming events">
            <div className="space-y-5 pt-2">
              <p className="text-muted-foreground text-xs">
                이벤트, 마감일, 알림 등 일정 정보를 연결해서 보여줄 수 있는 영역입니다.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center justify-between text-sm">
                  <span className="font-medium">Team sync</span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Today · 3:00 PM</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="font-medium">Product review</span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Thu · 10:30 AM</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="font-medium">Quarterly report</span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">Next week</span>
                </li>
              </ul>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}

interface ProjectRowProps {
  title: string;
  dateLabel: string;
  statusLabel: string;
  statusColor: string;
  owner: string;
}

function ProjectRow({ title, dateLabel, statusLabel, statusColor, owner }: ProjectRowProps) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-6 py-4 align-top">
        <div className="space-y-1">
          <div className="font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{dateLabel}</div>
        </div>
      </td>
      <td className="px-6 py-4 align-top">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </td>
      <td className="px-6 py-4 align-top text-nowrap">
        <span className="text-sm text-foreground">{owner}</span>
      </td>
      <td className="px-6 py-4 align-top text-xs text-muted-foreground">
        <div className="flex -space-x-2">
          <div className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white dark:border-slate-800"></div>
          <div className="h-6 w-6 rounded-full bg-slate-300 border-2 border-white dark:border-slate-800"></div>
          <div className="h-6 w-6 rounded-full bg-slate-400 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[9px] text-white">+2</div>
        </div>
      </td>
    </tr>
  );
}

interface GoalRowProps {
  title: string;
  progress: number;
  tone: "primary" | "secondary" | "accent";
}

function GoalRow({ title, progress, tone }: GoalRowProps) {
  const toneClass =
    tone === "secondary"
      ? "bg-secondary text-secondary-foreground"
      : tone === "accent"
        ? "bg-accent text-accent-foreground"
        : "bg-primary text-primary-foreground";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs font-bold text-primary">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className={`h-full rounded-full ${toneClass} shadow-sm`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
