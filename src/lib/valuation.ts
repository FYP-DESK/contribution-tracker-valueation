// Valuation engine — pure functions, no I/O.
//
// Model: every deal's fee is split as
//   awareness (fixed 10%) + management (fixed 10%) + work pool (80%)
// The work pool is divided across slices by splits.work weights. Inside a
// slice, each member earns  weight × (member points / total points in slice).
// Points per record type come from splits.points (one doc = 0.25 of the docs
// slice, so 4 separate doc records equal one full docs record).

import type {
  Member,
  Contribution,
  Deal,
  Splits,
  ValuationRow,
} from "./types";

export const DEFAULT_SPLITS: Splits = {
  awarenessPct: 10,
  managementPct: 10,
  work: {
    "environment-setup": 5,
    proposal: 15,
    "proposal-ppt": 10,
    "codebase-guidance-docs": 30,
    "codebase-guidance-doc": 0, // points-based inside the docs slice
    "codebase-development": 25,
    "final-documentation": 10,
    "final-ppt": 5,
  },
  points: {
    "codebase-guidance-doc": 0.25,
    "codebase-guidance-docs": 1,
  },
};

// Point-based record types pay out inside their parent slice.
const SLICE_OF: Partial<Record<keyof Splits["work"], keyof Splits["work"]>> = {
  "codebase-guidance-doc": "codebase-guidance-docs",
};

function sumWorkWeights(s: Splits): number {
  return Object.entries(s.work)
    .filter(([k]) => !(k in SLICE_OF))
    .reduce((acc, [, v]) => acc + v, 0);
}

export function validateSplits(s: Splits): string[] {
  const errors: string[] = [];
  // work weights are % OF THE WORK POOL (100 - awareness - management), so they
  // must sum to 100 on their own; awareness + management come off the fee first.
  const workTotal = sumWorkWeights(s);
  if (workTotal !== 100)
    errors.push(`work slice weights sum to ${workTotal}%, must be 100% of the work pool`);
  if (s.awarenessPct + s.managementPct >= 100)
    errors.push(`awareness + management = ${s.awarenessPct + s.managementPct}% leaves no work pool`);
  for (const [k, v] of Object.entries(s.points)) {
    const sliceKey = SLICE_OF[k as keyof Splits["work"]] ?? k;
    const w = s.work[sliceKey as keyof Splits["work"]] ?? 0;
    if (v > 0 && w <= 0)
      errors.push(`"${k}" has points but its slice "${sliceKey}" has no work weight`);
  }
  return errors;
}

export function computeValuation(
  members: Member[],
  contributions: Contribution[],
  deals: Deal[],
  splits: Splits = DEFAULT_SPLITS,
): { errors: string[]; rows: ValuationRow[]; grandTotalPkr: number } {
  const errors = validateSplits(splits);

  const memberById = new Map(members.map((m) => [m.id, m]));
  const dealByRepo = new Map(deals.map((d) => [d.repo, d]));

  // -------- fixed roles --------
  const awarenessMembers = members.filter((m) => m.roles.includes("awareness"));
  const managementMembers = members.filter((m) => m.roles.includes("manager"));

  // -------- aggregate work points per (repo, workType, member) --------
  type Key = string; // `${repo}|${workType}|${member}`
  const points = new Map<Key, number>();
  const taskCount = new Map<string, number>(); // memberId -> count
  const byType = new Map<string, Record<string, number>>();
  const perIdeaPkr = new Map<string, { repo: string; pkr: number }>(); // memberId|ideaId

  for (const c of contributions) {
    const key: Key = `${c.repo}|${c.workType}|${c.contributor}`;
    const pts = splits.points[c.workType] ?? 1;
    points.set(key, (points.get(key) ?? 0) + pts);

    taskCount.set(c.contributor, (taskCount.get(c.contributor) ?? 0) + 1);
    const bt = byType.get(c.contributor) ?? {};
    bt[c.workType] = (bt[c.workType] ?? 0) + 1;
    byType.set(c.contributor, bt);
  }

  // -------- walk deals, distribute the fee --------
  const workPkr = new Map<string, number>();     // memberId -> earned from 80% pool
  const awarePkr = new Map<string, number>();
  const mgmtPkr = new Map<string, number>();
  let grandTotal = 0;

  for (const deal of deals) {
    const fee = deal.feePkr;
    grandTotal += fee;

    const awarePool = (fee * splits.awarenessPct) / 100;
    const mgmtPool = (fee * splits.managementPct) / 100;
    const workPool = (fee * (100 - splits.awarenessPct - splits.managementPct)) / 100;

    const shareAware = awarePool / Math.max(1, awarenessMembers.length);
    for (const m of awarenessMembers) awarePkr.set(m.id, (awarePkr.get(m.id) ?? 0) + shareAware);

    const shareMgmt = mgmtPool / Math.max(1, managementMembers.length);
    for (const m of managementMembers) mgmtPkr.set(m.id, (mgmtPkr.get(m.id) ?? 0) + shareMgmt);

    // contributions on this deal's repo, grouped by workType
    const slice = new Map<string, Map<string, number>>(); // workType -> member -> points
    for (const c of contributions) {
      if (c.repo !== deal.repo) continue;
      if (!slice.has(c.workType)) slice.set(c.workType, new Map());
      const m = slice.get(c.workType)!;
      const pts = splits.points[c.workType] ?? 1;
      m.set(c.contributor, (m.get(c.contributor) ?? 0) + pts);
    }

    for (const [workType, memberPoints] of slice) {
      const sliceKey = SLICE_OF[workType as keyof Splits["work"]] ?? workType;
      const weight = splits.work[sliceKey as keyof Splits["work"]] ?? 0;
      if (weight === 0) continue;
      const totalPts = [...memberPoints.values()].reduce((a, b) => a + b, 0);
      const slicePkr = (workPool * weight) / 100;
      for (const [memberId, pts] of memberPoints) {
        const earned = (slicePkr * pts) / totalPts;
        workPkr.set(memberId, (workPkr.get(memberId) ?? 0) + earned);
        const ik = `${memberId}|${deal.ideaId}`;
        const prev = perIdeaPkr.get(ik) ?? { repo: deal.repo, pkr: 0 };
        prev.pkr += earned;
        perIdeaPkr.set(ik, prev);
      }
    }
  }

  // -------- build rows --------
  const rows: ValuationRow[] = members.map((m) => {
    const aware = awarePkr.get(m.id) ?? 0;
    const mgmt = mgmtPkr.get(m.id) ?? 0;
    const work = workPkr.get(m.id) ?? 0;
    const total = aware + mgmt + work;

    const ideaMap = new Map<string, { repo: string; pkr: number }>();
    for (const [key, v] of perIdeaPkr) {
      const [memberId, ideaId] = key.split("|");
      if (memberId !== m.id) continue;
      const prev = ideaMap.get(ideaId) ?? { repo: v.repo, pkr: 0 };
      prev.pkr += v.pkr;
      ideaMap.set(ideaId, prev);
    }
    const memberWorkTotal = [...ideaMap.values()].reduce((a, v) => a + v.pkr, 0);
    const perIdea = [...ideaMap.entries()]
      .map(([ideaId, v]) => ({
        ideaId,
        repo: v.repo,
        pct: memberWorkTotal > 0 ? (v.pkr / memberWorkTotal) * 100 : 0,
        pkr: v.pkr,
      }))
      .sort((a, b) => b.pkr - a.pkr);

    return {
      memberId: m.id,
      name: m.name,
      totalTasks: taskCount.get(m.id) ?? 0,
      byType: byType.get(m.id) ?? {},
      awarenessPkr: aware,
      managementPkr: mgmt,
      workPkr: work,
      totalPkr: total,
      perIdea,
    };
  });

  rows.sort((a, b) => b.totalPkr - a.totalPkr);
  return { errors, rows, grandTotalPkr: grandTotal };
}

export function formatPkr(n: number): string {
  return "₨ " + Math.round(n).toLocaleString("en-PK");
}
