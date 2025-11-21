import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
    size?: "sm" | "md" | "lg" | "icon";
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        const variants = {
            primary:
                "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 border-transparent",
            secondary:
                "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm border-transparent",
            outline:
                "border border-border bg-white/50 text-foreground hover:bg-white/80 hover:text-foreground hover:shadow-sm dark:bg-slate-800/50 dark:hover:bg-slate-800/80",
            ghost:
                "bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent",
            destructive:
                "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:shadow-sm dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs rounded-lg",
            md: "h-10 px-4 text-sm rounded-xl",
            lg: "h-12 px-6 text-base rounded-2xl",
            icon: "h-10 w-10 p-0 rounded-xl flex items-center justify-center",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);

GlassButton.displayName = "GlassButton";
