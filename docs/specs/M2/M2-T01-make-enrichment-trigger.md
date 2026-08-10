# M2-T01 — Make.com enrichment trigger scenario

**Goal:** Build the Make.com scenario that triggers Clay.com enrichment for a lead after intake (Stage 1) and before LACRM write (Stage 4) — Pipeline Stage 2→3 per Spec v1.2 §2.

**Depends on:** T00 (field schema), **T00a (credit guard — hard dependency, not optional)**.

**Owner:** Drew (Make.com, no-code).

**Status (2026-08-10):** T00 is done and its schema is confirmed (below). **T00a is not** — its hard-stop/warning thresholds are a placeholder pending Drew's sign-off (see `M2-T00a-clay-credit-guard.md`). Since T01's own acceptance criteria requires "the scenario checks T00a's guard... in a live test," this scenario **cannot be built or accepted yet** — there's no guard to call. What's below is prep only: T00's confirmed schema written into a build-ready shape, so building the scenario is unblocked the moment T00a is signed off.

## In scope

- A Make.com scenario watching for newly-imported leads (Stage 1 output) and calling Clay.com's enrichment API/workflow for each.
- **Calling T00a's guard before every enrichment call** — this scenario must check the credit counter and respect the hard stop/warning threshold, not fire enrichment calls unconditionally. This is the primary integration point where the guard actually takes effect; T00a defines the logic, this task wires it into the real trigger path.
- Passing enriched results forward to T02 (LACRM write-back) rather than storing them only within Make.com.
- Basic per-call error handling (Clay API timeout, invalid response) — full retry/queue behavior is T04's scope, but this task shouldn't crash or silently drop a lead on a single failed call.

## Out of scope

- The credit-guard logic itself (T00a) — this task consumes it.
- Writing enriched data into LACRM's actual record structure (T02).
- Retry queue and "enrichment pending" visibility in SalesForge (T04).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- **Must not bypass T00a's guard under any circumstance**, including manual re-runs or backfills — the guard exists specifically because free-tier credits are easy to burn accidentally via re-runs.
- No PII logged to Make.com's execution history beyond what's operationally necessary (aligns with the project's PII-first logging posture from the Claude Code environment setup doc).

## Acceptance criteria

- A new lead imported through M0-T02 triggers exactly one enrichment call (not zero, not duplicated).
- The scenario checks T00a's guard before calling Clay and honors both the warning and hard-stop thresholds in a live test.
- A simulated Clay API failure (timeout or error response) does not crash the scenario or silently lose the lead — it's visibly flagged for T04 to pick up.
- Enriched results are available to T02 in a structured, documented shape (matching T00's schema).

## How — Claude Code decides

Not applicable — Make.com no-code scenario, Drew's build. Claude Code's involvement, if any, is limited to reviewing scenario logic descriptions Drew shares, not building the scenario itself.

## Build reference (Clay call shape, confirmed by T00 testing)

For when T00a unblocks this — what the per-lead Clay call needs to do, from T00's two-row test:

| Field | Clay source | Type | Notes for the Make.com module |
| :-- | :-- | :-- | :-- |
| Employee count | structured lookup | number | 1 credit/action, reliable on both public and non-public leads |
| Revenue | structured lookup | number, **raw dollars** (not bucketed) | 1 credit/action; scoring's $25M+ check needs a comparison, not a lookup table |
| Industry | structured lookup | **NAICS code string** (e.g. `336111`), not plain text | 1 credit/action; pass through as-is — do not attempt to map to text in this scenario, that's T03's problem (flagged gap, see T00) |
| Has Marketing Dept | Claygent (AI Web Researcher) | Yes/No + free-text reason | Variable cost, ~5–10 credits depending on lead obscurity — this is the expensive call, budget-guard math should weight it heaviest |
| Has Events | Claygent, same call as above | Yes/No + free-text reason | Bundled with Has Marketing Dept in one Claygent call in T00's test — confirm whether Make.com should keep them bundled (cheaper, one round-trip) or split |

**Not part of this call at all** (per T00's flagged gaps — do not build a Clay lookup for these, they don't exist): order frequency (S-07) and promo purchase history (S-06). Both come from LACRM's own order history, wired in T02/T03, not from Clay.

**Per-call cost to assume for the guard check:** worst case 13 credits/lead (T00's observed max, on the *less* famous lead) — the guard-check step (in scope above) should reserve headroom for this, not the free tier's theoretical 3-credit floor.

## References

- Spec v1.2: §2 Pipeline Stages (Stage 2 — Automation & Import, Make.com orchestration), REQ-02
- M2-T00a (credit guard — hard dependency)
- M2-T00 (confirmed field schema and flagged gaps — full detail behind the build reference above)
