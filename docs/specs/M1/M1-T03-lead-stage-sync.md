# M1-T03 — Lead records + pipeline stage sync

**Goal:** Make lead records and pipeline stage genuinely two-way synced with LACRM — the core of REQ-04 plus REQ-09's stage tracking.

**Depends on:** T02.

## In scope

- Two-way sync of lead records: creates, updates, and stage changes made in SalesForge write to LACRM; changes in LACRM (or by other reps) are reflected back in SalesForge.
- REQ-09 stage tracking using LACRM's confirmed stage names (from T01), not the prototype-carried placeholder list.
- Handling for a lead that exists in LACRM but was never imported through SalesForge (M0-T02), and vice versa, per the resolution procedure already defined in spec v1.2 §5 for reconciling stage-name mismatches.

## Out of scope

- Nurture state, hot-alert status, call history, notes, and score sync — T04.
- Conflict resolution mechanics — T05 (this task assumes the happy path; T05 handles what happens when SalesForge and LACRM disagree).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- **Hard block: cannot proceed until B-01 is resolved.** Do not hand this task to Claude Code with placeholder/unconfirmed stage names.
- PRINCIPLE-01: in any disagreement, LACRM's data wins (full conflict handling in T05, but this task's basic sync direction must respect that priority).

## Acceptance criteria

- Creating or editing a lead in SalesForge is reflected in LACRM.
- A stage change in SalesForge writes the correct LACRM stage name.
- A change made directly in LACRM appears in SalesForge on next sync/load.
- Stage names displayed anywhere in the app exactly match LACRM's real names — no leftover prototype placeholder names.

## How — Claude Code decides

Sync trigger mechanism (on-save, polling, webhook if LACRM supports it) and internal reconciliation logic are Claude Code's call, within the constraints.

## References

- Spec v1.2: REQ-04, REQ-09, B-01 resolution procedure (§5), PRINCIPLE-01
- PROFORMA-STATE-v8.md: Open Blocker 1
