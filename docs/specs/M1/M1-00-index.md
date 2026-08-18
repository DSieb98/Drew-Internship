# M1 — LACRM Sync: task breakdown

This folder splits milestone **M1** into discrete tasks, each sized to hand to Claude Code on its own with its own acceptance criteria. Build roughly in the order below; dependencies are noted per task.

Every task inherits the project-wide constraints (PRINCIPLE-01/02/03, plain-language UX, PII rules) and the rule that **how** to build is Claude Code's call. None of these files prescribe architecture, data shapes, or libraries beyond what's explicitly required.

## Shared M1 constraint: this milestone is gated

Both blockers are now resolved:

- ~~**B-01** — exact LACRM pipeline stage names (owner: Drew).~~ **Resolved 2026-08-04** — confirmed list + reconciliation notes in `docs/specs/M2-pipeline-nurture-persistence.md`.
- ~~**Client-side credential architecture**~~ **Resolved 2026-08-04 (D-21)** — Cloudflare Worker proxy built in `worker/`, decision writeup in `M1-T00-credential-architecture.md`. One-time manual account setup (Cloudflare account, LACRM API credentials, GitHub repo secrets) still needed from Drew before it's live in production — see `worker/README.md` — but T01+ are no longer architecturally blocked and can be handed to Claude Code.

## Build order

| Task | Name | Covers | Depends on | Blocked by |
| :-- | :-- | :-- | :-- | :-- |
| **T00** | Credential architecture decision + implementation | Secure credential handling for LACRM + Anthropic calls from a static site | — | Done 2026-08-04, pending Drew's account setup (`worker/README.md`) |
| **T01** | LACRM API client & field mapping | REQ-04 core — API client/adapter, SalesWhiz↔LACRM field mapping | T00 | Done 2026-08-04 (`src/utils/lacrmApi.ts`, `src/utils/lacrmMapping.ts`) — untested against a live account, see decision writeup in `M1-T01-lacrm-client-mapping.md` |
| **T02** | Async store swap | Swap M0's in-memory AppStore for an LACRM-backed store | T00, T01 | — |
| **T03** | Lead records + pipeline stage sync | REQ-04 core + REQ-09 | T02 | — (B-01 resolved) |
| **T04** | Extended-state sync | REQ-04 expanded: hot-alert, call history, scores | T02, T03 | Done 2026-08-04 — nurture deferred to M2 (D-24), see `M1-T04-extended-state-sync.md` |
| **T05** | Conflict resolution & "LACRM wins" handling | PRINCIPLE-01 | T02–T04 | Done 2026-08-04, see `M1-T05-conflict-resolution.md` |
| **T06** | Watchlist sync decision + implementation | M0-T07 pins/notes: LACRM sync vs. device-local | T02 | Done 2026-08-07 — Drew decided sync to LACRM (D-26), see `M1-T06-watchlist-sync-decision.md` |

**Tight coupling note:** T03 and T04 both depend on T02's store swap being in place. T05's conflict-handling should be designed alongside T03/T04 rather than bolted on afterward, since retry/error paths touch the same sync code those tasks write.

## What "done" means for M1

When all tasks pass their acceptance criteria, LACRM is the durable, authoritative store for every category PRINCIPLE-01 names that actually exists yet — lead records, pipeline stages, scores, hot alert status, call history, Watchlist pins/notes — the M0 in-memory store is fully retired, and Tim's daily workflow survives a page reload or a switch to a different device without data loss. Nurture state is the one exception (D-24): no nurture engine exists in the app yet to make durable, so that piece of PRINCIPLE-01 carries into M2, which builds the engine and closes it there.

**M1 is now complete** (all six tasks done as of 2026-08-07) — M2 (pipeline/nurture persistence) is next.
