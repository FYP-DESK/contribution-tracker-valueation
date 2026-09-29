// Validation for all data/*.json + the contribution payload.
//
// Every error is written for an LLM (or a human) that must be able to FIX the
// problem without asking: it names the file, the offending record, why it is
// wrong, and the exact valid values.

import type {
  Member,
  Contribution,
  Deal,
  Splits,
  Transaction,
  Referral,
  ContributionPayload,
  Channel,
  PlanId,
  TxnKind,
} from "./types";

export type VError = {
  file: string;      // which data file failed
  record?: string;   // offending record id
  problem: string;   // what is wrong, in plain words
  fix: string;       // how to fix it, with the exact valid values
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const CHANNELS: Channel[] = ["easypaisa", "jazzcash", "cash"];
export const TXN_KINDS: TxnKind[] = ["payment", "referral-credit", "adjustment"];
export const WORK_TYPES = [
  "environment-setup",
  "proposal",
  "proposal-ppt",
  "codebase-guidance-docs",
  "codebase-guidance-doc",
  "codebase-development",
  "final-documentation",
  "final-ppt",
] as const;

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// ---------------------------------------------------------------- ids/splits

export function validateMembers(members: Member[]): VError[] {
  const errors: VError[] = [];
  const seen = new Set<string>();
  const validRoles = new Set(["manager", "awareness", "member"]);
  members.forEach((m, i) => {
    const at = `ids.json member #${i + 1}`;
    if (!isStr(m.id) || !m.id.trim())
      errors.push({ file: "ids.json", record: at, problem: "missing member id", fix: "give a lowercase slug id, e.g. 'akash'" });
    else if (seen.has(m.id))
      errors.push({ file: "ids.json", record: m.id, problem: "duplicate member id", fix: `rename one of the two '${m.id}' entries` });
    else seen.add(m.id);
    if (!isStr(m.name) || !m.name.trim())
      errors.push({ file: "ids.json", record: m.id || at, problem: "missing display name", fix: "add name: e.g. 'Akash Mirza'" });
    if (!Array.isArray(m.roles) || m.roles.length === 0)
      errors.push({ file: "ids.json", record: m.id || at, problem: "missing roles array", fix: "roles must be a non-empty array from: manager, awareness, member" });
    else if (!m.roles.every((r) => validRoles.has(r)))
      errors.push({ file: "ids.json", record: m.id || at, problem: `invalid role in [${m.roles.join(", ")}]`, fix: "valid roles: manager, awareness, member" });
  });
  return errors;
}

export function validateSplits(s: Splits, sliceOf: Record<string, string>): VError[] {
  const errors: VError[] = [];
  const workTotal = Object.entries(s.work ?? {})
    .filter(([k]) => !(k in sliceOf))
    .reduce((a, [, v]) => a + v, 0);
  if (workTotal !== 100)
    errors.push({ file: "splits.json", problem: `work slice weights sum to ${workTotal}%`, fix: "weights must sum to exactly 100 (they are % of the 80% work pool)" });
  if ((s.awarenessPct ?? 0) + (s.managementPct ?? 0) >= 100)
    errors.push({ file: "splits.json", problem: `awareness ${s.awarenessPct}% + management ${s.managementPct}% leaves no work pool`, fix: "awareness + management must stay below 100" });
  for (const [k, v] of Object.entries(s.points ?? {})) {
    const sliceKey: string = sliceOf[k] ?? k;
    const w = (s.work as Record<string, number | undefined>)?.[sliceKey] ?? 0;
    if ((v ?? 0) > 0 && w <= 0)
      errors.push({ file: "splits.json", record: k, problem: `has points ${v} but its slice '${sliceKey}' has weight 0`, fix: `give '${sliceKey}' a work weight, or drop the points entry` });
  }
  return errors;
}

// ------------------------------------------------------------- contributions

export function validateContributions(
  contributions: Contribution[],
  members: Member[],
  deals: Deal[],
): VError[] {
  const errors: VError[] = [];
  const memberIds = members.map((m) => m.id);
  const repoToDeal = new Map(deals.map((d) => [d.repo, d.id]));
  const seen = new Set<string>();
  for (const c of contributions) {
    const at = `${c.repo}/${c.id ?? "?"}`;
    const key = `${c.repo}|${c.id}`;
    if (seen.has(key)) {
      errors.push({ file: "contributions.json", record: at, problem: "duplicate record (same repo + id)", fix: `remove one of the two '${c.id}' records for '${c.repo}'` });
      continue;
    }
    seen.add(key);
    if (!memberIds.includes(c.contributor))
      errors.push({
        file: "contributions.json", record: at,
        problem: `contributor '${c.contributor}' is not a registered member`,
        fix: memberIds.length
          ? `use one of the valid ids: ${memberIds.join(", ")} — or add '${c.contributor}' to ids.json first`
          : `ids.json is empty — register '${c.contributor}' in ids.json first`,
      });
    if (!(WORK_TYPES as readonly string[]).includes(c.workType))
      errors.push({ file: "contributions.json", record: at, problem: `unknown work_type '${c.workType}'`, fix: `valid work types: ${WORK_TYPES.join(", ")}` });
    if (!isStr(c.date) || !DATE_RE.test(c.date))
      errors.push({ file: "contributions.json", record: at, problem: `bad date '${c.date}'`, fix: "use YYYY-MM-DD" });
    if (c.status !== "complete")
      errors.push({ file: "contributions.json", record: at, problem: `status is '${c.status}'`, fix: "only 'complete' records count for valuation — set status: complete" });
    const dealId = repoToDeal.get(c.repo);
    if (!dealId)
      errors.push({ file: "contributions.json", record: at, problem: `repo '${c.repo}' has no deal in deals.json`, fix: `add a deal with repo: '${c.repo}' (deals are the fee source — without one this work cannot be valued)` });
  }
  return errors;
}

// -------------------------------------------------------------------- deals

export function validateDeals(deals: Deal[]): VError[] {
  const errors: VError[] = [];
  const seen = new Set<string>();
  const seenRef = new Map<string, string>();
  for (const d of deals) {
    if (!isStr(d.id) || !d.id.trim()) {
      errors.push({ file: "deals.json", problem: "a deal is missing its id", fix: "use the format deal-001, zero-padded, never reused" });
      continue;
    }
    if (seen.has(d.id)) {
      errors.push({ file: "deals.json", record: d.id, problem: "duplicate deal id", fix: `rename one of the two '${d.id}' entries` });
      continue;
    }
    seen.add(d.id);
    if (!isStr(d.repo) || !d.repo.trim())
      errors.push({ file: "deals.json", record: d.id, problem: "missing repo", fix: "set repo to the project repo name, e.g. 'fyp-idea-01-zameenchain'" });
    if (!isStr(d.groupName) || !d.groupName.trim())
      errors.push({ file: "deals.json", record: d.id, problem: "missing groupName", fix: "set groupName to the FYP group's name/label" });
    if (!isStr(d.referenceNo) || !d.referenceNo.trim())
      errors.push({ file: "deals.json", record: d.id, problem: "missing referenceNo", fix: "referenceNo = project number + group number + first 3 letters of the client, e.g. '01-G2-HUJ'" });
    else if (seenRef.has(d.referenceNo))
      errors.push({ file: "deals.json", record: d.id, problem: `referenceNo '${d.referenceNo}' already used by deal ${seenRef.get(d.referenceNo)}`, fix: "reference numbers are unique per deal — issue a new one" });
    else seenRef.set(d.referenceNo, d.id);
    if (d.plan !== 1 && d.plan !== 2)
      errors.push({ file: "deals.json", record: d.id, problem: `invalid plan ${String(d.plan)}`, fix: "plan must be 1 (The Builder) or 2 (The Guided)" });
    if (!isNum(d.feePkr) || d.feePkr <= 0)
      errors.push({ file: "deals.json", record: d.id, problem: `invalid feePkr ${String(d.feePkr)}`, fix: "feePkr must be a positive number (PKR), e.g. 20000" });
    if (!Array.isArray(d.installments) || d.installments.length === 0)
      errors.push({ file: "deals.json", record: d.id, problem: "missing installments schedule", fix: "add the planned installments, e.g. [{ seq: 1, amountPkr: 5000 }, …] — slices of any size are allowed" });
    else {
      const sum = d.installments.reduce((a, i) => a + (i.amountPkr ?? 0), 0);
      if (isNum(d.feePkr) && sum !== d.feePkr)
        errors.push({ file: "deals.json", record: d.id, problem: `installments sum to ${sum} but feePkr is ${d.feePkr}`, fix: "make the planned installments sum to the fee (amounts may be any slice size)" });
    }
    if (!isStr(d.createdAt) || !DATE_RE.test(d.createdAt))
      errors.push({ file: "deals.json", record: d.id, problem: `bad createdAt '${d.createdAt}'`, fix: "use YYYY-MM-DD" });
    if (!["active", "completed", "dropped"].includes(d.status))
      errors.push({ file: "deals.json", record: d.id, problem: `invalid status '${d.status}'`, fix: "status must be: active, completed, or dropped" });
  }
  return errors;
}

// ------------------------------------------------------------- transactions

export function validateTransactions(
  txns: Transaction[],
  deals: Deal[],
  members: Member[],
): VError[] {
  const errors: VError[] = [];
  const dealIds = new Set(deals.map((d) => d.id));
  const memberIds = members.map((m) => m.id);
  const seen = new Set<string>();
  const perDealSeq = new Map<string, Set<number>>();
  for (const t of txns) {
    const at = `tx ${t.id ?? "?"}`;
    const key = `${t.dealId}|${t.id}`;
    if (seen.has(key)) {
      errors.push({ file: "transactions.json", record: at, problem: "duplicate transaction id", fix: `rename one of the two '${t.id}' entries` });
      continue;
    }
    seen.add(key);
    if (!dealIds.has(t.dealId))
      errors.push({ file: "transactions.json", record: at, problem: `dealId '${t.dealId}' does not exist in deals.json`, fix: `valid deals: ${[...dealIds].join(", ") || "(none — create a deal first)"}` });
    if (!isNum(t.amountPkr) || t.amountPkr <= 0)
      errors.push({ file: "transactions.json", record: at, problem: `invalid amountPkr ${String(t.amountPkr)}`, fix: "amountPkr must be a positive number (the kind decides direction)" });
    if (!CHANNELS.includes(t.channel))
      errors.push({ file: "transactions.json", record: at, problem: `invalid channel '${t.channel}'`, fix: `channel must be one of: ${CHANNELS.join(", ")}` });
    if (!TXN_KINDS.includes(t.kind))
      errors.push({ file: "transactions.json", record: at, problem: `invalid kind '${t.kind}'`, fix: `kind must be one of: ${TXN_KINDS.join(", ")}` });
    if (!memberIds.includes(t.recordedBy))
      errors.push({ file: "transactions.json", record: at, problem: `recordedBy '${t.recordedBy}' is not a registered member`, fix: `use one of: ${memberIds.join(", ")}` });
    if (!isStr(t.date) || !DATE_RE.test(t.date))
      errors.push({ file: "transactions.json", record: at, problem: `bad date '${t.date}'`, fix: "use YYYY-MM-DD" });
    if (!isNum(t.seq)) {
      errors.push({ file: "transactions.json", record: at, problem: "missing per-deal sequence number (seq)", fix: "seq counts the transactions on ONE deal: 1, 2, 3…" });
    } else {
      const set = perDealSeq.get(t.dealId) ?? new Set<number>();
      if (set.has(t.seq))
        errors.push({ file: "transactions.json", record: at, problem: `seq ${t.seq} is used twice on deal '${t.dealId}'`, fix: "seq numbers must be unique per deal — renumber the later transactions" });
      set.add(t.seq);
      perDealSeq.set(t.dealId, set);
    }
  }
  return errors;
}

// ---------------------------------------------------------------- referrals

export function validateReferrals(
  referrals: Referral[],
  deals: Deal[],
): VError[] {
  const errors: VError[] = [];
  const dealById = new Map(deals.map((d) => [d.id, d]));
  const seen = new Set<string>();
  for (const r of referrals) {
    const at = `referral ${r.code || "?"}`;
    if (seen.has(r.code)) {
      errors.push({ file: "referrals.json", record: at, problem: "duplicate referral code", fix: `codes are unique — remove or rename the second '${r.code}'` });
      continue;
    }
    seen.add(r.code);
    if (!isStr(r.code) || !r.code.trim())
      errors.push({ file: "referrals.json", record: at, problem: "missing code", fix: "code = the issuing deal's referenceNo (project#+group#+first-3-letters)" });
    const issuer = dealById.get(r.referrerDealId);
    if (!issuer)
      errors.push({ file: "referrals.json", record: at, problem: `referrerDealId '${r.referrerDealId}' does not exist in deals.json`, fix: "point referrerDealId at the deal that owns this referral code" });
    else if (issuer.referenceNo !== r.code)
      errors.push({ file: "referrals.json", record: at, problem: `code '${r.code}' does not match the issuing deal's referenceNo '${issuer.referenceNo}'`, fix: "a deal's referral code IS its reference number — make them identical" });
    if (!["active", "redeemed"].includes(r.status))
      errors.push({ file: "referrals.json", record: at, problem: `invalid status '${r.status}'`, fix: "status must be: active or redeemed" });
    if (r.status === "redeemed" && !r.redeemedByDealId)
      errors.push({ file: "referrals.json", record: at, problem: "status is 'redeemed' but redeemedByDealId is empty", fix: "set redeemedByDealId to the deal that used the code" });
    if (r.redeemedByDealId) {
      const user = dealById.get(r.redeemedByDealId);
      if (!user)
        errors.push({ file: "referrals.json", record: at, problem: `redeemedByDealId '${r.redeemedByDealId}' does not exist in deals.json`, fix: "point redeemedByDealId at the NEW deal that came via the referral" });
      else if (user.referralCodeUsed !== r.code)
        errors.push({ file: "referrals.json", record: at, problem: `deal '${user.id}' does not reference this code (referralCodeUsed: '${user.referralCodeUsed ?? ""}')`, fix: `set deal '${user.id}'.referralCodeUsed to '${r.code}'` });
    }
  }
  // single-use enforcement across the whole list
  const redeemedTo = new Map<string, string>();
  for (const r of referrals) {
    if (!r.redeemedByDealId) continue;
    const prev = redeemedTo.get(r.redeemedByDealId);
    if (prev)
      errors.push({ file: "referrals.json", record: r.code, problem: `deal '${r.redeemedByDealId}' redeemed by both '${prev}' and '${r.code}'`, fix: "a referral code is single-use AND a deal can come via at most one referral — fix one of the two records" });
    redeemedTo.set(r.redeemedByDealId, r.code);
  }
  return errors;
}

// ------------------------------------------------------------- payload gate

export type PayloadResult =
  | { ok: true; records: Contribution[]; errors: [] }
  | { ok: false; records: never[]; errors: VError[] };

export function validatePayload(
  raw: unknown,
  members: Member[],
  deals: Deal[],
  existing: Contribution[],
): PayloadResult {
  const errors: VError[] = [];
  const p = raw as ContributionPayload | null;
  if (!p || typeof p !== "object")
    return { ok: false, records: [], errors: [{ file: "payload", problem: "the pasted text is not a JSON object", fix: "copy the whole contribution-history/payload.json file and paste it again" }] };
  if (p.schema !== "fyp-desk.contribution-payload/1")
    errors.push({ file: "payload", record: "schema", problem: `unknown schema '${String(p.schema)}'`, fix: "this tracker only ingests 'fyp-desk.contribution-payload/1' — regenerate the payload from an updated kit" });
  if (!isStr(p.repo) || !p.repo.trim())
    errors.push({ file: "payload", record: "repo", problem: "missing repo", fix: "the payload must name its project repo, e.g. 'fyp-idea-01-zameenchain'" });
  if (!isStr(p.idea_id) || !p.idea_id.trim())
    errors.push({ file: "payload", record: "idea_id", problem: "missing idea_id", fix: "the payload must carry its IDEA-NNN from fyp-ideas IDEAS_INDEX.json" });
  if (!Array.isArray(p.records) || p.records.length === 0)
    errors.push({ file: "payload", record: "records", problem: "records is empty or not an array", fix: "regenerate payload.json in the project repo — it must list every c(NNN) record" });
  if (errors.length) return { ok: false, records: [], errors };

  const memberIds = members.map((m) => m.id);
  const seen = new Set(existing.map((c) => `${c.repo}|${c.id}`));
  const out: Contribution[] = [];
  p.records!.forEach((r, i) => {
    const at = `payload record #${i + 1} (${r?.id ?? "no id"})`;
    const rec: VError[] = [];
    if (!isStr(r.id) || !/^c\d{3,}$/.test(r.id))
      rec.push({ file: "payload", record: at, problem: `bad record id '${String(r.id)}'`, fix: "record ids look like c001, c002 — zero-padded, matching the c(NNN).md file" });
    else if (seen.has(`${p.repo}|${r.id}`))
      rec.push({ file: "payload", record: r.id, problem: `already imported (repo '${p.repo}' + id '${r.id}')`, fix: "regenerate the payload in the project repo so it reflects the new records only, or remove the duplicate from payload.json" });
    if (!isStr(r.contributor) || !memberIds.includes(r.contributor))
      rec.push({
        file: "payload", record: r.id ?? at,
        problem: `contributor '${String(r.contributor)}' is not a registered member`,
        fix: `register it in ids.json (one of the valid ids is enough to proceed): ${memberIds.join(", ") || "(ids.json is empty)"} — the record's own repo should fix its c(NNN).md frontmatter too`,
      });
    if (!(WORK_TYPES as readonly string[]).includes(r.work_type))
      rec.push({ file: "payload", record: r.id ?? at, problem: `unknown work_type '${String(r.work_type)}'`, fix: `valid work types: ${WORK_TYPES.join(", ")}` });
    if (!isStr(r.date) || !DATE_RE.test(r.date))
      rec.push({ file: "payload", record: r.id ?? at, problem: `bad date '${String(r.date)}'`, fix: "use YYYY-MM-DD" });
    if (r.status !== "complete")
      rec.push({ file: "payload", record: r.id ?? at, problem: `status is '${String(r.status)}'`, fix: "only 'complete' records are imported" });
    if (rec.length === 0)
      out.push({
        id: r.id!, date: r.date!, contributor: r.contributor!,
        workType: r.work_type as Contribution["workType"], ideaId: p.idea_id!,
        repo: p.repo!, status: "complete",
        summary: r.summary, evidence: r.evidence, hours: r.hours,
      });
    errors.push(...rec);
  });
  if (errors.length) return { ok: false, records: [], errors };
  return { ok: true, records: out, errors: [] };
}
