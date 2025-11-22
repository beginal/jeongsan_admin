import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
    title?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    glass?: boolean;
}

export function Section({ title, action, children, className, glass = true }: SectionProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-border px-4 py-4 text-sm shadow-sm transition-all duration-200",
                glass ? "bg-card/50 backdrop-blur-sm" : "bg-card",
                className
            )}
        >
            {(title || action) && (
                <div className="mb-3 flex items-center justify-between">
                    {title && (
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {title}
                        </h2>
                    )}
                    {action && <div>{action}</div>}
                </div>
            )}
            {children}
        </div>
    );
}
