// Data model for contribution tracking and valuation.

export type Member = {
  id: string;            // stable id, e.g. "akash"
  name: string;          // display name
  roles: string[];       // e.g. ["manager"], ["awareness"], ["member"]
};

export type WorkType =
  | "environment-setup"
  | "proposal"
  | "proposal-ppt"
  | "codebase-guidance-docs"   // all 4 docs by one person
  | "codebase-guidance-doc"    // one doc (0.25 slice point)
  | "codebase-development"
  | "final-documentation"
  | "final-ppt";

export type Contribution = {
  id: string;            // c001 — from the project repo's contribution-history/
  date: string;          // YYYY-MM-DD
  contributor: string;   // member id
  workType: WorkType;
  ideaId: string;        // IDEA-NNN
  repo: string;          // project repo name (e.g. fyp-idea-01-zameenchain)
  status: "complete";
};

export type Splits = {
  awarenessPct: number;   // 10 — fixed, client funnel owner
  managementPct: number;  // 10 — fixed, team lead/manager
  // the remaining 80% is divided by these weights (must sum to 100)
  work: Record<WorkType, number>;
  // points inside a slice: one doc = 0.25 so 4 docs == full docs slice
  points: Partial<Record<WorkType, number>>;
};

export type Deal = {
  id: string;            // e.g. deal-001
  ideaId: string;        // IDEA-NNN
  repo: string;          // project repo name
  client: string;        // client/deal label
  feePkr: number;        // total fee for the deal
  notes?: string;
};

export type ValuationRow = {
  memberId: string;
  name: string;
  totalTasks: number;
  byType: Record<string, number>;
  awarenessPkr: number;   // fixed share (role-based, spread across deals)
  managementPkr: number;  // fixed share (role-based, spread across deals)
  workPkr: number;        // earned from the 80% work pool
  totalPkr: number;
  perIdea: Array<{ ideaId: string; repo: string; pct: number; pkr: number }>;
};
