import fs from "node:fs";
import path from "node:path";

import type { Deal, Transaction, Member } from "@/lib/types";
import { computeDealBalance, formatPkr, CHANNEL_LABELS } from "@/lib/money";
import AddTxnForm from "@/components/AddTxnForm";

export const dynamic = "force-dynamic";

function load<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export default function TransactionsPage() {
  const deals = load<Deal[]>("deals.json", []);
  const txns = load<Transaction[]>("transactions.json", []);
  const members = load<Member[]>("ids.json", []);

  const byDeal = new Map<string, Transaction[]>();
  for (const t of txns) {
    const list = byDeal.get(t.dealId) ?? [];
    list.push(t);
    byDeal.set(t.dealId, list);
  }
  const dealById = new Map(deals.map((d) => [d.id, d]));
  const rows = [...byDeal.entries()].sort(([a], [b]) => a.localeCompare(b));
  const totalIn = txns.filter((t) => t.kind === "payment").reduce((a, t) => a + t.amountPkr, 0);

  return (
    <main className="bar-container py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Transactions
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {txns.length} transaction{txns.length === 1 ? "" : "s"} ·{" "}
          {formatPkr(totalIn)} received in payments · any installment size is
          accepted (the plan is a guide, not a gate)
        </p>
      </header>

      <AddTxnForm deals={deals} txns={txns} members={members} />

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-text-muted">
          Nothing recorded yet — pick a deal above and add the first payment.
        </p>
      ) : (
        rows.map(([dealId, list]) => {
          const deal = dealById.get(dealId);
          const balance = deal ? computeDealBalance(deal, txns) : null;
          const sorted = [...list].sort((a, b) => a.seq - b.seq);
          return (
            <section key={dealId} className="panel mt-6 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg font-bold">
                  <span className="chip mr-2">{dealId}</span>
                  {deal ? `${deal.groupName} · ${deal.client}` : "unknown deal"}
                </h2>
                {balance && (
                  <p className="text-sm text-text-secondary">
                    {formatPkr(balance.paidPkr + balance.referralCreditPkr + balance.adjustmentPkr)}{" "}
                    of {formatPkr(balance.feePkr)} · remaining{" "}
                    <strong className="text-text-primary">{formatPkr(balance.remainingPkr)}</strong>
                    {balance.nextDue
                      ? ` · next planned slice #${balance.nextDue.seq}: ${formatPkr(balance.nextDue.amountPkr)}`
                      : " · fully covered"}
                  </p>
                )}
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Channel</th>
                      <th className="px-3 py-2">Kind</th>
                      <th className="px-3 py-2">Recorded by</th>
                      <th className="px-3 py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((t) => (
                      <tr key={t.id}>
                        <td className="num px-3 py-2">{t.seq}</td>
                        <td className="px-3 py-2">{t.date}</td>
                        <td className="num px-3 py-2 font-semibold text-emerald">
                          {formatPkr(t.amountPkr)}
                        </td>
                        <td className="px-3 py-2">{CHANNEL_LABELS[t.channel] ?? t.channel}</td>
                        <td className="px-3 py-2">{t.kind}</td>
                        <td className="px-3 py-2">{t.recordedBy}</td>
                        <td className="px-3 py-2 text-text-muted">{t.note ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
