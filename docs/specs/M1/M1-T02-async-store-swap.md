# M1-T02 — Async store swap

**Goal:** Replace M0's in-memory store with an LACRM-backed store behind the same async contract, so no other component in the app has to change.

**Depends on:** T00, T01.

> **Note:** M0 was deliberately built so this swap wouldn't require rewriting features. Per PROFORMA-STATE-v8.md, M0-T02's confirm path already "calls store.importLeads() (async, matches existing AppStore contract — no component change needed at M1 store swap)." This task is where that groundwork pays off.

## In scope

- A new store implementation satisfying the existing AppStore async contract, backed by T01's LACRM client instead of in-memory state.
- Read-through and write-through behavior: the app's working state is populated from LACRM on load, and writes flow back to LACRM through T01's client.
- Loading and error states for network-dependent operations that didn't need them when the store was purely in-memory.

## Out of scope

- The specific sync logic for each data category (lead records/stages in T03; nurture/alerts/history/notes/scores in T04) — this task delivers the swapped store shell and contract; T03/T04 fill in what it syncs.
- Conflict resolution (T05).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- The public component/hook interface the rest of the app already uses against the M0 store must not change in ways that force other components to be edited — that was the entire point of building it as an async contract in M0.
- Accessibility: any new loading/error states introduced by real network calls (vs. instant in-memory reads) must be announced via the existing live-region pattern, not silent spinners.

## Acceptance criteria

- Every M0 feature (import, scoring, Today/All Leads, lead drawer, map, watchlist, call logging, settings) continues to work unmodified against the new store.
- Data loads from LACRM on app start and reflects real LACRM state, not stale in-memory defaults.
- A write (e.g., logging a call) round-trips to LACRM and is reflected back.
- Network/loading states are announced appropriately, not silent.

## How — Claude Code decides

Internal store implementation (state management approach, caching strategy) is Claude Code's call, within the constraint that the existing public contract doesn't change.

## References

- PROFORMA-STATE-v8.md: "What was built this session" (T02 confirm-path note), Tech Stack ("In-memory store only in M0 — async contract, ready for M1 LACRM swap")
- Spec v1.2: PRINCIPLE-01
