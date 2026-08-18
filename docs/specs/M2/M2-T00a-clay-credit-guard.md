# M2-T00a — Clay.com free-tier credit guard

**Goal:** Build a hard usage guard around Clay.com's free tier (100 Data Credits + 500 Actions/month, ~5–30 enrichable leads/month depending on waterfall depth) so the enrichment trigger (T01) cannot silently overrun the free plan and start a paid tier or fail mid-month with no warning.

**Depends on:** T00 (account/schema must exist to know real per-lead credit cost).

**Owner:** Drew (Make.com config + Clay.com dashboard), with the guard's *logic* documented here so T01 is built against it rather than bolted on after.

> **Reality check for scope:** at 100 credits/month and an estimated 3–20 credits per fully-enriched lead (industry + revenue + buying signals + order frequency + employee count, waterfalled across providers), the free tier supports roughly 5–30 leads/month, not the full lead volume the business-goal figures in Spec v1.2 (25–50 qualified leads/month) imply. This guard makes that ceiling explicit and enforced rather than something Drew discovers via a surprise bill or a mid-month outage.

## In scope

- A running count of Clay credits/Actions consumed this billing month, checked before every enrichment call.
- A **hard stop**: once consumption crosses a configurable ceiling, no further enrichment calls fire until the next billing cycle. Leads that would have been enriched instead get flagged (feeds into T04's "enrichment pending" state) rather than silently skipped.
- A **warning threshold** below the hard stop that notifies Drew — email or a Make.com notification, whichever is lower-effort — so there's lead time before the hard stop engages, not just a stop with no warning.

  > **⚠️ PROVISIONAL — not yet confirmed by Drew.** Original recommendation (90 hard-stop / 70 warning) was sized against a 3–20 credit/lead estimate. T00 testing (2026-08-10) confirmed real cost is 8–13 credits/lead — at that rate 90/70 leaves only ~2 leads of runway between warning and stop. Placeholder below widens that buffer until Drew decides (may want to loop in Greg per D-05's original tool-approval owner). **Do not treat these numbers as final** — confirm before T01 is built against them, since acceptance criteria requires Drew's sign-off regardless.
  >
  > **Placeholder default: hard stop = 80 credits, warning = 55 credits** (~2.5 leads of runway, bigger reserve below the 100-credit cap in case a single lead spikes past 13 credits).
- Deduplication: never re-enrich a lead that already has current Clay data. Re-running enrichment on the same lead (e.g., due to a retry loop or duplicate trigger) burns credits for no new information — this alone can be the difference between the guard mattering and not.
- Where the count lives: since there's no backend server in this stack (M1-T00 covers the credential-proxy exception, not a general app server), the simplest option is Make.com's own scenario-run history/data store, or a lightweight counter table Make.com writes to on each successful call. Document whichever is chosen.

## Out of scope

- Upgrading to a paid Clay tier — this task's entire purpose is staying on free. If Drew later decides to pay, that's a new decision (new D-##), not this task.
- The enrichment trigger scenario itself (T01) — this task defines the guard T01 must call before it fires, not the trigger logic.
- Make.com's own operation limits — that's a separate free-tier concern (flagged in M2-00-index as out of scope per your prior answer: Clay-only for now).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- The guard must fail closed: if the credit counter itself is unreachable or errors, treat that as "assume near the limit" and block new enrichment calls rather than assume budget is available and risk an overrun.
- No silent skipping — every lead that doesn't get enriched because of the guard must be visibly flagged (T04), never just quietly left with stale/proxy data and no indication why.

## Acceptance criteria

- A real test run demonstrates the hard stop actually prevents a Clay API call once the ceiling is reached (not just a log message after the fact).
- The warning threshold notification fires and reaches Drew before the hard stop engages, verified with a test.
- Re-enrichment of an already-enriched lead is blocked/skipped without consuming a credit.
- Drew has reviewed and confirmed the threshold numbers (placeholder: 80 hard stop / 55 warning, pending — see note above) or set his own. **Not yet met as of 2026-08-10** — placeholder only, not confirmed.

## How — Claude Code decides

Not applicable — this is Make.com configuration, not SalesWhiz repo code. If any SalesWhiz-side surfacing of "enrichment paused — free tier limit reached" is needed (vs. per-lead "pending"), that's covered under T04, not here.

## References

- Clay.com pricing (Aug 2026): Free tier = 100 Data Credits + 500 Actions/month, 200-row table limit
- Spec v1.2: REQ-02, business goal figures (§0 Purpose & Scope — 25–50 qualified leads/month target, which this guard's ceiling falls well short of on free tier)
