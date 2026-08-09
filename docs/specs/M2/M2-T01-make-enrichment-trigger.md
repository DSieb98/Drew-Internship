# M2-T01 — Make.com enrichment trigger scenario

**Goal:** Build the Make.com scenario that triggers Clay.com enrichment for a lead after intake (Stage 1) and before LACRM write (Stage 4) — Pipeline Stage 2→3 per Spec v1.2 §2.

**Depends on:** T00 (field schema), **T00a (credit guard — hard dependency, not optional)**.

**Owner:** Drew (Make.com, no-code).

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

## References

- Spec v1.2: §2 Pipeline Stages (Stage 2 — Automation & Import, Make.com orchestration), REQ-02
- M2-T00a (credit guard — hard dependency)
