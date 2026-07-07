# M0 — Production Foundation: task breakdown

This folder splits milestone **M0** (`../M0-production-foundation.md`) into discrete tasks, each
sized to hand to Claude Code on its own with its own acceptance criteria. Build roughly in the
order below; dependencies are noted per task.

Every task inherits the project-wide constraints in `../00-development-plan.md` §3 (browser-only,
PRINCIPLE-01/02/03, plain-language UX, PII rules) and the rule that **how** to build is Claude
Code's call. None of these files prescribe architecture, data shapes, or libraries.

## Shared M0 constraint: state is in-memory only

M0 has no durable persistence — all state lives in the browser session and resets on reload. That
is acceptable **only** for M0; M1 reconciles this working state to LACRM as the source of truth
(PRINCIPLE-01). Build the M0 state so it can later be swapped to an LACRM-backed store without
rewriting every feature, but do not build the sync itself here.

## Build order

| Task | Name | Covers | Depends on |
| :-- | :-- | :-- | :-- |
| **T01** | App shell, navigation & accessibility baseline | nav, routing, skip link, live regions | — |
| **T02** | Lead import | REQ-01 | T01 |
| **T03** | Scoring engine & status derivation | REQ-03, REQ-12 | T01, T09 |
| **T04** | Today & All Leads views | REQ-07 (UI), TZ-01 | T01, T02, T03 |
| **T05** | Lead drawer / warm handoff + AI features | REQ-08 | T04, T03 |
| **T06** | Map view | gap G3, TZ-01 | T01, T02 |
| **T07** | Watchlist / "My List" | gap G1 | T01, T04 |
| **T08** | Call logging & Call History | gap G2 | T04, T05 |
| **T09** | Settings | REQ-12, DV-01, all configurable values | T01 |
| **T10** | Plain-language layer & onboarding | gap G4 | cross-cutting; integrate as surfaces land |
| **T11** | Free-form AI assistant | gap G5 | T01, T02 |

**Tight coupling note:** T03 (scoring) reads its thresholds and tiers from T09 (Settings), and
T09 exists largely to tune T03. Build them together or T09 first.

## What "done" means for M0

When all tasks pass their acceptance criteria, Tim can run a full daily workflow end-to-end using
only JAWS, against a real imported spreadsheet, with every configurable value adjustable in
Settings — and the app is deployed in whatever production form Claude Code selected and documented.
