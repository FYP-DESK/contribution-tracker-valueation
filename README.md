# contribution-tracker-valueation

**Who did what, where, when — and what share it earns.**

The org-wide tracker for FYP Desk. Data files only in git (`data/`), a Next.js
+ TypeScript single-page dashboard that reads them, and an import script that
feeds from every project repo's `contribution-history/` module.

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

## Dashboard

One page, two tabs:

- **Contribution table** — contributor × total tasks, isolated per type
  (proposals, proposal PPTs, 4-docs sets, single docs, codebases, final docs,
  final PPTs), plus earned PKR. Click a row for the breakdown.
- **Totals** — contributor cards; click one to see which projects/ideas they
  contributed to, in percentage bars.

## Data files (`data/` — the only place data lives)

| File | Content |
|------|---------|
| `ids.json` | members: id, display name, roles (`manager`, `awareness`, `member`) |
| `splits.json` | the split model (weights + points) |
| `deals.json` | deals: id, ideaId, repo, client, feePkr |
| `contributions.json` | imported work records (append-only in practice) |

## Import flow (the loop)

1. A member finishes real work in a project repo → appends
   `contribution-history/cNNN.md` (+ row in its `index.md`) — see the kit's
   `instructions/contribution_history_instructions.md`.
2. Anyone runs:
   ```bash
   node scripts/import-contributions.mjs ../fyp-idea-01-zameenchain
   ```
   Unknown repos are auto-registered in `deals.json` with fee 0 — set the
   `ideaId`, `client`, and `feePkr` there once the deal is signed.
3. Commit + push `data/`. The dashboard reflects it on next load.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## Deploy (Vercel, free tier)

Import the repo, framework preset **Next.js**. The dashboard reads `data/*.json`
from the working directory — on Vercel, either commit the imported data (the
normal flow) or call the import script in CI before build.

## Sibling repos

| Repo | Role |
|------|------|
| `fyp-ideas` | idea board — `IDEAS_INDEX.json` ids referenced by deals |
| `fyp-env-setup-development-team` | the kit every project repo is born from |
| `specilized-agents-skills-from-agency-agents` | 279 specialist agents via one curl |
