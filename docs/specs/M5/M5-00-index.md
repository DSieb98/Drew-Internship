# M5 — Reporting: task breakdown

This folder splits milestone **M5** into discrete tasks. M5 covers **REQ-11 (Reporting
Dashboard)** — gated on **B-06** (`docs/specs/M5-reporting.md`, the original top-level spec:
"identify the gaps Tim has in LACRM that he *can't* already see inside SynetheixSales" defines
REQ-11's real scope, not a metric list guessed from the pipeline diagram).

## Numbering note — read this first

This task breakdown was first drafted under `docs/specs/M4/` (2026-08-10). That collided with
this repo's actual M4 (`docs/specs/M4-outreach-alerts-deferred.md`) and, separately, duplicated
scope `docs/specs/M5-reporting.md` already owned (REQ-11/B-06 is M5's, per `CLAUDE.md` and every
other cross-reference in this repo). Folded in here, same day, before anything downstream acted on
the M4 copy — no build order or content changed, only the folder number and cross-references.

**This is still placeholder scope, explicitly** — REQ-11 has B-06 baked into it unresolved. Drew
asked for this drafted now anyway, to refine once Tim's input lands, so T00 (the gap analysis) is
sequenced first and everything downstream is written to be revised, not treated as final.

## A scope problem worth flagging before Tim's session, not after

REQ-11's approved-scope metrics (Spec v1.2 §3) are: **emails sent, response rate, leads
qualified, alerts triggered, boxes sent, cost per lead.**

Two of those six — **emails sent** and **response rate** — were scoped assuming Instantly.ai
(REQ-05/06) would be live. Instantly.ai (M3) was briefly reactivated 2026-08-10, then put back to
deferred 2026-08-11 after Drew talked it through with his mentor (see `CLAUDE.md` D-28) — so
T00a's original working assumption (**"no data source, decide drop/proxy/placeholder"**) is
accurate again as of now. Worth remembering it's not necessarily *permanent*: D-28 explicitly
left the door open to revisit M3 later, and `M3-T03-lacrm-writeback.md`'s draft spec is what would
eventually supply this data if that happens. Tim's gap-analysis session (T00) should treat these
two metrics as currently unavailable, not permanently impossible.

## Build order

| Task | Name | Covers | Depends on | Owner |
| :-- | :-- | :-- | :-- | :-- |
| **T00a** | Reconcile REQ-11 metrics against Instantly.ai's status | Resolve the emails-sent / response-rate gap before scope is finalized — revisit against M3's reactivation (see note above) | — | Drew |
| **T00** | Tim gap-analysis session (resolves B-06) | What LACRM doesn't surface that Tim currently wants visibility into | T00a (so the metric list Tim reacts to is current) | Tim / Drew |
| **T01** | Data source mapping for remaining metrics | Where leads-qualified, alerts-triggered, boxes-sent, cost-per-lead actually come from | T00, T00a | Drew (+ Claude Code review) |
| **T02** | Reporting dashboard UI | Monthly summary view in SynetheixSales | T01 | Claude Code |

## What "done" means for M5

Not fully knowable yet — that's the point of B-06. What's knowable now: REQ-11's metric list is
reconciled against what actually has a live data source (T00a, including M3's effect on it),
Tim's own gaps are captured (T00), each remaining metric has a documented source per PRINCIPLE-01
(LACRM, not a side database) (T01), and a monthly summary view exists in SynetheixSales reflecting
only what's actually sourceable (T02). Acceptance criteria in T01/T02 will need a revision pass
once T00 produces real input — flagged explicitly in those files rather than presented as fixed.

## References

- Spec v1.2: REQ-11, B-06, §9 Phase Summary (Phase 4 — Reporting)
- `docs/specs/M5-reporting.md` — original top-level spec, B-06 discussion prep (added same session)
- `docs/specs/M3/M3-00-index.md`, `M3-T03-lacrm-writeback.md` — Instantly.ai reactivation (D-28)
  that T00a needs to be revisited against
- `CLAUDE.md`: D-28 (M3 reactivation / renumbering history)
