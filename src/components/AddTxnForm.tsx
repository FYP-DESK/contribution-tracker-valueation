"use client";

import { useMemo, useState } from "react";

import type { Deal, Transaction, Member } from "@/lib/types";
import { computeDealBalance } from "@/lib/money";
import {
  JsonBlock,
  CommitHint,
  Field,
  inputCls,
  today,
  nextId,
  type TxnJson,
} from "@/lib/client";

type Props = { deals: Deal[]; txns: Transaction[]; members: Member[] };

export default function AddTxnForm({ deals, txns, members }: Props) {
  const [dealId, setDealId] = useState("");
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState<"easypaisa" | "jazzcash" | "cash">("easypaisa");
  const [recordedBy, setRecordedBy] = useState(members[0]?.id ?? "");
  const [note, setNote] = useState("");

  const selected = deals.find((d) => d.id === dealId);
  const mine = useMemo(
    () => txns.filter((t) => t.dealId === dealId).sort((a, b) => a.seq - b.seq),
    [txns, dealId],
  );
  const balance = selected ? computeDealBalance(selected, txns) : null;
  const seq = (mine.at(-1)?.seq ?? 0) + 1;

  const issues: string[] = [];
  if (!dealId) issues.push("pick the deal this payment belongs to");
  const amountNum = parseInt(amount, 10);
  if (!Number.isFinite(amountNum) || amountNum <= 0)
    issues.push(`amount '${amount}' must be a positive number of PKR`);
  if (balance && Number.isFinite(amountNum) && amountNum > balance.remainingPkr)
    issues.push(
      `amount exceeds the remaining balance (${balance.remainingPkr} PKR) — if this is intentional (overpayment/fee change), record it as kind "adjustment" instead, or fix the deal's fee first`,
    );
  if (!recordedBy) issues.push("pick who recorded this (recordedBy)");

  const txnJson: TxnJson | null =
    !issues.length && selected
      ? {
          id: nextId(txns, "tx"),
          dealId: selected.id,
          seq,
          date: today(),
          amountPkr: amountNum,
          channel,
          kind: "payment",
          recordedBy,
          ...(note.trim() ? { note: note.trim() } : {}),
        }
      : null;

  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">Add a transaction</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Select the group, enter the amount they paid, hit generate — the
        transaction number is assigned automatically (1, 2, 3… per deal).
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Deal (group)">
          <select className={inputCls} value={dealId} onChange={(e) => setDealId(e.target.value)}>
            <option value="">— select a deal —</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} · {d.groupName} · ref {d.referenceNo}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount paid (PKR)">
          <input className={inputCls} type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" />
        </Field>
        <Field label="Channel">
          <select className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
            <option value="easypaisa">EasyPaisa</option>
            <option value="jazzcash">JazzCash</option>
            <option value="cash">Cash (hand-over)</option>
          </select>
        </Field>
        <Field label="Recorded by">
          <select className={inputCls} value={recordedBy} onChange={(e) => setRecordedBy(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Note (optional)">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 1st installment, via EasyPaisa" />
        </Field>
      </div>

      {selected && (
        <div className="panel-muted mt-4 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">{selected.groupName} — history</p>
          {balance && (
            <p className="mt-1">
              Fee {balance.feePkr.toLocaleString("en-PK")} · covered{" "}
              {(balance.paidPkr + balance.referralCreditPkr + balance.adjustmentPkr).toLocaleString("en-PK")} ·
              remaining <strong>{balance.remainingPkr.toLocaleString("en-PK")}</strong>
              {balance.nextDue
                ? ` · next planned slice #${balance.nextDue.seq}: ${balance.nextDue.amountPkr.toLocaleString("en-PK")}`
                : " · fully covered"}
            </p>
          )}
          {mine.length === 0 ? (
            <p className="mt-2 text-text-muted">
              No previous transactions — this will be transaction <strong>1</strong> on this deal.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {mine.map((t) => (
                <li key={t.id}>
                  <span className="chip mr-2">#{t.seq}</span>
                  {t.date} · {t.amountPkr.toLocaleString("en-PK")} PKR · {t.channel}
                  {t.kind !== "payment" ? ` · ${t.kind}` : ""}
                  {t.note ? ` · ${t.note}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-4 rounded border border-error bg-error-bg p-4 text-sm">
          <b className="text-error">Fix these first:</b>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-text-secondary">
            {issues.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      )}

      {txnJson && (
        <>
          <JsonBlock title="Append to data/transactions.json" json={txnJson} />
          <CommitHint file="transactions.json" />
        </>
      )}
    </section>
  );
}
