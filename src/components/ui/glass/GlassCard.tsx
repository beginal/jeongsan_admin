import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    title?: ReactNode;
    icon?: ReactNode;
    action?: ReactNode;
}

export function GlassCard({
    children,
    className,
    title,
    icon,
    action,
}: GlassCardProps) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-white/40 bg-surface-100/50 px-6 py-6 shadow-glass backdrop-blur-sm transition-all duration-200 dark:border-white/10 dark:bg-slate-900/40",
                className
            )}
        >
            {(title || icon || action) && (
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {icon && <span className="text-primary">{icon}</span>}
                        {title && (
                            <h2 className="text-sm font-bold uppercase tracking-wider text-primary/90 flex items-center gap-2">
                                {!icon && <span className="w-1 h-4 rounded-full bg-primary"></span>}
                                {title}
                            </h2>
                        )}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="text-sm text-foreground">{children}</div>
        </div>
    );
}
