# M7 — Nurture Engine: task breakdown

This folder splits milestone **M7** into discrete tasks. M7 covers **REQ-10 (Nurture Sequence)**
— the 4-touch nurture engine, its LACRM-backed persistence, and closing open blocker **B-03**.

## Numbering note — read this first

This milestone was originally filed as `docs/specs/M3/` (2026-08-10, see that folder's own former
numbering note, preserved in git history at commit `8305bdd`). It moved here because Drew
reactivated the *original* top-level M3 (Instantly.ai email automation, REQ-05/06 — deferred
since 2026-06 per D-04, un-deferred 2026-08-10) and that folder now holds that content instead.
Renumbering rather than deleting: this spec documents real, already-shipped, live-verified code
(commits `2f85924`/`8305bdd`; `Lead.nurtureEnrolled`/`nurtureTouches`/etc. in
`src/store/types.ts`; `NurturePage.tsx`, `NurtureTouchDialog.tsx`; 4 live LACRM custom fields;
decisions D-27/D-27a/b/c in `CLAUDE.md`) — it does not stop being true just because a different
task later claimed its old number. **M7 is the next open milestone number as of 2026-08-10** (M0–M6
all already assigned — M4's folder is currently mid-resolution against a separate M4/M5 scope
question, unrelated to this move).

**Practical effect:** `docs/specs/M3/` = Instantly.ai email automation (reactivated, REQ-05/06).
`docs/specs/M7/` (this folder) = the nurture engine (complete, shipped, unaffected by the M3
repurposing — nothing here changed, only its folder number and cross-references).

## Why this milestone exists

REQ-10 needed somewhere real for nurture state to live, and a real touch-approval UI — `NurturePage`
was M0's bare "coming later" placeholder, and B-03 (nurture persistence) had been open since before
M1. LACRM sync (M1) and the AI-drafting infrastructure (M1-T00's Worker, already used by
`LeadDrawer`'s call-opener/next-steps/email-draft tabs) were both already built — this milestone's
job was the nurture-specific data model, persistence, and UI on top of them.

## Build order

| Task | Name | Covers | Depends on |
| :-- | :-- | :-- | :-- |
| **T01** | Nurture touch engine (data model, LACRM sync, UI) | REQ-10, B-03 | M1 (LACRM sync) |

See `M7-T01-nurture-engine.md` for the full spec and the "Decision & what was built" writeup
(unchanged content, moved from the former `M3-T01-nurture-engine.md`).

## What "done" means for M7

**Already done, 2026-08-10** (built and live-verified same day it was first specced, under the
old M3 number). A Cold lead that's gone quiet (past `Settings.nurtureSilenceDays`) can be enrolled
in the 4-touch nurture sequence from the Nurture page; each touch shows an AI-drafted, editable
draft Tim approves, edits, or skips; progress persists across reload and devices via LACRM (closing
B-03); a lead whose score/status improves out of Cold is no longer treated as active nurture
without any extra step; and Tim can promote a nurtured lead to Warm with one action that actually
changes its real status everywhere.

## References

- Spec v1.2: REQ-10, B-03
- `docs/specs/M3/M3-00-index.md` — where M3 was reactivated for Instantly.ai, displacing this folder
- `docs/specs/M1/M1-T04-extended-state-sync.md` — where B-03 was deferred from (D-24)
- `docs/specs/M2/M2-00-index.md` — where the original M2/M3 rescoping/orphaning happened (this
  folder's original numbering note, preserved at commit `8305bdd:docs/specs/M3/M3-00-index.md`)
