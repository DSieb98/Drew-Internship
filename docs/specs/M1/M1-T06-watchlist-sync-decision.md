# M1-T06 — Watchlist sync decision + implementation

> **Resolved 2026-08-07 (D-26).** Drew decided pins/private notes **sync to LACRM**
> (consistent with PRINCIPLE-01), not device-local. Implemented as two more LACRM
> Contact custom fields (`SalesForge Pinned` — Dropdown Yes/No, `SalesForge Pinned
> Note` — TextArea), bootstrapped via the same `ensureSalesforgeCustomFields()` path
> as T04's fields, read/written through `lacrmContactToLeadPatch()` /
> `leadToLacrmContactInput()` in `src/utils/lacrmMapping.ts`, and folded into
> `LACRM_MAPPED_FIELDS` in `src/store/lacrmStore.ts` so `updateLead()`'s existing
> write-through/retry/revert-on-failure path (T05) covers them with no new code path.
> No UI changes were needed — `MyListPage.tsx`, `LeadCard.tsx`, and `useTogglePin.ts`
> already called `store.updateLead()`, which now syncs these fields the same as any
> other. See D-26 in `CLAUDE.md` for the full writeup.

**Goal:** Resolve whether the Watchlist / "My List" (M0-T07) pins and private notes sync to LACRM or remain device-local, then implement whichever is decided.

**Depends on:** T02.

> **Note:** this is Open Blocker 4 in PROFORMA-STATE-v8.md, and was explicitly deferred to M1 by M0-T07's own spec ("Out of scope: Syncing pins/notes to LACRM (M1 decision).").

## In scope

- Drew's decision: does the Watchlist sync to LACRM (consistent with PRINCIPLE-01, though pins/private notes may not have an obvious LACRM home), or stay intentionally device-local (an explicit, documented exception to PRINCIPLE-01)?
- Implementation of whichever is decided, including updating M0-T07's behavior if the decision changes it (e.g., pins persisting across devices/reloads if synced).
- If kept device-local: explicit documentation of why this is an acceptable exception to PRINCIPLE-01, since the spec states prototype-phase in-memory exceptions are temporary and must be resolved — a deliberate device-local decision should be recorded as a decision (a new D-## in the decisions log), not left ambiguous.

## Out of scope

- Redesigning the Watchlist UI itself (M0-T07 already built it) — this task only addresses persistence.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- Whatever is decided must be recorded as an explicit, dated decision (per the project's decision-log convention), not inferred from behavior.

## Acceptance criteria

- A decision is documented (synced vs. device-local) with rationale.
- Pins/notes behave consistently with that decision (e.g., if synced, they survive a device change; if device-local, that limitation is visible to Tim, not silently confusing).

## How — Claude Code decides

Implementation mechanics once Drew's decision is made are Claude Code's call.

## References

- PROFORMA-STATE-v8.md: Open Blocker 4
- M0-T07-watchlist.md: "Out of scope: Syncing pins/notes to LACRM (M1 decision)"
