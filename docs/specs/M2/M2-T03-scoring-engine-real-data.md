# M2-T03 — Scoring engine consumes real enrichment data

**Goal:** Retire the interim workarounds in M0-T03's scoring engine — the `dealValue`-as-revenue proxy and notes-field keyword inference — and score leads against real Clay.com enrichment data once it's available in LACRM.

**Depends on:** T02 (enriched data must actually be reaching LACRM/SalesWhiz first).

**Owner:** Claude Code.

## In scope

- Updating the scoring engine's data source for each REQ-03 criterion currently running on a workaround:
  - **Revenue $25M+** — currently uses `dealValue` as a proxy; switch to Clay's real revenue-range field.
  - **Has Marketing Dept**, **Has Events**, **Orders Multiple Times/Year**, **Immediate Need** — currently keyword-inferred from the notes field; switch to Clay's real buying-signal fields where Clay actually provides an equivalent (per T00's schema — if Clay doesn't cover one of these, that gap was already supposed to be flagged in T00, not silently patched here).
  - **Employees** — already has a real field from import (REQ-01); confirm Clay's employee-count field is consistent with it and decide which source wins if they disagree.
- Handling leads that haven't been enriched yet (still `pending` per T04) — score using best-available data (existing proxy/inference as a documented fallback) rather than blocking scoring entirely, since not every lead will be enriched immediately given the free-tier guard (T00a) limits enrichment throughput.
- Removing dead code / config paths for the retired proxy and inference logic once real data is confirmed flowing, rather than leaving both paths live indefinitely.

## Out of scope

- The enrichment pipeline itself (T00–T02) — this task only changes what the scoring engine reads.
- The "enrichment pending" UI state itself — that's T04's scope; this task just needs to know whether a lead is enriched or not so it can pick the right data source.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- Given T00a's credit guard means most leads will NOT be enriched immediately (free tier supports ~5–30/month), this task must not assume every lead has Clay data — the fallback-to-proxy path for unenriched leads is a real, ongoing state, not a brief transition.
- REQ-03's existing behavior (score tracked separately from Hot/Warm/Cold status, Tim can override manually) must be preserved — this task changes data sources, not the scoring model's structure.

## Acceptance criteria

- An enriched lead's score reflects real Clay data for every criterion Clay covers, verifiable by comparing the score breakdown to the lead's actual LACRM enrichment fields.
- An unenriched lead still scores (using the documented fallback), and is visibly distinguishable (via T04's state) from an enriched lead so Tim isn't misled into thinking a proxy-based score is a fully-informed one.
- The Known Issues note "REQ-03 scoring — revenue proxy" is resolved for enriched leads and updated to describe the fallback behavior for unenriched ones, rather than removed outright (since the fallback path persists).

## How — Claude Code decides

Which specific Clay fields map to which scoring criteria (beyond what T00's schema already specifies), how the enriched/unenriched fallback branch is implemented, and whether score recomputation happens on enrichment-write or lazily on next read, are Claude Code's call within the constraints.

## References

- Spec v1.2: REQ-03 (Scoring Criteria table), REQ-02
- PROFORMA-STATE.md: Known Issues — "REQ-03 scoring — revenue proxy"
- M2-T00 (field schema), M2-T00a (credit guard — why fallback is a persistent state, not transitional)
