// Data model for contribution tracking and valuation.

export type Member = {
  id: string;            // stable id, e.g. "akash"
  name: string;          // display name
  roles: string[];       // e.g. ["manager"], ["awareness"], ["member"]
  email?: string;        // optional contact (used to resolve identities)
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
  summary?: string;      // one-line, from the payload
  evidence?: string[];   // paths in the project repo, from the payload
  hours?: number;        // optional self-reported context, never the pay basis
};

export type Splits = {
  awarenessPct: number;   // 10 — fixed, client funnel owner
  managementPct: number;  // 10 — fixed, team lead/manager
  // the remaining 80% is divided by these weights (must sum to 100)
  work: Record<WorkType, number>;
  // points inside a slice: one doc = 0.25 so 4 docs == full docs slice
  points: Partial<Record<WorkType, number>>;
};

// ---------------------------------------------------------------- money model

export type PlanId = 1 | 2;             // 1 = The Builder, 2 = The Guided
export type Channel = "easypaisa" | "jazzcash" | "cash";

export type Installment = {
  seq: number;            // 1..n — planned payment order
  amountPkr: number;
  note?: string;
};

export type Deal = {
  id: string;                  // e.g. deal-001
  ideaId: string;              // IDEA-NNN
  repo: string;                // project repo name
  groupName: string;           // the FYP group (the "client" side)
  referenceNo: string;         // project#+group#+first-3-letters, e.g. 01-G2-HUJ
  client: string;              // contact person
  plan: PlanId;                // plan 1 or 2 chosen by the group
  feePkr: number;              // total fee for the deal
  installments: Installment[]; // planned schedule (flexible — slices allowed)
  referralCodeUsed?: string | null; // referral code the group came in with
  status: "active" | "completed" | "dropped";
  createdAt: string;           // YYYY-MM-DD
  notes?: string;
};

export type TxnKind = "payment" | "referral-credit" | "adjustment";

export type Transaction = {
  id: string;            // tx-001 — global, zero-padded, never reused
  dealId: string;        // deal-NNN
  seq: number;           // 1, 2, 3… — per-deal transaction number
  date: string;          // YYYY-MM-DD
  amountPkr: number;     // positive number; kind decides its direction
  channel: Channel;      // easypaisa | jazzcash | cash
  kind: TxnKind;         // payment = money in; referral-credit = 5% award
  recordedBy: string;    // member id from ids.json
  note?: string;
};

export type Referral = {
  code: string;                 // e.g. 01-G2-HUJ (the deal's reference number)
  referrerDealId: string;       // deal-NNN that owns/issued the code
  createdAt: string;            // YYYY-MM-DD
  redeemedByDealId?: string | null; // the NEW deal that used it (single use)
  redeemedAt?: string | null;
  status: "active" | "redeemed";
  note?: string;
};

// ------------------------------------------------------------- payload import

export type PayloadRecord = {
  id: string;
  date: string;
  contributor: string;
  work_type: string;
  idea_id: string;
  deal_id?: string;
  status: string;
  summary?: string;
  evidence?: string[];
  hours?: number;
};

export type ContributionPayload = {
  schema: string;               // "fyp-desk.contribution-payload/1"
  repo: string;
  idea_id: string;
  generated_at: string;
  records: PayloadRecord[];
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

export type DealBalance = {
  dealId: string;
  feePkr: number;
  paidPkr: number;              // sum of kind === "payment"
  referralCreditPkr: number;    // sum of kind === "referral-credit"
  adjustmentPkr: number;        // sum of kind === "adjustment"
  remainingPkr: number;         // fee - paid - referralCredit - adjustment
  txnCount: number;
  nextDue: { seq: number; amountPkr: number } | null; // next unpaid planned installment
};
