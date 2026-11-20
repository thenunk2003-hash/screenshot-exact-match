import { Link } from "@tanstack/react-router";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NoAnalysis() {
  return (
    <div className="surface-card mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 p-10 text-center">
      <FileSpreadsheet className="size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">No analysed company selected</h2>
      <p className="text-sm text-muted-foreground">Upload financial statements and click Analyze Financials, or switch to the GulfTech demo company.</p>
      <Button asChild><Link to="/company-analysis">Go to Company Analysis</Link></Button>
    </div>
  );
}
