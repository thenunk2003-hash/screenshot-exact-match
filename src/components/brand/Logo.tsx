import { cn } from "@/lib/utils";

/** CashTrap mark: a coin caught inside detection brackets. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-sidebar-accent" />
      <path d="M7 11V7h4M21 7h4v4M25 21v4h-4M11 25H7v-4" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-sidebar-primary" />
      <circle cx="16" cy="16" r="5.5" fill="none" strokeWidth="1.8" className="stroke-sidebar-accent-foreground" />
      <path d="M16 12.6v6.8M17.9 14.1c-.4-.6-1.1-.9-1.9-.9-1 0-1.8.6-1.8 1.4 0 1.9 3.8 1 3.8 2.9 0 .8-.8 1.4-1.9 1.4-.8 0-1.6-.4-2-1" fill="none" strokeWidth="1.2" strokeLinecap="round" className="stroke-sidebar-accent-foreground" />
    </svg>
  );
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className="shrink-0" />
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-display text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">
            CashTrap <span className="text-sidebar-primary">AI</span>
          </div>
          <div className="text-[10px] text-sidebar-foreground/70">Find the cash traps before you invest.</div>
        </div>
      )}
    </div>
  );
}
