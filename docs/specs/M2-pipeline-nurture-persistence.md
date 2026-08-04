# M2 — Pipeline Tracking + Nurture Persistence (REQ-09, REQ-10)

**Goal:** Make pipeline stages match LACRM exactly and make the cold-lead nurture sequence durable
(it currently resets on reload) — both backed by the LACRM sync built in M1.

**Gated by:** M1 complete. B-01 (confirmed LACRM stage names) resolved — see the placeholder below.

---

## Why this milestone exists

REQ-09 needs the app's stage names to match LACRM's exactly so Tim never has to mentally translate
one name into another (B-01). REQ-10's nurture state has nowhere durable to live until M1 exists
(B-03), and it carries a known bug. Both are unblocked once M1 lands.

## B-01 — confirmed LACRM stage names (RESOLVED 2026-08-04)

> Confirmed, ordered LACRM pipeline stages (Drew, 2026-08-04):
>
> ```
> 1. Discovery Call
> 2. Needs Analysis
> 3. Sample Box Sent
> 4. Quote
> 5. First Order
> 6. Long-term Relationship
> ```
>
> This matches REQ-09's documented flow exactly, with `Qualified` (the CRM stage REQ-04 sets on
> auto-creation) as the entry stage before `Discovery Call`. Full confirmed flow:
> `Qualified → Discovery Call → Needs Analysis → Sample Box Sent → Quote → First Order →
> Long-term Relationship`.
>
> The app's current placeholder stages are: `New Lead, Contacted, Qualified, Proposal Sent,
> Quote Requested, Follow-Up, Sample Sent`. Reconciliation rule (from spec §5): align the app's
> stages to the confirmed names exactly. Flagged ambiguities for T01 to resolve explicitly, not
> guess:
> - `New Lead` and `Contacted` have no LACRM equivalent — these look like pre-qualification
>   SalesForge-only states that occur before REQ-04 creates the CRM record at `Qualified`, not
>   LACRM pipeline stages at all. Confirm with Drew whether they stay as an app-only pre-stage or
>   get dropped.
> - `Proposal Sent` and `Quote Requested` both plausibly collapse into the single confirmed
>   `Quote` stage — do not silently merge them; confirm which (if either) is redundant.
> - `Follow-Up` has no confirmed equivalent — likely folds into `Needs Analysis` but not
>   guaranteed; confirm before dropping it.
> - `Sample Sent` maps cleanly to `Sample Box Sent` (naming difference only).

## In scope

- **REQ-09 — Sales process tracking:** the app's pipeline stages match the confirmed LACRM names
  one-to-one, are synced via M1, and read correctly in both directions. Stage changes in the app
  write to LACRM and vice versa.
- **REQ-10 — Nurture sequence persistence:** the existing 4-touch sequence (Day 0 email, Day 7
  call, Day 21 email, Day 35 call/archive; Tim approves each touch; AI-drafted, editable; archive
  /restore) persists across reloads by following the M1 LACRM-backed pattern — **not** localStorage
  (which would defeat PRINCIPLE-01).
- **Fix the `promoteModal` bug:** promote-to-Warm currently updates UI state but doesn't actually
  change the lead's status in the underlying data, so the card stays Cold. Promotion must mutate
  the real (now LACRM-backed) lead record.
- Cold leads enter the nurture track based on the configurable silence threshold from Settings,
  and are re-scored on the cadence the spec describes.

## Out of scope

- Clay enrichment feeding the re-scoring (M3) — re-scoring uses the existing model until then.
- Reporting on nurture outcomes (M5).

## Constraints

- All project-wide constraints (`00-development-plan.md` §3); PRINCIPLE-01 especially — nurture
  state and stage changes are durable LACRM data, not browser-only state.
- Accessibility: the per-touch approval flow and the promote-to-Warm modal must be fully
  JAWS-operable (focus-trapped dialog, clear labels, announced state changes).

## Acceptance criteria

- Every pipeline stage shown in the app exactly matches a confirmed LACRM stage name.
- A stage change made in either system appears in the other.
- A cold lead enrolled in nurture stays enrolled (with its touch progress and approvals intact)
  after a reload and in a new session.
- Promoting a nurtured lead to Warm changes its real status everywhere it appears, not just on one
  screen.

## How — Claude Code decides

Persistence mechanism, how nurture state maps onto LACRM, scheduling/re-score timing approach, and
data shapes are yours, within the constraints above.

## References

- Spec v1.2: REQ-09, REQ-10, B-01, B-03, §5 (B-01 resolution procedure), Known Issues
  (`promoteModal` bug)
- Depends on: M1 (LACRM sync)
