# M5 — Reporting Dashboard (REQ-11)

**Goal:** Give Greg and Tim a monthly view of how the pipeline is performing, built on the
LACRM-backed data the earlier milestones produce.

**Gated by:** M1 complete (data to report on). B-06 scope question resolved — see below.

---

## Why this milestone exists

REQ-11 is the only reporting requirement, and it was deliberately deferred until there was real
data to report on and until Tim's input defined what's worth showing. Now that M1–M3 produce
durable, enriched, LACRM-backed data, reporting has something real to measure.

## B-06 — define scope before building

The reporting scope is intentionally undefined in the spec. The defining step (B-06): identify the
gaps Tim has in LACRM that he *can't* already see inside SynetheixSales — those gaps are what reporting
should fill. **Resolve this with Tim before building.** The spec's candidate metrics are a starting
point, not a locked list: emails sent, response rate, leads qualified, alerts triggered, sample
boxes sent, cost per lead.

Note that with Instantly deferred (M4), some candidate metrics (e.g., "emails sent," "response
rate") may not have a real data source yet — confirm which metrics are actually measurable from
LACRM data before committing to them.

### B-06 discussion prep (for Drew's conversation with Tim, added 2026-08-10)

**The defining question, ask first, open-ended:** "What do you wish you could see about your
pipeline that you *can't* already get from Today/All Leads/My List/Nurture/Map inside SynetheixSales
right now?" — that gap, not a pre-made metrics list, is what M5 should fill. Don't lead with the
candidate table below; use it only to sanity-check what he comes back with.

**Candidate metrics from the spec — measurable today vs. not:**

| Metric | Measurable now from LACRM data? | Open question for Tim |
| :-- | :-- | :-- |
| Leads qualified (count/rate) | Yes — `status`/`statusOverride`, pipeline stage | Window (weekly/monthly)? "Qualified" = Hot, or reaching a specific stage? |
| Sample boxes sent | Yes — pipeline has a "Sample Box Sent" stage | Just a count over time, or also time-in-stage? |
| Cost per lead | Partial — Clay/Make.com/Anthropic spend is trackable, but M2 enrichment isn't live yet | Does Tim actually want $/lead, or is that more a Drew/Greg metric? |
| Alerts triggered | Yes — hot-alert derives live from `status`/`dealValue`, already computed | History of past alerts, or is the live dashboard alert (M0) already enough? |
| Emails sent | No real data source — Instantly deferred (M4), draft tab has no send tracking | Drop unless M4 is revived |
| Response rate | No — same reason (depended on Instantly) | Drop unless M4 is revived |

**Other framing questions that shape the build, not just the metric list:**
- Time range: month-snapshot, or trend-over-time? Trend needs point-in-time history stored
  somewhere — LACRM itself doesn't retain history, so this affects scope/PRINCIPLE-01.
- Audience: this report for Tim alone, or does Greg see it too (spec's wording says "Greg and
  Tim") — they may want different things.
- Format: one fixed monthly summary, or does he want to filter/drill down?

## In scope (once B-06 is settled)

- A monthly summary view covering the metrics confirmed with Tim that are measurable from
  LACRM-backed data.
- Fully JAWS-accessible presentation of that data — tables and summaries that read sensibly to a
  screen reader, not charts that only convey meaning visually.

## Out of scope

- Any metric with no real data source yet.
- Operational/cost monitoring of the system itself (M6) — distinct from business reporting here.

## Constraints

- All project-wide constraints (`00-development-plan.md` §3).
- Reads from LACRM-backed data (PRINCIPLE-01); reporting does not become a second source of truth.
- Accessibility-first: any visualization must have an equivalent text/table representation for JAWS.

## Acceptance criteria

- The metric set is confirmed with Tim and documented before build.
- Each reported metric traces to real LACRM-backed data.
- Tim can read and understand the full report via JAWS alone.

## How — Claude Code decides

Layout, which (if any) visualizations to use alongside the required text equivalents, and how data
is aggregated are yours, within the constraints above.

## References

- Spec v1.2: REQ-11, B-06
- Depends on: M1 (data), and M3 for enrichment-derived metrics
- Master plan: open questions (metric measurability after Instantly deferral)
