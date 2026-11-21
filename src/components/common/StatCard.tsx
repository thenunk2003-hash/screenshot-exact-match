import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatCard({
  label, value, sub, icon: Icon, tone = "default", footnote, className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "warning";
  footnote?: string;
  className?: string;
}) {
  const toneCls = { default: "text-muted-foreground", positive: "text-success", negative: "text-danger", warning: "text-warning" }[tone];
  return (
    <div className={cn("surface-card flex flex-col gap-2 p-5 animate-rise", className)}>
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="num whitespace-nowrap text-lg font-semibold text-foreground leading-tight 2xl:text-xl">{value}</div>
      {sub && <div className={cn("text-xs font-medium", toneCls)}>{sub}</div>}
      {footnote && <div className="text-[11px] text-muted-foreground">{footnote}</div>}
    </div>
  );
}
