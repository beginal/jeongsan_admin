import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
    ({ className, label, error, fullWidth = true, icon, ...props }, ref) => {
        return (
            <div className={cn("space-y-2", fullWidth ? "w-full" : "w-auto")}>
                {label && (
                    <label className="text-xs font-semibold text-muted-foreground ml-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        className={cn(
                            "h-11 w-full rounded-xl border-0 bg-muted/50 px-4 text-sm text-foreground ring-1 ring-inset ring-border/50 focus:bg-white focus:ring-2 focus:ring-primary/50 transition-all duration-200 placeholder:text-muted-foreground/50 dark:bg-slate-800/50 dark:focus:bg-slate-800",
                            icon ? "pr-10" : "",
                            error ? "ring-red-500/50 focus:ring-red-500" : "",
                            className
                        )}
                        {...props}
                    />
                    {icon && (
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                            {icon}
                        </div>
                    )}
                </div>
                {error && <p className="text-[11px] text-red-500 ml-1">{error}</p>}
            </div>
        );
    }
);

GlassInput.displayName = "GlassInput";
