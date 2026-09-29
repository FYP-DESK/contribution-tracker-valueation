"use client";

// Client-side helpers shared by the form pages (/deals, /transactions,
// /referrals). These pages are git-as-database: forms validate + generate the
// exact JSON to paste into data/*.json; saving = commit + push.

import { useState } from "react";

export type DealJson = {
  id: string;
  ideaId: string;
  repo: string;
  groupName: string;
  referenceNo: string;
  client: string;
  plan: 1 | 2;
  feePkr: number;
  installments: Array<{ seq: number; amountPkr: number }>;
  referralCodeUsed: string | null;
  status: "active" | "completed" | "dropped";
  createdAt: string;
  notes?: string;
};

export type TxnJson = {
  id: string;
  dealId: string;
  seq: number;
  date: string;
  amountPkr: number;
  channel: "easypaisa" | "jazzcash" | "cash";
  kind: "payment" | "referral-credit" | "adjustment";
  recordedBy: string;
  note?: string;
};

export type ReferralJson = {
  code: string;
  referrerDealId: string;
  createdAt: string;
  redeemedByDealId: string | null;
  redeemedAt: string | null;
  status: "active" | "redeemed";
  note?: string;
};

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nextId(items: Array<{ id: string }>, prefix: string): string {
  let max = 0;
  for (const it of items) {
    const m = /^([a-z]+)-(\d{3,})$/.exec(it.id ?? "");
    if (m && m[1] === prefix) max = Math.max(max, parseInt(m[2], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export function makeReferenceNo(
  projectNo: number,
  groupNo: number,
  clientName: string,
): string {
  const letters = (clientName.replace(/[^a-zA-Z]/g, "") + "XXX")
    .slice(0, 3)
    .toUpperCase();
  return `${String(projectNo).padStart(2, "0")}-G${groupNo}-${letters}`;
}

/** A copy-to-clipboard JSON block with a heading. */
export function JsonBlock({ title, json }: { title: string; json: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(json, null, 2);
  return (
    <div className="panel-muted mt-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {title}
        </h3>
        <button
          type="button"
          className="btn btn-secondary !px-3 !py-1 !text-xs"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              },
              () => undefined,
            );
          }}
        >
          {copied ? "Copied ✓" : "Copy JSON"}
        </button>
      </div>
      <pre className="mono mt-2 max-h-72 overflow-auto rounded border border-border bg-bg-primary p-3 text-xs text-text-secondary">
        {text}
      </pre>
    </div>
  );
}

/** The commit instruction every form shows under its JSON block. */
export function CommitHint({ file }: { file: string }) {
  return (
    <p className="mt-2 text-xs leading-relaxed text-text-muted">
      Paste into <code className="text-cyan-accent">data/{file}</code> (append to
      the array, never delete existing records), then{" "}
      <strong className="text-text-secondary">commit + push</strong>. Or paste
      this JSON to an LLM agent in the tracker repo —{" "}
      <code className="text-cyan-accent">AGENTS.md</code> tells it how to
      validate and merge it.
    </p>
  );
}

export const inputCls =
  "w-full rounded border border-border-strong bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-certainty-blue";

export const labelCls =
  "block text-xs font-semibold uppercase tracking-wide text-text-muted";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
