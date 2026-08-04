# M1-T01 — LACRM API client & field mapping

**Goal:** Build the API client/adapter that talks to Less Annoying CRM, and map SalesForge's lead fields to LACRM's fields so data can flow accurately in both directions.

**Depends on:** T00.

## In scope

- An LACRM API client (auth via T00's mechanism, read + write operations for leads/contacts).
- A field-mapping layer: SalesForge lead shape ↔ LACRM contact/lead shape, covering every category PRINCIPLE-01 names (lead records, pipeline stages, nurture state, scores, hot alert status, call history, notes).
- Pipeline stage name mapping — SalesForge's current stage vocabulary (New Lead, Contacted, Qualified, Proposal Sent, Quote Requested, Follow-Up, Sample Sent) reconciled against LACRM's confirmed stage names (B-01, resolved — see `M2-pipeline-nurture-persistence.md` for the ordered list and flagged ambiguities to resolve here rather than guess).
- Basic connectivity/auth error handling (e.g., invalid credential, rate limit) surfaced clearly, not silently swallowed.

## Out of scope

- Wiring this client into the app's store (T02).
- Resolving B-01 itself — Drew supplies the actual stage names; this task consumes them.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01: LACRM is the source of truth — the mapping layer must not silently drop or reinterpret data in a way that could diverge from LACRM's record.
- Stage-name reconciliation follows the resolution procedure spec v1.2 §5 already spells out for B-01: check the confirmed names against the app's current list; work out any mismatch at that point rather than guessing now.

## Acceptance criteria

- The client can read and write a real lead record to/from LACRM successfully.
- Every field category PRINCIPLE-01 lists has a defined mapping (not just lead records).
- Stage names used in sync exactly match LACRM's confirmed names (post-B-01), not the prototype-carried placeholder list.
- A connectivity/auth failure produces a clear, non-crashing error.

## How — Claude Code decides

LACRM API library/SDK choice (if any), the shape of the internal mapping representation, and error-handling mechanics are Claude Code's call, within the constraints.

## References

- Spec v1.2: PRINCIPLE-01, REQ-04, REQ-09, B-01 resolution procedure (§5)
- PROFORMA-STATE-v8.md: Open Blocker 1 (B-01), Key File Locations
