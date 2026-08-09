# M2-T04 — Enrichment failure handling & visibility

**Goal:** Make sure a lead that fails enrichment, or hasn't been enriched yet because T00a's credit guard blocked it, is visibly flagged and queued for retry rather than silently scored on stale proxy data with no indication anything's pending.

**Depends on:** T01–T03.

**Owner:** Drew (Make.com retry logic) + Claude Code (SalesForge-side "enrichment pending" state).

## In scope

- **Make.com side (Drew):** a retry queue for leads whose enrichment call failed (API error, timeout) — per REQ-02's acceptance criteria, the pipeline continues rather than stalling, and the lead is queued for retry rather than dropped.
- **Make.com side (Drew):** leads blocked by T00a's credit guard (hard stop reached) are queued the same way — this is not a failure exactly, but functionally the same "not yet enriched, needs to happen later" state, and should reuse the same visibility mechanism rather than a separate one.
- **SalesForge side (Claude Code):** an "enrichment pending" indicator on a lead (in the lead card and/or drawer) so Tim can see that a lead's score is based on fallback data, not a silent gap. This must use the accessibility patterns already established (aria-live for state changes, not a silent visual-only badge) per PRINCIPLE-03.
- Distinguishing, if practical, "pending — queued for retry" from "pending — waiting on next month's free-tier credits" in the flagged state, since the second is a much longer wait and Tim/Drew may want to know which.

## Out of scope

- Building the retry queue's underlying mechanics (Make.com scenario internals) — implementation detail for Drew.
- Changing scoring logic itself — T03 already defines the fallback; this task only makes the fallback's cause visible.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-03: any new pending/retry state shown in SalesForge follows the existing live-region/announcement pattern — never a silent icon-only indicator.
- No PII in Make.com's retry-queue logging beyond what's operationally necessary.

## Acceptance criteria

- A simulated Clay API failure results in the lead appearing in a retry queue and, on next successful run, gets enriched without manual intervention.
- A lead blocked by T00a's hard stop shows the same "pending" treatment in SalesForge as a retry-queued lead, distinguishable by reason if feasible.
- Tim can identify, via JAWS, which of his leads are on fallback/proxy scoring vs. real enrichment data, without needing to open each lead individually to find out.

## How — Claude Code decides

The specific SalesForge-side component/indicator design (badge placement, aria-label wording, whether it's surfaced in the list view or only the drawer) is Claude Code's call within PRINCIPLE-03's constraints.

## References

- Spec v1.2: REQ-02 (acceptance criteria — "flagged and queued for retry, pipeline continues"), PRINCIPLE-03
- M2-T00a (credit guard — source of the "blocked by free tier" pending state)
- M2-T03 (fallback scoring this visibility state is describing)
