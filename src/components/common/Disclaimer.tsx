import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-dashed bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
