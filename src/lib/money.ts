// Money engine — pure functions over deals + transactions + referrals.
// PKR only. No I/O.

import type {
  Deal,
  Transaction,
  Referral,
  DealBalance,
  Channel,
  PlanId,
  Installment,
  Member,
} from "./types";

export const PLANS: Record<PlanId, { name: string; blurb: string }> = {
  1: { name: "Plan 1 — The Builder", blurb: "Rs 10,000 · guidance kit, docs, the student builds" },
  2: { name: "Plan 2 — The Guided", blurb: "Rs 30,000 standard · full delivery + training" },
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  easypaisa: "EasyPaisa",
  jazzcash: "JazzCash",
  cash: "Cash (hand-over)",
};

// -------------------------------------------------------------- installment plans

export function defaultInstallments(plan: PlanId, offer: boolean): Installment[] {
  if (plan === 1) {
    if (offer) {
      // Plan 1 launch-offer: 20,000 in 4 slices of 5,000
      return [1, 2, 3, 4].map((seq) => ({ seq, amountPkr: 5000 }));
    }
    // Plan 1 standard: 10,000 = 4,000 + 4,000 + 2,000
    return [
      { seq: 1, amountPkr: 4000 },
      { seq: 2, amountPkr: 4000 },
      { seq: 3, amountPkr: 2000 },
    ];
  }
  // Plan 2: 30,000 in six installments of 5,000 (launch offer keeps the same
  // six-slice rhythm but totals 20,000 → the caller adjusts the fee + slices)
  const n = offer ? 4 : 6;
  const fee = offer ? 20000 : 30000;
  const per = Math.round(fee / n);
  const out: Installment[] = Array.from({ length: n }, (_, i) => ({
    seq: i + 1,
    amountPkr: per,
  }));
  // absorb rounding into the last slice
  const sum = out.reduce((a, i) => a + i.amountPkr, 0);
  out[out.length - 1].amountPkr += fee - sum;
  return out;
}

// -------------------------------------------------------------- balances

export function computeDealBalance(deal: Deal, txns: Transaction[]): DealBalance {
  const mine = txns
    .filter((t) => t.dealId === deal.id)
    .sort((a, b) => a.seq - b.seq);
  const sumKind = (kind: Transaction["kind"]) =>
    mine.filter((t) => t.kind === kind).reduce((a, t) => a + t.amountPkr, 0);

  const paidPkr = sumKind("payment");
  const referralCreditPkr = sumKind("referral-credit");
  const adjustmentPkr = sumKind("adjustment");
  const remainingPkr = Math.max(
    0,
    deal.feePkr - paidPkr - referralCreditPkr - adjustmentPkr,
  );

  // next due: walk the planned installments against payments received so far
  let cursor = paidPkr + referralCreditPkr + adjustmentPkr;
  let nextDue: DealBalance["nextDue"] = null;
  for (const inst of [...deal.installments].sort((a, b) => a.seq - b.seq)) {
    if (cursor <= 0) {
      nextDue = { seq: inst.seq, amountPkr: inst.amountPkr };
      break;
    }
    cursor -= inst.amountPkr;
    if (cursor < 0) {
      nextDue = { seq: inst.seq, amountPkr: -cursor };
      break;
    }
  }

  return {
    dealId: deal.id,
    feePkr: deal.feePkr,
    paidPkr,
    referralCreditPkr,
    adjustmentPkr,
    remainingPkr,
    txnCount: mine.length,
    nextDue,
  };
}

// -------------------------------------------------------------- referrals

// Reference number = project number + group number + first 3 letters of the
// client name, e.g. project 01, group 2, HUJIed → "01-G2-HUJ".
export function makeReferenceNo(
  projectNo: number,
  groupNo: number,
  clientName: string,
): string {
  const letters = (clientName.replace(/[^a-zA-Z]/g, "") + "XXX")
    .slice(0, 3)
    .toUpperCase();
  const p = String(projectNo).padStart(2, "0");
  return `${p}-G${groupNo}-${letters}`;
}

export type ReferralCheck =
  | { ok: true; referral: Referral }
  | { ok: false; reason: string; fix: string };

export function checkReferralUsable(
  code: string,
  referrals: Referral[],
  deals: Deal[],
): ReferralCheck {
  const r = referrals.find((x) => x.code === code);
  if (!r)
    return {
      ok: false,
      reason: `referral code '${code}' does not exist`,
      fix: "check the code with the referrer — it is their deal's reference number",
    };
  if (r.status === "redeemed" || r.redeemedByDealId)
    return {
      ok: false,
      reason: `referral code '${code}' was already used (redeemed ${r.redeemedAt ?? "earlier"} by deal ${r.redeemedByDealId})`,
      fix: "a referral code is single-use — the new deal proceeds without the 5% award",
    };
  const issuer = deals.find((d) => d.id === r.referrerDealId);
  if (!issuer)
    return {
      ok: false,
      reason: `the issuing deal '${r.referrerDealId}' no longer exists`,
      fix: "remove the referral record or point it at a live deal",
    };
  if (issuer.status === "dropped")
    return {
      ok: false,
      reason: `the issuing deal '${issuer.id}' is dropped`,
      fix: "referral codes from dropped deals cannot be redeemed",
    };
  return { ok: true, referral: r };
}

// The 5% award: 5% of the NEW deal's fee, booked as a referral-credit
// transaction on the REFERRER's deal (reduces what the referrer still owes).
export function referralAwardPkr(newDealFeePkr: number): number {
  return Math.round(newDealFeePkr * 0.05);
}

export function formatPkr(n: number): string {
  return "₨ " + Math.round(n).toLocaleString("en-PK");
}

export function memberName(members: Member[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? id;
}
