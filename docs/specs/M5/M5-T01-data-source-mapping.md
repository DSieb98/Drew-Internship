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

## References

- Spec v1.2: REQ-11, REQ-07, REQ-09, §0 (business goal — cost/lead figures)
- M2-T00a (Clay credit guard — possible cost-per-lead input)
- M1-T01/T03 (LACRM client this task checks feasibility against)
- M3-T03 (possible late source for emails-sent/response-rate, if T00a defers rather than drops)
