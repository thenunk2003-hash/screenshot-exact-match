import { Building2, FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAnalysis, type CompanyKey } from "@/lib/store/analysis-context";

export function AppHeader() {
  const { active, selectCompany, upload, demo, current } = useAnalysis();
  const uploadReady = Boolean(upload?.analysis);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur print:hidden">
      <SidebarTrigger />
      <div className="h-5 w-px bg-border" />
      <Building2 className="size-4 text-muted-foreground" />
      <Select value={active} onValueChange={(v) => selectCompany(v as CompanyKey)}>
        <SelectTrigger className="h-9 w-[260px] max-w-[52vw] bg-card" aria-label="Select company">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="demo">{demo.companyName} (Demo)</SelectItem>
          <SelectItem value="upload" disabled={!uploadReady}>
            {uploadReady ? upload?.analysis?.companyName : "Uploaded company — not analysed yet"}
          </SelectItem>
        </SelectContent>
      </Select>
      <div className="ml-auto flex items-center gap-2">
        {current?.isDemo ? (
          <Badge variant="demo" className="gap-1.5">
            <FlaskConical className="size-3.5" />
            Demo data · synthetic &amp; illustrative
          </Badge>
        ) : current ? (
          <Badge variant="success">Uploaded data</Badge>
        ) : null}
      </div>
    </header>
  );
}
