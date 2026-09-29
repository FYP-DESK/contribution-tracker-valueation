# AGENTS.md — how an LLM agent works in this repo

This repo is **git-as-database**: there are no write endpoints and no import
scripts. Every change to `data/*.json` happens by **editing the JSON file and
committing** — usually done by you, the LLM agent, after validating what a team
member pasted. Windows, Linux, macOS — identical steps, no shell commands, no
paths outside this repo.

## The golden rules

1. **Validate before writing.** Every paste is checked with the rules in
   `src/lib/validate.ts` (the TypeScript there is the spec — mirror it exactly).
2. **Never guess an id.** Member ids come from `data/ids.json`. Deal ids are
   `deal-NNN` (zero-padded, next free number). Transaction ids are `tx-NNN`
   (global, zero-padded). Work-record ids come from the payload.
3. **Descriptive errors are mandatory.** When validation fails, reply with one
   block per error: **file → record → problem → fix**, where `fix` lists the
   exact valid values (see the error style in `src/lib/validate.ts`). Never say
   just "invalid input".
4. **Show the diff, then stop.** After merging into a data file, print the
   exact JSON you changed and tell the member to commit + push. Do not commit
   yourself unless explicitly asked.
5. **Append-only mindset.** Never delete records. Fix by superseding: correct
   the fields, keep the id. `transactions.json` and `referrals.json` records are
   never rewritten — a mistake is fixed with an `adjustment` transaction.

## Protocol 1 — ingest a contribution payload

A member pastes the `contribution-history/payload.json` from a project repo.

1. Read `data/ids.json` and `data/contributions.json`.
2. Validate the payload: `schema === "fyp-desk.contribution-payload/1"`, repo
   and idea_id present, and for every record: id matches `c\d{3,}`, contributor
   exists in ids.json, work_type is one of
   `environment-setup | proposal | proposal-ppt | codebase-guidance-docs | codebase-guidance-doc | codebase-development | final-documentation | final-ppt`,
   date is `YYYY-MM-DD`, status is `complete`, and repo+id is not already
   imported.
3. **If any error:** stop. Reply with the descriptive error block(s) and the
   fix. Do not write anything.
4. **If clean:** append every record to `data/contributions.json` as
   ```json
   {
     "id": "c001", "date": "2026-09-28", "contributor": "huji",
     "workType": "proposal", "ideaId": "IDEA-001",
     "repo": "fyp-idea-01-zameenchain", "status": "complete",
     "summary": "…", "evidence": ["…"], "hours": 3
   }
   ```
   (camelCase in this file; the payload's snake_case `work_type`/`idea_id`
   become `workType`/`ideaId`.)
5. Print the merged records and say: *"commit + push `data/contributions.json`
   to publish the valuation."*

## Protocol 2 — register a deal

A member gives: group name, project number, group number, client name, plan
(1 or 2), fee (PKR), planned installments, optional referral code they came in
with, date.

1. Read `data/deals.json` for the next free `deal-NNN`.
2. Compute `referenceNo` = `makeReferenceNo()` from `src/lib/money.ts`:
   project#+group#+first-3-letters of the client, e.g. project 01, group 2,
   HUJIed → `01-G2-HUJ`. It must be unique across deals.
3. If a referral code was given: check it in `data/referrals.json` — must exist,
   must be `active` (not redeemed), issuer deal must not be dropped. If it
   fails, report the reason + fix and proceed **without** the referral.
4. Build the record:
   ```json
   {
     "id": "deal-001", "ideaId": "IDEA-001",
     "repo": "fyp-idea-01-zameenchain",
     "groupName": "…", "referenceNo": "01-G2-HUJ",
     "client": "…", "plan": 2, "feePkr": 20000,
     "installments": [{ "seq": 1, "amountPkr": 5000 }],
     "referralCodeUsed": null,
     "status": "active", "createdAt": "2026-09-29"
   }
   ```
   Installments must sum to feePkr (any slice sizes are allowed — the service
   accepts flexible payments).
5. If the referral was usable: create the redemption —
   - set the new deal's `referralCodeUsed` to the code,
   - flip the referral's `status` to `"redeemed"`, set `redeemedByDealId` to
     the new deal id and `redeemedAt` to today,
   - append a credit transaction on the **referrer's** deal (Protocol 3):
     `kind: "referral-credit"`, `amountPkr` = 5% of the new deal's fee
     (`referralAwardPkr()`), note = `referral <code> redeemed by <new deal id>`.
6. Print the new deal + any referral changes and ask for commit + push.

## Protocol 3 — record a transaction (money received)

A member gives: the deal (dropdown → deal id), the amount, the channel
(`easypaisa | jazzcash | cash`), optional note, date.

1. Read `data/transactions.json`. `tx-NNN` = next free global number.
2. `seq` = (transactions on this deal) + 1. Print the previous transactions of
   this deal in your reply so the member sees the running history.
3. Append:
   ```json
   {
     "id": "tx-001", "dealId": "deal-001", "seq": 1,
     "date": "2026-09-29", "amountPkr": 5000,
     "channel": "easypaisa", "kind": "payment",
     "recordedBy": "akash", "note": "1st installment"
   }
   ```
4. Print the deal's new balance: fee − paid − referral-credit − adjustment =
   remaining, and the next planned installment due (per
   `computeDealBalance()` in `src/lib/money.ts`). Ask for commit + push.

## Protocol 4 — issue a referral

A member asks to issue the referral for a deal.

1. The code IS the deal's `referenceNo`. In `data/referrals.json` append:
   ```json
   {
     "code": "01-G2-HUJ", "referrerDealId": "deal-001",
     "createdAt": "2026-09-29", "status": "active",
     "redeemedByDealId": null, "redeemedAt": null
   }
   ```
2. One deal has at most one referral record; a code redeems exactly once
   (enforced again by Protocol 2 step 3).

## Valid member ids

Always read them fresh from `data/ids.json`. As of 2026-09-29:
`akash, behzad, abdullah, umair, huji`.
