# M1-T04 — Extended-state sync

**Goal:** Extend two-way sync to cover the rest of what PRINCIPLE-01 requires — nurture state, hot-alert status, call history, notes, and lead scores — closing the gap that made B-03 (nurture persistence) a blocker in M0.

**Depends on:** T02, T03.

## In scope

- Nurture-sequence state (M0's nurture placeholder / future nurture feature) synced to LACRM rather than reset on reload — this resolves B-03.
- Hot-alert status persisted so it survives reload and is consistent across devices/sessions.
- Call history (M0-T08) synced to LACRM so logged calls aren't lost to browser session state.
- Lead notes synced bidirectionally.
- Lead scores (and their per-criterion breakdown, from M0-T03) synced or reliably recomputable from synced inputs — Drew/Claude Code should decide whether the score itself is stored in LACRM or recalculated client-side from synced criteria data, and document the choice.

## Out of scope

- The Watchlist ("My List") — that's its own decision and task (T06).
- Conflict resolution mechanics (T05).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01 applies to every category listed here explicitly, not just lead records.
- Accessibility: any new sync-status indicators (e.g., "saved," "syncing") follow the existing live-region pattern.

## Acceptance criteria

- Logging a call, adding a note, or a nurture-state change all persist through LACRM and survive a reload or a different device/session.
- B-03 (nurture persistence) is resolved and can be removed from Known Issues.
- Lead scores remain accurate and consistent with M0-T03's model after the sync round-trip.

## How — Claude Code decides

Whether scores are stored or recomputed, and the specific sync mechanics for each data category, are Claude Code's call, within the constraints.

## References

- Spec v1.2: REQ-04 (expanded scope), REQ-10, PRINCIPLE-01, §5 Open Blockers (B-03)
- PROFORMA-STATE-v8.md: Known Issues / QA Notes (nurture-state persistence carried from prototype)
