import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  isLoading?: boolean;
}

const base =
  "inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variantClass: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary",
  secondary: "border border-border bg-background text-foreground hover:bg-muted focus-visible:outline-primary",
  ghost: "text-muted-foreground hover:bg-muted focus-visible:outline-primary",
  danger: "bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-500",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-[11px]",
  md: "h-9 px-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", icon, children, isLoading, ...props }, ref) => {
    const { isLoading: _omit, ...rest } = props;
    return (
      <button
        ref={ref}
        className={cn(base, variantClass[variant], sizeClass[size], className)}
        disabled={props.disabled || isLoading}
        {...rest}
      >
        {isLoading && <span className="mr-2 h-3 w-3 animate-spin rounded-full border border-white/70 border-t-transparent" />}
        {icon && <span className={children ? "mr-1.5" : ""}>{icon}</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
