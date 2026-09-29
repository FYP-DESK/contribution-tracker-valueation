import fs from "node:fs";
import path from "node:path";

import type { Deal, Referral, Member } from "@/lib/types";
import { formatPkr } from "@/lib/money";
import ReferralsClient from "@/components/ReferralsClient";

export const dynamic = "force-dynamic";

function load<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export default function ReferralsPage() {
  const deals = load<Deal[]>("deals.json", []);
  const referrals = load<Referral[]>("referrals.json", []);
  const members = load<Member[]>("ids.json", []);
  const dealById = new Map(deals.map((d) => [d.id, d]));

  const active = referrals.filter((r) => r.status === "active").length;
  const redeemed = referrals.filter((r) => r.status === "redeemed").length;

  return (
    <main className="bar-container py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Referrals — the awareness offer
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-secondary">
          After every deal, we make the awareness offer: tell your friends about
          the service, share the service info plus your referral number, and when
          they avail the service you win a{" "}
          <strong className="text-text-primary">5% discount</strong> — booked as a
          credit that reduces your remaining payments. Rules: the referral code{" "}
          <strong>is</strong> the deal&apos;s reference number
          (project#+group#+first 3 letters of the client), and it is{" "}
          <strong>single-use</strong> — one code, one redemption, never repeated.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          {referrals.length} code{referrals.length === 1 ? "" : "s"} · {active} active ·{" "}
          {redeemed} redeemed
        </p>
      </header>

      <ReferralsClient deals={deals} referrals={referrals} members={members} />

      <section className="panel mt-8 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Referrer deal</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Redeemed by</th>
              <th className="px-4 py-3">5% award (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {referrals.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-text-muted" colSpan={6}>
                  No referral codes yet — issue one from the deal&apos;s reference
                  number with the form above.
                </td>
              </tr>
            )}
            {referrals.map((r) => {
              const newDeal = r.redeemedByDealId ? dealById.get(r.redeemedByDealId) : undefined;
              const award = newDeal ? Math.round(newDeal.feePkr * 0.05) : null;
              return (
                <tr key={r.code}>
                  <td className="px-4 py-3 mono text-xs">{r.code}</td>
                  <td className="px-4 py-3">
                    <span className="chip">{r.referrerDealId}</span>
                  </td>
                  <td className="px-4 py-3">{r.createdAt}</td>
                  <td className="px-4 py-3">
                    {r.status === "active" ? (
                      <span className="font-semibold text-emerald">active</span>
                    ) : (
                      <span className="text-text-muted">redeemed {r.redeemedAt ?? ""}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.redeemedByDealId ?? "—"}</td>
                  <td className="num px-4 py-3">{award !== null ? formatPkr(award) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
