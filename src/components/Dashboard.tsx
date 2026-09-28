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
    <main className="bar-container py-10">
      {/* --- Page heading: Oxanium display, brand subheading --- */}
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Contribution Tracker &amp; Valuation
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {rows.length} contributors · {deals.length} deal{deals.length === 1 ? "" : "s"} ·
          grand total <strong className="text-certainty-blue">{formatPkr(grandTotalPkr)}</strong> ·
          append-only data from each repo&apos;s{" "}
          <code className="text-cyan-accent">contribution-history/</code>
        </p>
      </header>

      {/* --- Segmented control: brand plan-tab pattern --- */}
      <nav className="mb-6 flex gap-2">
        {(["table", "totals"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`segment ${tab === t ? "active" : ""}`}
          >
            {t === "table" ? "Contribution table" : "Totals"}
          </button>
        ))}
      </nav>

      {/* --- Split config errors: brand error token --- */}
      {errors.length > 0 && (
        <div className="mb-6 rounded border border-error bg-error-bg p-4 text-sm text-text-secondary">
          <b className="text-error">Split config errors:</b>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {tab === "table" && (
        <section className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
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
                  className="cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">{r.name}</td>
                  <td className="num px-4 py-3">{r.totalTasks}</td>
                  {Object.keys(TYPE_LABELS).map((k) => (
                    <td key={k} className="num px-3 py-3 text-text-muted">
                      {r.byType[k] ?? 0}
                    </td>
                  ))}
                  <td className="num px-4 py-3 text-right font-semibold text-emerald">
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
          <p className="mb-3 text-sm text-text-secondary">
            {rows.length} contributors — click one to see which projects/ideas they
            contributed to, in percentage.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {rows.map((r) => (
              <button
                key={r.memberId}
                type="button"
                onClick={() => setSelected(selected === r.memberId ? null : r.memberId)}
                className={`panel p-4 text-left transition ${
                  selected === r.memberId
                    ? "border-certainty-blue"
                    : "hover:border-certainty-blue"
                }`}
              >
                <div className="text-sm font-medium text-text-primary">{r.name}</div>
                <div className="mt-1 text-xs text-text-muted">{r.totalTasks} tasks</div>
                <div className="mt-2 font-display text-lg font-bold text-emerald">
                  {formatPkr(r.totalPkr)}
                </div>
                <div className="mt-1 text-xs text-text-muted">
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
          <section className="panel mt-6 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">{r.name}</h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  {r.totalTasks} tasks · {formatPkr(r.totalPkr)} total
                  {" "}(work {formatPkr(r.workPkr)} + awareness {formatPkr(r.awarenessPkr)}
                  {" "}+ management {formatPkr(r.managementPkr)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn btn-secondary !px-3 !py-1 !text-xs"
              >
                Close
              </button>
            </div>

            <h3 className="mt-4 text-xs uppercase tracking-wide text-text-muted">
              Contribution by idea (share of all work earnings)
            </h3>
            {r.perIdea.length === 0 ? (
              <p className="mt-2 text-sm text-text-secondary">
                No work earnings recorded yet — records are imported from each
                project repo&apos;s <code className="text-cyan-accent">contribution-history/</code>.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {r.perIdea.map((i) => (
                  <div key={i.ideaId}>
                    <div className="flex justify-between text-sm">
                      <span>
                        <span className="chip">{i.ideaId}</span>{" "}
                        <span className="text-text-muted">({i.repo})</span>
                      </span>
                      <span className="text-text-secondary">
                        {i.pct.toFixed(1)}% · {formatPkr(i.pkr)}
                      </span>
                    </div>
                    <div className="bar-track mt-1.5">
                      <div
                        className="bar-fill"
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

      <footer className="mt-10 text-xs leading-relaxed text-text-muted">
        Split model per deal: awareness {10}% (fixed) + management {10}% (fixed) +
        work pool {80}% divided across slices (proposal, PPT, 4 docs, code, final
        docs, final PPT). Source of truth: each project repo&apos;s{" "}
        <code className="text-cyan-accent">contribution-history/</code> — imported by{" "}
        <code className="text-cyan-accent">npm run import</code>. Data files live in{" "}
        <code className="text-cyan-accent">data/</code> (append-only in practice).
      </footer>
    </main>
  );
}
