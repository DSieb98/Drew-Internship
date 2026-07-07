# M0-T07 — Watchlist / "My List" (gap G1)

**Goal:** Give Tim a personal shortlist: pin any lead he wants to keep an eye on, attach a private
note to each, and see how many he's pinned and their total potential value.

**Depends on:** T01, T04 (pin control lives on lead cards / surfaces).

> **Note:** this is the "Watchlist" that was the one unresolved comment in the v1.2 review. It's
> defined here for the first time (gap G1 in `../00-development-plan.md` §6). Whether pins/notes
> sync to LACRM is an open M1 question (master plan open question 4); in M0 they're in-memory.

## In scope

- Pin/unpin **any** lead regardless of status (hot, warm, or cold) from the lead surfaces.
- A dedicated "My List" view showing only pinned leads.
- A **private per-lead note** Tim can add and edit on each pinned lead.
- A summary: count of pinned leads and a **total potential value as a dollar sum** (DV-01 specifies
  the Watchlist total stays a dollar figure even though individual leads show High/Medium/Low).
- An empty state that tells Tim how to pin leads.

## Out of scope

- Syncing pins/notes to LACRM (M1 decision).

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- DV-01: individual leads use the High/Medium/Low label, but the Watchlist total is a dollar sum.
- Accessibility: pin state is announced ("pinned"/"not pinned"); the private-note editor is fully
  operable and labeled; the summary reads clearly to JAWS.

## Acceptance criteria

- Any lead can be pinned/unpinned and immediately appears/disappears in My List.
- A private note saves, persists for the M0 session, and is announced when present.
- The summary shows the correct pinned count and the correct dollar-sum total.

## How — Claude Code decides

How pinning and notes are stored (in-memory for M0) and how the view is laid out are yours, within
the constraints.

## References

- Spec v1.2: DV-01 ("Watchlist total remains a dollar sum"), §11 changelog (open Watchlist comment)
- Prototype: `TimHotListPage`, `watchlist` state, `togglePin`, `updatePinNote` (reference only)
