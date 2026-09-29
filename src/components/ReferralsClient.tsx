"use client";

import { useState } from "react";

import type { Deal, Referral, Member } from "@/lib/types";
import {
  JsonBlock,
  CommitHint,
  Field,
  inputCls,
  today,
  type ReferralJson,
} from "@/lib/client";

type Props = { deals: Deal[]; referrals: Referral[]; members: Member[] };

export default function ReferralsClient({ deals, referrals, members }: Props) {
  const [issuerDealId, setIssuerDealId] = useState("");
  const [recordedBy, setRecordedBy] = useState(members[0]?.id ?? "");

  // --- issue ---
  const issuer = deals.find((d) => d.id === issuerDealId);
  const issueIssues: string[] = [];
  if (!issuer) issueIssues.push("pick the deal to issue the referral for");
  if (issuer && referrals.some((r) => r.referrerDealId === issuer.id))
    issueIssues.push(`deal '${issuer.id}' already has a referral record (one per deal)`);
  if (issuer && issuer.status === "dropped")
    issueIssues.push(`deal '${issuer.id}' is dropped — dropped deals cannot issue referrals`);
  if (!recordedBy) issueIssues.push("pick who recorded this");

  const referralJson: ReferralJson | null =
    !issueIssues.length && issuer
      ? {
          code: issuer.referenceNo,
          referrerDealId: issuer.id,
          createdAt: today(),
          redeemedByDealId: null,
          redeemedAt: null,
          status: "active",
          ...(issuer.groupName ? { note: `issued for ${issuer.groupName}` } : {}),
        }
      : null;

  // --- redeem check ---
  const [code, setCode] = useState("");
  const [newDealId, setNewDealId] = useState("");
  const trimmed = code.trim();
  const referral = referrals.find((r) => r.code === trimmed);
  const newDeal = deals.find((d) => d.id === newDealId);

  const redeemIssues: string[] = [];
  if (trimmed && !referral)
    redeemIssues.push(`referral code '${trimmed}' does not exist — check with the referrer; the code is their deal's reference number`);
  if (referral && (referral.status === "redeemed" || referral.redeemedByDealId))
    redeemIssues.push(`code '${referral.code}' is single-use and was already redeemed by '${referral.redeemedByDealId}' — it can never be used again`);
  if (trimmed && !newDealId)
    redeemIssues.push("pick the NEW deal that came in via the referral");
  if (referral && newDeal && referral.referrerDealId === newDeal.id)
    redeemIssues.push("a deal cannot redeem its own referral code");
  if (newDeal && newDeal.referralCodeUsed && newDeal.referralCodeUsed !== trimmed)
    redeemIssues.push(`deal '${newDeal.id}' already references another referral code ('${newDeal.referralCodeUsed}') — a deal comes in via at most one referral`);

  const award = newDeal && referral && !redeemIssues.length ? Math.round(newDeal.feePkr * 0.05) : 0;

  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">Issue a referral code</h2>
      <p className="mt-1 text-sm text-text-secondary">
        The code IS the deal&apos;s reference number — pick the deal, the code is
        generated. One referral record per deal.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Deal (referrer)">
          <select className={inputCls} value={issuerDealId} onChange={(e) => setIssuerDealId(e.target.value)}>
            <option value="">— select a deal —</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} · {d.groupName} · ref {d.referenceNo}
              </option>
            ))}
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
      {issuer && !issueIssues.length && (
        <p className="mt-3 text-sm text-text-secondary">
          Give this code to the group: <code className="mono rounded bg-bg-tertiary px-1.5 py-0.5 text-cyan-accent">{issuer.referenceNo}</code>{" "}
          — share it with the service info; whoever comes in with it triggers
          their 5% award.
        </p>
      )}
      {issueIssues.length > 0 && (
        <div className="mt-4 rounded border border-error bg-error-bg p-4 text-sm">
          <b className="text-error">Fix these first:</b>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-text-secondary">
            {issueIssues.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </div>
      )}
      {referralJson && (
        <>
          <JsonBlock title="Append to data/referrals.json" json={referralJson} />
          <CommitHint file="referrals.json" />
        </>
      )}

      <h2 className="mt-8 font-display text-lg font-bold">Redeem a code (when the referred group signs)</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Enter the code the new group brought. When valid, the code flips to
        redeemed and the referrer&apos;s deal receives a{" "}
        <code>referral-credit</code> of 5% of the new deal&apos;s fee — reducing
        what the referrer still owes. The /transactions page of the referrer&apos;s
        deal shows it as a negative line in their history.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Referral code">
          <input className={`${inputCls} mono`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 01-G2-HUJ" />
        </Field>
        <Field label="New deal (the referred group)">
          <select className={inputCls} value={newDealId} onChange={(e) => setNewDealId(e.target.value)}>
            <option value="">— select the new deal —</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} · {d.groupName}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {trimmed && redeemIssues.length === 0 && referral && newDeal && (
          <p className="mt-3 rounded border border-emerald bg-bg-secondary p-3 text-sm text-text-secondary">
          Valid. <strong>{formatPkr2(award)}</strong> (5% of {newDeal.id}&apos;s fee)
          will be credited to the referrer&apos;s deal{" "}
          <span className="chip">{referral.referrerDealId}</span>.
        </p>
      )}
      {redeemIssues.length > 0 && (
        <div className="mt-4 rounded border border-error bg-error-bg p-4 text-sm">
          <b className="text-error">Cannot redeem yet:</b>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-text-secondary">
            {redeemIssues.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </div>
      )}
      {trimmed && redeemIssues.length === 0 && referral && newDeal && (
        <>
          <JsonBlock
            title="Update data/referrals.json — flip this record to redeemed"
            json={{ ...referral, status: "redeemed", redeemedByDealId: newDeal.id, redeemedAt: today() }}
          />
          <JsonBlock
            title="Append to data/transactions.json — 5% credit on the referrer's deal"
            json={{
              id: "__next-tx-id__",
              dealId: referral.referrerDealId,
              seq: "__their-seq+1__" as unknown as number,
              date: today(),
              amountPkr: award,
              channel: "cash",
              kind: "referral-credit",
              recordedBy,
              note: `referral ${referral.code} redeemed by ${newDeal.id}`,
            }}
          />
          <CommitHint file="referrals.json (+ transactions.json)" />
        </>
      )}
    </section>
  );
}

function formatPkr2(n: number): string {
  return "₨ " + n.toLocaleString("en-PK");
}
