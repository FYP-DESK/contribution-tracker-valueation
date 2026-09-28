"use client";

import { useState } from "react";
import type { ValuationRow, Deal } from "@/lib/types";
import { formatPkr } from "@/lib/valuation";

type Props = {
  rows: ValuationRow[];
  deals: Deal[];
  errors: string[];
  grandTotalPkr: number;
};

const TYPE_LABELS: Record<string, string> = {
  "environment-setup": "Env setup",
  proposal: "Proposals",
  "proposal-ppt": "Proposal PPTs",
  "codebase-guidance-docs": "4-docs sets",
  "codebase-guidance-doc": "Single docs",
  "codebase-development": "Codebases",
  "final-documentation": "Final docs",
  "final-ppt": "Final PPTs",
};

export default function Dashboard({ rows, deals, errors, grandTotalPkr }: Props) {
  const [tab, setTab] = useState<"table" | "totals">("table");
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#dbe4ee]">
          FYP Desk — Contribution Tracker &amp; Valuation
        </h1>
        <p className="mt-1 text-sm text-mut">
          {rows.length} contributors · {deals.length} deal{deals.length === 1 ? "" : "s"} ·
          grand total {formatPkr(grandTotalPkr)} · append-only data from each repo&apos;s
          {" "}
          <code className="text-accent2">contribution-history/</code>
        </p>
      </header>

      <nav className="mb-6 flex gap-2">
        {(["table", "totals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-4 py-1.5 text-sm transition ${
              tab === t
                ? "border-accent bg-[#182231] text-[#dbe4ee]"
                : "border-line bg-panel text-mut hover:text-[#dbe4ee]"
            }`}
          >
            {t === "table" ? "Contribution table" : "Totals"}
          </button>
        ))}
      </nav>

      {errors.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          <b>Split config errors:</b>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {tab === "table" && (
        <section className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-mut">
                <th className="px-4 py-3">Contributor</th>
                <th className="px-4 py-3">Total tasks</th>
                {Object.entries(TYPE_LABELS).map(([k, label]) => (
                  <th key={k} className="px-3 py-3" title={k}>
                    {label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Earned</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.memberId}
                  onClick={() => setSelected(selected === r.memberId ? null : r.memberId)}
                  className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-[#182231]"
                >
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.totalTasks}</td>
                  {Object.keys(TYPE_LABELS).map((k) => (
                    <td key={k} className="px-3 py-3 text-mut">
                      {r.byType[k] ?? 0}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-semibold text-ok">
                    {formatPkr(r.totalPkr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "totals" && (
        <section>
          <p className="mb-3 text-sm text-mut">
            {rows.length} contributors — click one to see which projects/ideas they
            contributed to, in percentage.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {rows.map((r) => (
              <button
                key={r.memberId}
                onClick={() => setSelected(selected === r.memberId ? null : r.memberId)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected === r.memberId
                    ? "border-accent bg-[#182231]"
                    : "border-line bg-panel hover:border-accent"
                }`}
              >
                <div className="text-sm font-medium">{r.name}</div>
                <div className="mt-1 text-xs text-mut">{r.totalTasks} tasks</div>
                <div className="mt-2 text-lg font-semibold text-ok">
                  {formatPkr(r.totalPkr)}
                </div>
                <div className="mt-1 text-xs text-mut">
                  {r.perIdea.length} idea{r.perIdea.length === 1 ? "" : "s"}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {selected && (() => {
        const r = rows.find((x) => x.memberId === selected);
        if (!r) return null;
        return (
          <section className="mt-6 rounded-xl border border-line bg-panel p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">{r.name}</h2>
                <p className="mt-0.5 text-xs text-mut">
                  {r.totalTasks} tasks · {formatPkr(r.totalPkr)} total
                  {" "}(work {formatPkr(r.workPkr)} + awareness {formatPkr(r.awarenessPkr)}
                  {" "}+ management {formatPkr(r.managementPkr)})
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md border border-line px-3 py-1 text-xs text-mut hover:text-[#dbe4ee]"
              >
                Close
              </button>
            </div>

            <h3 className="mt-4 text-xs uppercase tracking-wide text-mut">
              Contribution by idea (share of all work earnings)
            </h3>
            {r.perIdea.length === 0 ? (
              <p className="mt-2 text-sm text-mut">
                No work earnings recorded yet — records are imported from each
                project repo&apos;s <code className="text-accent2">contribution-history/</code>.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {r.perIdea.map((i) => (
                  <div key={i.ideaId}>
                    <div className="flex justify-between text-sm">
                      <span>
                        <span className="text-accent2">{i.ideaId}</span>{" "}
                        <span className="text-mut">({i.repo})</span>
                      </span>
                      <span>
                        {i.pct.toFixed(1)}% · {formatPkr(i.pkr)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-line">
                      <div
                        className="h-2 rounded-full bg-accent"
                        style={{ width: `${Math.min(100, i.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      <footer className="mt-10 text-xs leading-relaxed text-mut">
        Split model per deal: awareness {10}% (fixed) + management {10}% (fixed) +
        work pool {80}% divided across slices (proposal, PPT, 4 docs, code, final
        docs, final PPT). Source of truth: each project repo&apos;s{" "}
        <code className="text-accent2">contribution-history/</code> — imported by{" "}
        <code className="text-accent2">npm run import</code>. Data files live in{" "}
        <code className="text-accent2">data/</code> (append-only in practice).
      </footer>
    </main>
  );
}
