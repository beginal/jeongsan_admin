import type { ReactNode } from "react";
import { Clock4, CreditCard, Gauge, TrendingUp } from "lucide-react";

export default function AdminV2DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Hello, John</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s a summary of your account activity for this week.
          </p>
        </div>
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
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          label="Earned"
          value="$1,250"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <DashboardStat
          label="Hours logged"
          value="35.5 hrs"
          icon={<Clock4 className="h-5 w-5" />}
        />
        <DashboardStat
          label="Avg. time"
          value="2:55 hrs"
          icon={<Gauge className="h-5 w-5" />}
        />
        <DashboardStat
          label="Weekly growth"
          value="14.5%"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-sm font-semibold">Performance</h2>
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
            <div className="p-5">
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                Chart placeholder &mdash; connect to your analytics data here.
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-sm font-semibold">Active projects</h2>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
              >
                Browse all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-t text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Title</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Owner</th>
                    <th className="px-5 py-3 text-left font-medium">Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <ProjectRow
                    title="Filters AI"
                    dateLabel="Updated on Apr 10, 2024"
                    statusLabel="Ready to ship"
                    statusColor="bg-emerald-100 text-emerald-700"
                    owner="Michael Johnson"
                  />
                  <ProjectRow
                    title="Design landing page"
                    dateLabel="Created on Mar 05, 2024"
                    statusLabel="Cancelled"
                    statusColor="bg-red-100 text-red-700"
                    owner="Emily Thompson"
                  />
                  <ProjectRow
                    title="Update documentation"
                    dateLabel="Created on Jan 22, 2024"
                    statusLabel="In testing"
                    statusColor="bg-slate-100 text-slate-700"
                    owner="Michael Johnson"
                  />
                  <ProjectRow
                    title="Add transactions"
                    dateLabel="Created on Apr 25, 2024"
                    statusLabel="Backlog"
                    statusColor="bg-neutral-100 text-neutral-700"
                    owner="Olivia Davis"
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm font-semibold">Goals</h2>
            </div>
            <div className="space-y-4 p-5 text-sm">
              <GoalRow title="Increase monthly revenue" progress={75} tone="primary" />
              <GoalRow title="Ship new analytics dashboard" progress={48} tone="secondary" />
              <GoalRow title="Improve retention for new users" progress={32} tone="accent" />
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm font-semibold">Upcoming events</h2>
            </div>
            <div className="space-y-4 p-5 text-sm">
              <p className="text-muted-foreground">
                이벤트, 마감일, 알림 등 일정 정보를 연결해서 보여줄 수 있는 영역입니다.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center justify-between">
                  <span>Team sync</span>
                  <span className="text-xs text-muted-foreground">Today · 3:00 PM</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Product review</span>
                  <span className="text-xs text-muted-foreground">Thu · 10:30 AM</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Quarterly report</span>
                  <span className="text-xs text-muted-foreground">Next week</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface DashboardStatProps {
  label: string;
  value: string;
  icon: ReactNode;
}

function DashboardStat({ label, value, icon }: DashboardStatProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-background text-primary">
          {icon}
        </div>
      </div>
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
    <tr className="hover:bg-muted/60">
      <td className="px-5 py-4 align-top">
        <div className="space-y-1">
          <div className="font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{dateLabel}</div>
        </div>
      </td>
      <td className="px-5 py-4 align-top">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </td>
      <td className="px-5 py-4 align-top text-nowrap">
        <span className="text-sm text-foreground">{owner}</span>
      </td>
      <td className="px-5 py-4 align-top text-xs text-muted-foreground">
        Team avatars / members
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
      ? "bg-secondary/10 text-secondary"
      : tone === "accent"
        ? "bg-accent/10 text-accent-foreground"
        : "bg-primary/10 text-primary";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${toneClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
