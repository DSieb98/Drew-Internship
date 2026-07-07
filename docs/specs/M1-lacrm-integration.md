# M1 — LACRM Integration (REQ-04)

**Goal:** Make LACRM the real, durable source of truth for SalesForge data, with two-way sync, so
that everything the app shows is backed by LACRM and survives reloads, devices, and accidental
deletion in the app.

**Gated by:** A LACRM API capability verification, which is the first deliverable of this
milestone (see below).

---

## Why this milestone exists

PRINCIPLE-01 says LACRM is the source of truth and that no data lives permanently in SalesForge
unless it's also in LACRM. Today nothing persists at all. Until this milestone lands, M2's nurture
persistence, M3's enrichment write-back, and M5's reporting all have nowhere durable to live.
REQ-04 was deliberately moved up to Phase 1 (D-13) for exactly this reason.

## Step 1 (do this before any sync design): LACRM API verification

Because the app is **browser-only**, the first job is to determine whether safe two-way sync is
even possible from the client, and report findings to Drew before building:

- Does the LACRM API support being called directly from a browser (CORS), or does it assume a
  server-side caller?
- Can credentials be scoped/limited so they are not fully exposed in client code, or per-user?
- What are the rate limits, auth model, and the fields/objects available for leads, pipeline
  stages, notes, call activity, and scores?

If safe browser-only sync is **not** feasible, stop and report the constraint and the options
(e.g., a minimal proxy, a different auth model) rather than working around it silently. Drew owns
the decision on how to proceed; surfacing the blocker is the deliverable in that case.

## In scope (assuming verification passes)

- Two-way sync between SalesForge and LACRM for the data PRINCIPLE-01 enumerates: lead records,
  pipeline stage, lead score, Hot/Warm/Cold status, hot-alert status, notes, and call history /
  activity.
- A clear, accessible behavior for sync state and conflicts: when SalesForge and LACRM disagree,
  **LACRM wins** (PRINCIPLE-01), and Tim should never be left looking at stale data without
  knowing it.
- Reconcile the M0 in-memory model to LACRM as the durable store; in-memory becomes a cache/working
  copy, not the record.
- Decide and implement (Drew's open question 4) whether Watchlist pins + private notes sync to
  LACRM or are intentionally device-local.

## Out of scope

- Pipeline stage *semantics* and nurture persistence (M2) — beyond syncing the stage field itself.
- Clay enrichment write-back (M3), reporting reads (M5).

## Constraints

- All project-wide constraints (`00-development-plan.md` §3).
- Browser-only is the working assumption, but it is explicitly under test in Step 1 — see §5 of the
  master plan.
- Accessibility: sync status, errors, and conflict resolution must be announced to JAWS (aria-live
  or equivalent), not shown only visually.

## Acceptance criteria

- Step 1 findings are documented and shared before sync work begins.
- A lead created/edited in SalesForge appears correctly in LACRM, and a change made in LACRM is
  reflected in SalesForge.
- Data survives a full reload and a different session/device (insofar as browser-only allows).
- In a deliberate conflict, LACRM's value is the one that persists.
- No LACRM credential is exposed in a way the Step 1 verification flagged as unacceptable.

## How — Claude Code decides

Sync strategy, polling vs. event model, caching, conflict-detection mechanism, and credential
handling approach are all yours, within the constraints above and whatever Step 1 establishes.

## References

- Spec v1.2: REQ-04, PRINCIPLE-01, D-08, D-13; Technology Stack (LACRM row, "API capabilities to
  be verified before designing sync")
- Master plan §5 (browser-only × sync risk), open question 4 (Watchlist persistence)
