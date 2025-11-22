import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: { label: string; href?: string }[];
    actions?: ReactNode;
    className?: string;
    icon?: ReactNode;
}

export function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
    className,
    icon,
}: PageHeaderProps) {
    const mark = icon || <span className="text-lg font-bold">정</span>;
    return (
        <div className={cn("flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4", className)}>
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {mark}
                </div>
                <div>
                    {breadcrumbs && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            {breadcrumbs.map((crumb, index) => (
                                <span key={index} className="flex items-center">
                                    {index > 0 && <span className="mx-1">/</span>}
                                    {crumb.label}
                                </span>
                            ))}
                        </div>
                    )}
                    <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                    {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
