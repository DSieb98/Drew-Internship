# M2 — Clay.com Enrichment: task breakdown

This folder splits milestone **M2** into discrete tasks. M2 covers **REQ-02 (AI Lead Enrichment)** only — the single Phase 2 item from Spec v1.2 §9 not already absorbed into M1.

> **Correction (2026-08-10):** the line originally here claimed REQ-09 and REQ-10 were "already built into M1-T03 and M1-T04 respectively." That's only true for REQ-09 (pipeline stages, M1-T03). **REQ-10 (nurture persistence) was not built** — M1-T04 explicitly deferred it ("B-03 stays open; M2 builds the engine and closes it there"), and this folder's rescoping to Clay enrichment (confirmed with Drew, this same session) silently dropped that promise instead of carrying it forward. REQ-10/B-03 is now built as `docs/specs/M3/` — see that folder's numbering note for the full history. This folder's own scope (Clay/Make.com enrichment) is unaffected and unchanged.

Every task inherits the project-wide constraints (PRINCIPLE-01/02/03, plain-language UX, PII rules) and the rule that **how** to build is Claude Code's call where a task is Claude Code's to build at all. Not every M2 task is a Claude Code task — see the "Owner" column below.

## Shared M2 constraint: this milestone is gated

M2 cannot start until:

- **M1 is functionally complete** — specifically M1-T01 (LACRM field mapping) and M1-T03 (lead record sync), since enriched fields need a defined path into LACRM (PRINCIPLE-01: LACRM is the source of truth, not SalesForge's in-memory or synced-but-unmapped state).
- **D-05 stands as-is** — Clay.com is the confirmed enrichment tool (Greg, Apr 2026). No re-litigation needed here.

## Build order

| Task | Name | Covers | Depends on | Owner |
| :-- | :-- | :-- | :-- | :-- |
| **T00** | Clay.com account & enrichment field schema | Which fields Clay returns and how they map to SalesForge/LACRM concepts | — | Drew (+ Clay.com config) |
| **T00a** | Clay.com free-tier credit guard | Hard usage cap + dedup so the free tier (100 credits/mo) can't be silently overrun | T00 | Drew (Make.com) |
| **T01** | Make.com enrichment trigger scenario | Pipeline Stage 2→3: trigger Clay enrichment after intake, before LACRM write | T00, T00a | Drew (Make.com, no-code) |
| **T02** | LACRM enrichment write-back | Enriched fields land in LACRM as appended data, not overwritten raw import data | T00, T01, M1-T01, M1-T03 | Drew (Make.com) + Claude Code (if SalesForge-side read logic needed) |
| **T03** | Scoring engine consumes real enrichment data | Retire the `dealValue`-as-revenue proxy and notes-field keyword inference from M0-T03; score against real Clay fields | T02 | Claude Code |
| **T04** | Enrichment failure handling & visibility | Failed/pending enrichment flagged, queued for retry, pipeline continues; SalesForge shows an honest "enrichment pending" state rather than silently scoring on stale/proxy data | T01–T03 | Drew (Make.com retry logic) + Claude Code (SalesForge-side state) |

**Note on task ownership:** T00 and T01 are primarily Drew's own configuration work in Clay.com and Make.com — no-code tools outside the SalesForge repo. Claude Code's role there, if any, is limited to reviewing the field schema against what the scoring engine needs (T00) and to documentation. T02 is a boundary task — whichever side (Make.com scenario vs. SalesForge code) ends up owning the write depends on decisions already made in M1; the task file below flags this rather than presupposing it. T03 and T04's SalesForge-side pieces are the tasks that actually get handed to Claude Code as code work.

## Scope reality check (added after Drew's free-tier guard request)

Clay.com's free tier is 100 Data Credits + 500 Actions/month — at an estimated 3–20 credits per fully-enriched lead, that's roughly **5–30 leads/month**, not the 25–50/month qualified-lead figure in Spec v1.2's business goal. M2 as scoped here builds correctly against the free tier and stays cost-safe (T00a), but if real enrichment volume needs to scale past that, upgrading Clay is a separate decision for Drew to make later — not assumed here.

**Confirmed 2026-08-10 (T00 testing):** actual observed cost is 8–13 credits/lead (Ford vs. Visit Dallas), landing at the **low end** of the estimate — ~7–8 leads/month, not the middle/high end. Driver: Claygent (used for Has Marketing Dept / Has Events, no structured Clay field exists for either) costs *more* on obscure leads than famous ones, since it needs more research steps. T00a's guard should size against the observed 13-credit worst case. See `M2-T00-clay-account-field-schema.md` for full detail.

## What "done" means for M2

When all tasks pass their acceptance criteria: every lead has Clay.com-sourced industry, revenue, buying-signal, order-frequency, and employee-count data flowing automatically into LACRM after intake and before scoring; the scoring engine's REQ-03 criteria (Employees, Revenue $25M+, Has Marketing Dept, Has Events, Ordered Promo Products, Orders Multiple Times/Year) read from that real data instead of the `dealValue` proxy or notes-field keyword inference; and a failed enrichment is visibly flagged and retried rather than silently scoring a lead on stale placeholder data.

## References

- Spec v1.2: REQ-02, REQ-03 (Scoring Criteria table), §2 Pipeline Stages (Stage 3), §9 Phase Summary, D-05
- PROFORMA-STATE-v8.md: Milestone status table (M2 previously scoped narrowly as "stage-name spec placeholder" — superseded by this scope, confirmed with Drew Aug 2026)
- M1-00-index.md, M1-T01, M1-T03 (LACRM client/mapping this milestone depends on)
