# M1-T05 — Conflict resolution & "LACRM wins" handling

**Goal:** Define and implement what happens when SalesForge's local working state and LACRM's data disagree — network failures, concurrent edits, stale reads — so PRINCIPLE-01's "LACRM wins" rule is actually enforced in code, not just stated in the spec.

**Depends on:** T02, T03, T04 (touches the same sync code paths — build alongside those tasks rather than strictly after, per the M1 index's tight-coupling note).

## In scope

- A defined conflict-resolution strategy: when SalesForge's cached/local view of a lead differs from what LACRM currently holds, LACRM's version wins (PRINCIPLE-01), and the user is not silently shown stale data.
- Handling for offline/unreachable LACRM: what the user sees, what happens to pending writes (queued? blocked? clearly flagged as unsynced?).
- Retry/backoff behavior for failed writes, with a clear, announced failure state if retries are exhausted — never a silent data loss.
- A visible (not necessarily loud) indicator of sync state so Tim isn't left guessing whether his last action actually saved.

## Out of scope

- Building new sync categories — this task hardens the sync paths T03/T04 already built.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01 is explicit and non-negotiable here: "in any conflict between what SalesForge shows and what LACRM holds, LACRM wins."
- Accessibility: sync/error/retry states must be announced via the existing live-region pattern; a failed sync is never silent.

## Acceptance criteria

- A simulated conflict (local state vs. LACRM state differ) resolves to LACRM's version, and this is verifiable in a test/demo.
- A simulated offline/unreachable LACRM produces a clear, announced state — not a crash or silent failure.
- A failed write is retried per the chosen backoff strategy and, if it ultimately fails, is surfaced to the user rather than silently dropped.

## How — Claude Code decides

The specific retry/backoff parameters and how sync state is represented/surfaced in the UI are Claude Code's call, within the constraints.

## References

- Spec v1.2: PRINCIPLE-01
- M1-00-index.md: tight-coupling note
