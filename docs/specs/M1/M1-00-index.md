# M1 — LACRM Sync: task breakdown

This folder splits milestone **M1** into discrete tasks, each sized to hand to Claude Code on its own with its own acceptance criteria. Build roughly in the order below; dependencies are noted per task.

Every task inherits the project-wide constraints (PRINCIPLE-01/02/03, plain-language UX, PII rules) and the rule that **how** to build is Claude Code's call. None of these files prescribe architecture, data shapes, or libraries beyond what's explicitly required.

## Shared M1 constraint: this milestone is gated

M1 cannot start until two blockers are resolved:

- **B-01** — exact LACRM pipeline stage names (owner: Drew).
- **Client-side credential architecture** — how a public GitHub Pages static site holds/uses LACRM and Anthropic credentials without exposing secrets client-side (owner: Drew).

T00 is the credential decision/spike itself. Every task from T01 onward is blocked on both items above — do not hand T01+ to Claude Code until they're resolved.

## Build order

| Task | Name | Covers | Depends on | Blocked by |
| :-- | :-- | :-- | :-- | :-- |
| **T00** | Credential architecture decision + implementation | Secure credential handling for LACRM + Anthropic calls from a static site | — | Drew's architecture decision |
| **T01** | LACRM API client & field mapping | REQ-04 core — API client/adapter, SalesForge↔LACRM field mapping | T00 | B-01 (stage names) for full mapping |
| **T02** | Async store swap | Swap M0's in-memory AppStore for an LACRM-backed store | T00, T01 | — |
| **T03** | Lead records + pipeline stage sync | REQ-04 core + REQ-09 | T02 | B-01 (hard block) |
| **T04** | Extended-state sync | REQ-04 expanded: nurture, hot-alert, call history, notes, scores | T02, T03 | — |
| **T05** | Conflict resolution & "LACRM wins" handling | PRINCIPLE-01 | T02–T04 | — |
| **T06** | Watchlist sync decision + implementation | M0-T07 pins/notes: LACRM sync vs. device-local | T02 | Drew's decision (open blocker 4) |

**Tight coupling note:** T03 and T04 both depend on T02's store swap being in place. T05's conflict-handling should be designed alongside T03/T04 rather than bolted on afterward, since retry/error paths touch the same sync code those tasks write.

## What "done" means for M1

When all tasks pass their acceptance criteria, LACRM is the durable, authoritative store for every category PRINCIPLE-01 names — lead records, pipeline stages, nurture state, scores, hot alert status, call history, notes — the M0 in-memory store is fully retired, and Tim's daily workflow survives a page reload or a switch to a different device without data loss.
