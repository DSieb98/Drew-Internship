# M0-T08 — Call logging & Call History (gap G2)

**Goal:** Let Tim record the outcome of a call and review his call history, so the work he does on
the phone is captured rather than lost.

**Depends on:** T04 / T05 (the "log a call" / "mark as called" entry points).

> **Note:** the spec only ever treats "call history" as data that REQ-04 must sync — it never
> specifies the logging UI (gap G2 in `../00-development-plan.md` §6). It's built in the
> prototype and included in M0; in M1 this logged activity becomes LACRM-synced.

## In scope

- A "log a call" flow capturing date, duration, outcome (e.g., positive / neutral / no answer /
  negative), and free-text notes for a given lead.
- A "mark as called" indicator on a lead so Tim can see at a glance who he's already reached.
- A **Call History** view listing past calls with their details, linkable back to the lead.
- Logging a call updates the lead's "called" indicator and surfaces a confirmation announcement.

## Out of scope

- Syncing call activity to LACRM (M1).
- Auto-detecting calls — logging is manual.

## Constraints

- Project-wide constraints (`../00-development-plan.md` §3).
- Accessibility: the log-call form is a focus-trapped, fully-labeled dialog; outcome selection is
  operable via keyboard; the History list uses list semantics; the confirmation is announced.

## Acceptance criteria

- A logged call appears in Call History with all its fields and links back to the lead.
- Marking/logging a call updates the lead's "called" indicator everywhere it appears.
- The whole flow is operable with JAWS only.

## How — Claude Code decides

Form design, how the log and "called" state are represented (in-memory for M0), and the History
layout are yours, within the constraints.

## References

- Spec v1.2: REQ-04 (call history as synced data, later); gap analysis G2
- Prototype: `LogCallModal`, `CallHistoryPage`, `callLog`, `calledIds` (reference only)
