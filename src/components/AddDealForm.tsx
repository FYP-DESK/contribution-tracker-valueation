"use client";

import { useMemo, useState } from "react";

import type { Deal, Referral, Member, Installment } from "@/lib/types";
import { PLANS } from "@/lib/money";
import {
  JsonBlock,
  CommitHint,
  Field,
  inputCls,
  today,
  nextId,
  makeReferenceNo,
  type DealJson,
} from "@/lib/client";

type Props = { deals: Deal[]; referrals: Referral[]; members: Member[] };

type Issue = { problem: string; fix: string };

export default function AddDealForm({ deals, referrals, members }: Props) {
  const [groupName, setGroupName] = useState("");
  const [client, setClient] = useState("");
  const [projectNo, setProjectNo] = useState("1");
  const [groupNo, setGroupNo] = useState("1");
  const [ideaId, setIdeaId] = useState("IDEA-001");
  const [repo, setRepo] = useState("");
  const [plan, setPlan] = useState<1 | 2>(2);
  const [offer, setOffer] = useState(true);
  const [fee, setFee] = useState("20000");
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [recordedBy, setRecordedBy] = useState(members[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  const referenceNo = useMemo(() => {
    const p = parseInt(projectNo, 10);
    const g = parseInt(groupNo, 10);
    if (!Number.isFinite(p) || !Number.isFinite(g) || !client.trim()) return "";
    return makeReferenceNo(p, g, client);
  }, [projectNo, groupNo, client]);

  const applyPlanDefaults = (p: 1 | 2, isOffer: boolean) => {
    setPlan(p);
    setOffer(isOffer);
    if (p === 1 && !isOffer) setFee("10000");
    if (p === 1 && isOffer) setFee("20000");
    if (p === 2 && !isOffer) setFee("30000");
    if (p === 2 && isOffer) setFee("20000");
    setInstallments([]);
  };

  const autoInstallments = () => {
    const f = parseInt(fee, 10) || 0;
    if (f <= 0) return;
    if (plan === 1 && !offer) {
      setInstallments([
        { seq: 1, amountPkr: 4000 },
        { seq: 2, amountPkr: 4000 },
        { seq: 3, amountPkr: 2000 },
      ]);
    } else {
      const n = plan === 1 ? 4 : 6;
      const per = Math.round(f / n);
      const out = Array.from({ length: n }, (_, i) => ({ seq: i + 1, amountPkr: per }));
      out[n - 1].amountPkr += f - per * n; // rounding into the last slice
      setInstallments(out);
    }
  };

  const issues: Issue[] = [];
  const feeNum = parseInt(fee, 10);
  if (!groupName.trim()) issues.push({ problem: "groupName is empty", fix: "enter the FYP group's name/label" });
  if (!client.trim()) issues.push({ problem: "client is empty", fix: "enter the contact person's name (also feeds the reference number)" });
  if (!referenceNo) issues.push({ problem: "referenceNo cannot be generated", fix: "project number + group number must be integers and client must not be empty" });
  if (deals.some((d) => d.referenceNo === referenceNo))
    issues.push({ problem: `referenceNo '${referenceNo}' already exists`, fix: "reference numbers are unique — change the group number or client" });
  if (!repo.trim()) issues.push({ problem: "repo is empty", fix: "project repo name, e.g. 'fyp-idea-01-zameenchain'" });
  if (!/^(IDEA-)\d{3}$/.test(ideaId)) issues.push({ problem: `ideaId '${ideaId}' does not look like IDEA-NNN`, fix: "take it from fyp-ideas IDEAS_INDEX.json, e.g. IDEA-001" });
  if (!Number.isFinite(feeNum) || feeNum <= 0) issues.push({ problem: `fee '${fee}' is not a positive number`, fix: "fee in PKR, e.g. 20000" });
  const instSum = installments.reduce((a, i) => a + (i.amountPkr || 0), 0);
  if (installments.length === 0)
    issues.push({ problem: "no installments planned", fix: "add at least one slice, or press 'Auto-split from plan' — slices must sum to the fee" });
  else if (Number.isFinite(feeNum) && instSum !== feeNum)
    issues.push({ problem: `installments sum to ${instSum} but the fee is ${feeNum}`, fix: "make the slices sum to the fee (any slice sizes are allowed)" });
  let referralError: Issue | null = null;
  let referral: Referral | undefined;
  if (referralCode.trim()) {
    referral = referrals.find((r) => r.code === referralCode.trim());
    if (!referral) referralError = { problem: `referral code '${referralCode.trim()}' does not exist`, fix: "check with the referrer — the code is their deal's reference number" };
    else if (referral.status === "redeemed" || referral.redeemedByDealId) referralError = { problem: `referral code '${referral.code}' is single-use and was already redeemed`, fix: "proceed without the referral (leave the field empty)" };
    if (referralError) issues.push(referralError);
  }
  if (!recordedBy) issues.push({ problem: "recordedBy is empty", fix: `pick a member id: ${members.map((m) => m.id).join(", ")}` });

  const dealJson: DealJson | null =
    issues.length === 0 && referenceNo
      ? {
          id: nextId(deals, "deal"),
          ideaId,
          repo: repo.trim(),
          groupName: groupName.trim(),
          referenceNo,
          client: client.trim(),
          plan,
          feePkr: feeNum,
          installments: installments.map((i, idx) => ({ seq: idx + 1, amountPkr: i.amountPkr })),
          referralCodeUsed: referral ? referral.code : null,
          status: "active",
          createdAt: today(),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }
      : null;

  const award = dealJson && referral ? Math.round(dealJson.feePkr * 0.05) : 0;

  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-bold">Register a deal</h2>
      <p className="mt-1 text-sm text-text-secondary">
        The reference number is the referral code: <strong>project#+group#+first 3 letters of the client</strong>.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Group name">
          <input className={inputCls} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. GCS-7A Group 2" />
        </Field>
        <Field label="Client (contact person)">
          <input className={inputCls} value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. HUJIed" />
        </Field>
        <Field label="Reference number (auto)">
          <input className={`${inputCls} mono`} value={referenceNo} readOnly placeholder="01-G2-HUJ" />
        </Field>
        <Field label="Project #">
          <input className={inputCls} type="number" min={1} value={projectNo} onChange={(e) => setProjectNo(e.target.value)} />
        </Field>
        <Field label="Group #">
          <input className={inputCls} type="number" min={1} value={groupNo} onChange={(e) => setGroupNo(e.target.value)} />
        </Field>
        <Field label="Idea id">
          <input className={`${inputCls} mono`} value={ideaId} onChange={(e) => setIdeaId(e.target.value.toUpperCase())} />
        </Field>
        <Field label="Project repo">
          <input className={inputCls} value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="fyp-idea-01-zameenchain" />
        </Field>
        <Field label="Recorded by">
          <select className={inputCls} value={recordedBy} onChange={(e) => setRecordedBy(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
            ))}
          </select>
        </Field>
        <Field label="Fee (PKR)">
          <input className={inputCls} type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {([1, 2] as const).map((p) => (
          <button key={p} type="button" className={`segment ${plan === p ? "active" : ""}`} onClick={() => applyPlanDefaults(p, offer)}>
            {PLANS[p].name}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={offer} onChange={(e) => applyPlanDefaults(plan, e.target.checked)} />
          launch offer (20,000)
        </label>
        <button type="button" className="btn btn-secondary !py-1.5" onClick={autoInstallments}>
          Auto-split from plan
        </button>
      </div>
      <p className="mt-1 text-xs text-text-muted">{PLANS[plan].blurb}</p>

      <div className="mt-4">
        <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Installment plan (editable — any slice sizes)
        </span>
        <div className="mt-2 space-y-2">
          {installments.length === 0 && (
            <p className="text-sm text-text-muted">No slices yet — press “Auto-split from plan” or add manually.</p>
          )}
          {installments.map((inst, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="chip">#{i + 1}</span>
              <input
                className={`${inputCls} !w-40`}
                type="number"
                min={0}
                value={inst.amountPkr}
                onChange={(e) => {
                  const next = [...installments];
                  next[i] = { seq: i + 1, amountPkr: parseInt(e.target.value, 10) || 0 };
                  setInstallments(next);
                }}
              />
              <button
                type="button"
                className="btn btn-secondary !px-3 !py-1 !text-xs"
                onClick={() => setInstallments(installments.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="btn btn-secondary !px-3 !py-1 !text-xs"
            onClick={() => setInstallments([...installments, { seq: installments.length + 1, amountPkr: 1000 }])}
          >
            + Add slice
          </button>
          <span className="self-center text-xs text-text-muted">
            Sum: {formatNum(instSum)} / {formatNum(feeNum || 0)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Referral code they came in with (optional)">
          <input className={`${inputCls} mono`} value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="e.g. 01-G2-HUJ" />
        </Field>
        <Field label="Notes (optional)">
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      {referral && !referralError && (
        <p className="mt-3 rounded border border-emerald bg-bg-secondary p-3 text-sm text-text-secondary">
          Referral <code className="text-cyan-accent">{referral.code}</code> is
          usable. On save, it flips to <strong>redeemed</strong> and{" "}
          <strong>{formatNum(award)} PKR (5%)</strong> is booked as a{" "}
          <code>referral-credit</code> on the referrer&apos;s deal{" "}
          <span className="chip">{referral.referrerDealId}</span> (reduces their
          remaining payments). The JSON below includes both records.
        </p>
      )}

      {issues.length > 0 && (
        <div className="mt-4 rounded border border-error bg-error-bg p-4 text-sm">
          <b className="text-error">Fix these first:</b>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-text-secondary">
            {issues.map((it, i) => (
              <li key={i}>
                <strong>{it.problem}</strong> — {it.fix}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dealJson && (
        <>
          <JsonBlock title={`Append to data/deals.json`} json={dealJson} />
          {referral && (
            <JsonBlock
              title={`Then update data/referrals.json — flip this record to redeemed`}
              json={{
                ...referral,
                status: "redeemed",
                redeemedByDealId: dealJson.id,
                redeemedAt: today(),
              }}
            />
          )}
          {referral && (
            <JsonBlock
              title={`Then append to data/transactions.json — 5% credit on the referrer's deal`}
              json={{
                id: "__next-tx-id__",
                dealId: referral.referrerDealId,
                seq: "__their-seq+1__",
                date: today(),
                amountPkr: award,
                channel: "cash",
                kind: "referral-credit",
                recordedBy,
                note: `referral ${referral.code} redeemed by ${dealJson.id}`,
              }}
            />
          )}
          <CommitHint file="deals.json" />
        </>
      )}
    </section>
  );
}

function formatNum(n: number): string {
  return n.toLocaleString("en-PK");
}
