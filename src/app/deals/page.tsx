import fs from "node:fs";
import path from "node:path";

import type { Deal, Transaction, Referral, Member } from "@/lib/types";
import { computeDealBalance, formatPkr, PLANS, CHANNEL_LABELS } from "@/lib/money";
import AddDealForm from "@/components/AddDealForm";

export const dynamic = "force-dynamic";

function load<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export default function DealsPage() {
  const deals = load<Deal[]>("deals.json", []);
  const txns = load<Transaction[]>("transactions.json", []);
  const referrals = load<Referral[]>("referrals.json", []);
  const members = load<Member[]>("ids.json", []);

  const rows = deals.map((d) => ({ deal: d, balance: computeDealBalance(d, txns) }));
  const totalFee = rows.reduce((a, r) => a + r.balance.feePkr, 0);
  const totalPaid = rows.reduce((a, r) => a + r.balance.paidPkr + r.balance.referralCreditPkr + r.balance.adjustmentPkr, 0);

  return (
    <main className="bar-container py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Deals
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {deals.length} deal{deals.length === 1 ? "" : "s"} ·{" "}
          {formatPkr(totalFee)} agreed · {formatPkr(totalPaid)} covered ·{" "}
          {formatPkr(Math.max(0, totalFee - totalPaid))} remaining across all deals
        </p>
      </header>

      <AddDealForm
        deals={deals}
        referrals={referrals}
        members={members}
      />

      <section className="panel mt-8 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Group / client</th>
              <th className="px-4 py-3">Ref #</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Remaining</th>
              <th className="px-4 py-3">Next due</th>
              <th className="px-4 py-3">Txns</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-text-muted" colSpan={9}>
                  No deals yet — register the first one with the form above.
                </td>
              </tr>
            )}
            {rows.map(({ deal, balance }) => (
              <tr key={deal.id}>
                <td className="px-4 py-3">
                  <span className="chip">{deal.id}</span>
                </td>
                <td className="px-4 py-3">
                  {deal.groupName}
                  <span className="text-text-muted"> · {deal.client}</span>
                </td>
                <td className="px-4 py-3 mono text-xs">{deal.referenceNo}</td>
                <td className="px-4 py-3" title={PLANS[deal.plan].blurb}>
                  P{deal.plan}
                </td>
                <td className="num px-4 py-3">{formatPkr(balance.feePkr)}</td>
                <td className="num px-4 py-3 text-emerald">
                  {formatPkr(balance.paidPkr + balance.referralCreditPkr + balance.adjustmentPkr)}
                </td>
                <td className="num px-4 py-3 font-semibold text-text-primary">
                  {formatPkr(balance.remainingPkr)}
                </td>
                <td className="num px-4 py-3">
                  {balance.nextDue
                    ? `#${balance.nextDue.seq} · ${formatPkr(balance.nextDue.amountPkr)}`
                    : "—"}
                </td>
                <td className="num px-4 py-3">{balance.txnCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-6 text-xs leading-relaxed text-text-muted">
        Saving = commit + push of <code className="text-cyan-accent">data/deals.json</code>{" "}
        (+ <code className="text-cyan-accent">transactions.json</code> /{" "}
        <code className="text-cyan-accent">referrals.json</code> when a referral
        redeems). Money channels: {Object.values(CHANNEL_LABELS).join(" · ")}.
      </footer>
    </main>
  );
}
