export interface ReportFinding {
  finding: string;
  evidence: string;
  possibleExplanations: string;
}

export interface DueDiligenceReport {
  executiveSummary: string;
  riskScoreCommentary: string;
  keyFindings: ReportFinding[];
  receivablesInventory: string;
  profitabilityVsCash: string;
  leverage: string;
  cashRelease: string;
  investmentImplications: string[];
  dataLimitations: string[];
  managementQuestions: string[];
  recommendation: string;
}

export type ReportMode = "ai" | "deterministic";
