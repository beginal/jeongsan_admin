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
                "border border-border/80 bg-card text-foreground shadow-sm hover:bg-muted/80 hover:text-foreground dark:border-white/10 dark:bg-slate-900/60 dark:hover:bg-slate-900/80",
            outline:
                "border border-border/80 bg-card/80 text-foreground shadow-sm hover:bg-muted/60 hover:text-foreground dark:border-white/20 dark:bg-transparent dark:text-foreground dark:hover:bg-white/5",
            ghost:
                "border border-transparent bg-transparent text-foreground hover:bg-muted/60 hover:text-foreground dark:text-foreground dark:hover:bg-white/5",
            destructive:
                "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:shadow-sm dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30",
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
