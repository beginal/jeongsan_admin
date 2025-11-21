import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

export interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    options?: { label: string; value: string | number }[];
}

export const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(
    ({ className, label, error, fullWidth = true, options, children, ...props }, ref) => {
        return (
            <div className={cn("space-y-2", fullWidth ? "w-full" : "w-auto")}>
                {label && (
                    <label className="text-xs font-semibold text-muted-foreground ml-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={cn(
                            "h-11 w-full appearance-none rounded-xl border border-border/70 bg-card px-4 text-sm text-foreground shadow-sm ring-0 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-200 dark:border-white/10 dark:bg-slate-900/40 dark:text-foreground",
                            error ? "border-red-300 focus:border-red-400 focus:ring-red-300/60" : "",
                            className
                        )}
                        {...props}
                    >
                        {options
                            ? options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))
                            : children}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                            <path
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                                fillRule="evenodd"
                            ></path>
                        </svg>
                    </div>
                </div>
                {error && <p className="text-[11px] text-red-500 ml-1">{error}</p>}
            </div>
        );
    }
);

GlassSelect.displayName = "GlassSelect";
