# M5-T02 — Reporting dashboard UI

**Goal:** Build the monthly-summary reporting view in SynetheixSales, showing whatever metrics T01 confirmed have a real data source.

**Depends on:** T01 (cannot start until it's known which metrics are actually sourceable).

**Owner:** Claude Code.

## In scope

- A dashboard page/section presenting confirmed metrics as a monthly summary, matching the plain-language, JAWS-first UX pattern already established elsewhere in SynetheixSales (Today/All Leads pages).
- For any metric T01 marked "no source yet" (cost-per-lead is the likely candidate at time of writing), a visible placeholder — consistent with the project's deferred-feature pattern — rather than omitting it silently or showing a fabricated number.
- Full JAWS accessibility per PRINCIPLE-03: live regions for any dynamically-loading data, descriptive aria-labels, no icon-only indicators.

## Out of scope

- Any metric calculation logic beyond what T01 already defined the source for — this task consumes T01's mapping, it doesn't re-derive it.
- Historical trend views, exports, or anything beyond the "monthly summary" scope in REQ-11 unless T00 (Tim's session) specifically surfaced a need for it.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- Data displayed must be read from LACRM (via the M1 sync layer) or a documented derivation of it — not a separately-maintained figure.

## Acceptance criteria

- The dashboard renders all T01-confirmed metrics with real data (not placeholder/mock values) once tested against synced LACRM data.
- Any not-yet-sourceable metric shows an honest placeholder state, JAWS-announced correctly, not a blank or misleading zero.
- Tim can navigate and understand the summary via JAWS without sighted assistance — verified per the same real-device testing standard used for T02 in M0 (PRINCIPLE-03: real-device testing required, not just an ARIA audit).

## How — Claude Code decides

Layout, component structure, and specific visual/interaction design are Claude Code's call within PRINCIPLE-03's constraints and the plain-language tone already established in the rest of SynetheixSales. This replaces `src/pages/ReportsPage.tsx`'s M0 "coming later" placeholder.

## References

- Spec v1.2: REQ-11, PRINCIPLE-03
- M5-T01 (metric/source list this task builds against)
- M0-T04 (Today/All Leads — UX pattern precedent)
