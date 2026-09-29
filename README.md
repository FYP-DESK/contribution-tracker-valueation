# contribution-tracker-valueation

**Who did what, where, when — what share it earns — and what was paid.**

The org-wide tracker for FYP Desk. Data files only in git (`data/`), a Next.js
+ TypeScript dashboard that reads them, and **no scripts**: work records arrive
by pasting a project repo's `contribution-history/payload.json` to an LLM agent
working in this repo — the protocol lives in [`AGENTS.md`](AGENTS.md).

## The money model (per deal)

```
fee ──┬── 10%  awareness    (fixed — the person who runs the client funnel)
      ├── 10%  management  (fixed — the person holding/leading the operation)
      └── 80%  work pool ── divided across slices by weight:
             env setup 5 · proposal 15 · proposal PPT 10 · 4-docs 30
             codebase 25 · final docs 10 · final PPT 5
```

Inside a slice, earnings are proportional to contribution points
(one guidance doc = 0.25 points, so 4 separate doc records equal one full
docs set). A slice with no contribution records stays undistributed — the
money is not redistributed to other slices. Edit weights in
`data/splits.json` if a deal overrides the default — the app validates that
the work weights sum to 100% of the work pool and shows config errors on
screen.

## The money interfaces (git-as-database)

Every form below **validates and generates the exact JSON** to paste into the
data file; saving = commit + push. The dashboard reflects it on next load.
An LLM agent in this repo can do the paste+validate+merge for you — give it
[`AGENTS.md`](AGENTS.md).

| Page | What it does |
|------|--------------|
| `/` | contribution table + earned PKR per member (read-only) |
| `/deals` | register a deal: group, reference number (`project#+group#+first-3-letters`), plan 1/2, fee, installment schedule, incoming referral |
| `/transactions` | select a deal → see its previous payments → add one: amount, channel (EasyPaisa / JazzCash / cash), auto-numbered seq per deal |
| `/referrals` | issue a deal's referral code (the deal's reference no), track single-use redemption, award 5% of the new deal's fee as a credit on the referrer's remaining payments |

## Referral rules (locked)

- Code = the issuing deal's `referenceNo`, e.g. `01-G2-HUJ`.
- **Single use**: once redeemed, a code can never be redeemed again.
- On redemption the **new** deal gets nothing discounted automatically — the
  **referrer's** remaining payments are reduced by 5% of the new deal's fee,
  booked as a `referral-credit` transaction on the referrer's deal.

## Data files (`data/` — the only place data lives)

| File | Content |
|------|---------|
| `ids.json` | members: id, display name, roles (`manager`, `awareness`, `member`), optional email |
| `splits.json` | the split model (weights + points) |
| `deals.json` | deals: id, ideaId, repo, groupName, referenceNo, client, plan, feePkr, installments, referralCodeUsed, status |
| `contributions.json` | imported work records (via payload paste) |
| `transactions.json` | money received: tx id, deal, per-deal seq, amount, channel, kind, recordedBy |
| `referrals.json` | referral codes: issuer, redemption state, single-use |

Validation lives in `src/lib/validate.ts` — every error names the file, the
record, the problem, and the exact fix (written so an LLM can act on it).

## The payload flow (replaces the old import script)

```
project repo: finish work → c(NNN).md + index row + regenerate contribution-history/payload.json
      │
      ▼  copy payload.json
tracker: paste to an LLM agent (AGENTS.md Protocol 1) → validate → merge into data/contributions.json
      │
      ▼  commit + push data/
dashboard shows the updated valuation
```

No scripts, no cross-repo paths, no OS-specific commands — works identically
on Windows and Linux.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

Deploy on Vercel for the read-only dashboard. The form pages generate JSON —
they never need server write access.

## Sibling repos

| Repo | Role |
|------|------|
| `fyp-ideas` | idea board — `IDEAS_INDEX.json` ids referenced by deals |
| `fyp-env-setup-development-team` | the kit every project repo is born from |
| `specilized-agents-skills-from-agency-agents` | 279 specialist agents via one curl |
