import { GlassCard } from "@/components/ui/glass/GlassCard";

interface StatItem {
    label: string;
    value: string | number;
    change?: string;
    trend?: "up" | "down" | "neutral";
    icon?: React.ReactNode;
}

interface DashboardStatsProps {
    stats: StatItem[];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
                <GlassCard key={index} className="p-6">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            {stat.label}
                        </p>
                        {stat.icon && (
                            <div className="text-muted-foreground">{stat.icon}</div>
                        )}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                        {stat.change && (
                            <p
                                className={`text-xs font-medium ${stat.trend === "up"
                                        ? "text-emerald-500"
                                        : stat.trend === "down"
                                            ? "text-red-500"
                                            : "text-muted-foreground"
                                    }`}
                            >
                                {stat.change}
                            </p>
                        )}
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}
