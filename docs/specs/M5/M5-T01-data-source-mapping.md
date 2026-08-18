# M5-T01 — Data source mapping for reporting metrics

**Goal:** For every metric that survives T00/T00a, identify exactly where its data comes from — and confirm that source is LACRM (or derivable from LACRM), per PRINCIPLE-01, not a side calculation living only in SalesWhiz or Make.com.

**Depends on:** T00, T00a.

**Owner:** Drew, with Claude Code reviewing feasibility against what M1's LACRM client (REQ-04 sync) actually exposes.

## In scope (best current guess — revise once T00 lands)

- **Leads qualified** — likely derivable from the scoring engine's (M0-T03) Hot/Warm/Cold status or raw score, synced to LACRM. Confirm whether "qualified" means score-above-threshold, or a specific pipeline stage (REQ-09).
- **Alerts triggered** — REQ-07's hot-alert logic runs client-side in SalesWhiz today (dashboard strip, not push). Confirm whether a triggered alert is currently logged anywhere durable, or whether this metric requires adding logging that doesn't exist yet.
- **Boxes sent** — likely maps to the "Sample Sent" pipeline stage (REQ-09/M1 stage sync). Confirm stage name matches once B-01 (LACRM stage names) is resolved.
- **Cost per lead** — no current source. The business-goal figure (~$1–3/lead target vs. ~$40/lead baseline, Spec v1.2 §0) implies this matters, but nothing today tracks spend per lead. Candidate inputs: Clay.com credit consumption (M2-T00a's credit counter, if M2 is built — could double as a cost-tracking input rather than building a second one), Make.com usage, LACRM subscription cost amortized. Needs a decision, not just a data pull.
- **Emails sent / response rate** — if T00a lands on "pending M3" rather than drop/proxy, this task also needs to check what `M3-T03-lacrm-writeback.md` actually lands in LACRM once M3 is built, and map against that.

## Out of scope

- Emails sent / response rate — resolved (or explicitly excluded, or deferred to M3) in T00a, not re-litigated here.
- Building the dashboard UI itself (T02).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01: wherever possible, a metric should be computed from data already in LACRM (or clearly derivable from it), not from a new parallel store — reporting shouldn't become its own second source of truth.

## Acceptance criteria

- Every metric confirmed by T00/T00a has either a documented, real data source, or is explicitly marked "no source yet — needs a new tracking mechanism" (cost-per-lead is expected to land here initially).
- Cost-per-lead has at minimum a proposed approach (even if not yet built) reviewed by Drew.
- Nothing in this mapping requires storing report data outside LACRM as a new permanent store.

## How — Claude Code decides

Claude Code's role here is reviewing proposed sources against what M1's LACRM client actually supports (field availability, query capability) and flagging anything that would require new sync work beyond M1's scope — not deciding the business question of what "qualified" or "cost per lead" should mean.

## Decision & what was built (2026-08-18, D-38)

Built ahead of T00 as a v0 pass (Drew's call — see `M5-00-index.md`'s status note), against the
"best current guess" list above, resolved per metric:

- **Leads qualified** — resolved as score ≥ `Settings.scoreQualificationThreshold` (the app's
  existing "Pipeline Qualification Cutoff" concept, already surfaced in Settings and the
  `pipeline-qualification` glossary entry) rather than a specific pipeline stage — reuses a
  definition that already exists instead of inventing a reporting-specific one. Cutoff still
  defaults to 0 (every lead qualifies) until Tim/Greg confirm a real number, so this metric is
  honest but not yet meaningful until that Settings value is set for real.
- **Boxes sent** — resolved as leads currently at, or already past, the confirmed "Sample Box
  Sent" pipeline stage (`CONFIRMED_LACRM_STAGES` order, `src/utils/reportingMetrics.ts`). Real
  finding: LACRM only stores a contact's *current* stage, not a history of stage transitions, so
  this can only ever be a live snapshot ("how many have reached this point so far"), never a true
  monthly count of a send *event* — flagged in the UI copy itself, not left implicit.
- **Alerts triggered** — confirmed no durable source exists. REQ-07's hot-alert (`TodayPage.tsx`)
  computes live/client-side and was deliberately never logged anywhere (D-24 dropped hot-alert
  status from the original sync plan as unnecessary). Marked "not yet available" rather than
  reporting the currently-active alert as if it were a count.
- **Cost per lead** — confirmed no source yet, as expected: depends on M2 (Clay/Make.com spend
  tracking) actually being live, which it isn't. Marked "not yet available."
- **Emails sent / response rate** — per T00a/D-37, shown as "not yet available" placeholders, not
  dropped.

Nothing here required a new parallel store — every real number traces to `Lead` fields already
synced through the M1 LACRM client (PRINCIPLE-01).

## References

- Spec v1.2: REQ-11, REQ-07, REQ-09, §0 (business goal — cost/lead figures)
- M2-T00a (Clay credit guard — possible cost-per-lead input)
- M1-T01/T03 (LACRM client this task checks feasibility against)
- M3-T03 (possible late source for emails-sent/response-rate, if T00a defers rather than drops)
