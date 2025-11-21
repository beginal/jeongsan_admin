import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, description, icon, action, compact }: EmptyStateProps) {
  return (
    <div
      className={`flex ${compact ? "flex-col gap-2" : "flex-col gap-3"} items-center justify-center text-center text-sm text-muted-foreground p-6`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
        {icon || <Inbox className="h-5 w-5" />}
      </div>
      <div className="space-y-1">
        <div className="text-foreground font-semibold">{title}</div>
        {description && <div className="text-[13px] text-muted-foreground">{description}</div>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
