# M3 — Nurture Engine: task breakdown

This folder splits milestone **M3** into discrete tasks. M3 covers **REQ-10 (Nurture Sequence)**
— the 4-touch nurture engine, its LACRM-backed persistence, and closing open blocker **B-03**.

## Numbering note — read this first

The milestone numbers in this repo do not match the original top-level plan documents 1:1, and
this folder is the reason why. Recorded here so a future session doesn't have to re-derive it:

- The **original** top-level plan (`docs/specs/M2-pipeline-nurture-persistence.md` /
  `M3-enrichment-automation.md`) had **M2 = pipeline stages + nurture persistence** and
  **M3 = Clay.com enrichment + Make.com orchestration**.
- **M1-T03** absorbed the pipeline-stage half of old-M2 (REQ-09) early, as a byproduct of B-01
  landing during M1. That part of old-M2 is done and was never rebuilt as a separate folder.
- The **nurture-persistence half of old-M2 (REQ-10, B-03) was not built.** M1-T04's own writeup
  says so explicitly: *"B-03 stays open; M2 builds the engine and closes it there."* Somewhere in
  an Aug 2026 rescoping (confirmed with Drew, referenced in `docs/specs/M2/M2-00-index.md`), the
  `docs/specs/M2/` folder was pointed at old-M3's content (Clay enrichment) instead, and picked up
  an incorrect note claiming REQ-10 was "already built into M1-T04" — it wasn't. That
  rescoping is real (Drew confirmed it, and `docs/specs/M2/` is genuinely mid-flight against Clay)
  but it silently orphaned the nurture-engine milestone rather than renumbering it.
- **This folder (`docs/specs/M3/`) is that orphaned milestone**, filed under the number Drew used
  for it when asking for it directly (2026-08-10) rather than reopened under "M2" (already taken)
  or left permanently unnumbered. Scope is old-M2's REQ-10 content — nothing from old-M3's Clay
  content, which stays exactly where `docs/specs/M2/` already has it.

**Practical effect: there is no scope collision.** `docs/specs/M2/` = Clay/Make.com enrichment
(blocked on Drew's T00a threshold sign-off). `docs/specs/M3/` (this folder) = the nurture engine
(unblocked, buildable now — no Drew dependency).

## Why this milestone exists

REQ-10 needs somewhere real for nurture state to live, and a real touch-approval UI — today
`NurturePage` is still M0's bare "coming later" placeholder, and B-03 (nurture persistence) has
been open since before M1. LACRM sync (M1) and the AI-drafting infrastructure (M1-T00's Worker,
already used by `LeadDrawer`'s call-opener/next-steps/email-draft tabs) are both already built —
this milestone's job is the nurture-specific data model, persistence, and UI on top of them.

## Build order

| Task | Name | Covers | Depends on |
| :-- | :-- | :-- | :-- |
| **T01** | Nurture touch engine (data model, LACRM sync, UI) | REQ-10, B-03 | M1 (LACRM sync) |

Sized as a single task rather than split further — the data model, sync, and UI are tightly
coupled enough (same `Lead` fields, same custom-field encode/decode, same page) that splitting
them would mean passing an unstable shape between tasks for no real benefit. See
`M3-T01-nurture-engine.md` for the full spec and the "Decision & what was built" writeup.

## What "done" means for M3

A Cold lead that's gone quiet (past `Settings.nurtureSilenceDays`) can be enrolled in the 4-touch
nurture sequence from the Nurture page; each touch shows an AI-drafted, editable draft Tim
approves, edits, or skips; progress persists across reload and devices via LACRM (closing B-03);
a lead whose score/status improves out of Cold is no longer treated as active nurture without any
extra step; and Tim can promote a nurtured lead to Warm with one action that actually changes its
real status everywhere (not a UI-only toggle — there's no legacy `promoteModal` bug in this
rebuild since nothing like it existed here to begin with, but the fix this task's acceptance
criteria implicitly requires — "promoting changes real status everywhere" — is built correctly
from the start).

## References

- Spec v1.2: REQ-10, B-03
- `docs/specs/M2-pipeline-nurture-persistence.md` — original spec content this folder implements
- `docs/specs/M1/M1-T04-extended-state-sync.md` — where B-03 was deferred from
- `docs/specs/M2/M2-00-index.md` — where the rescoping/orphaning happened (see its own note,
  cross-referenced from here)
