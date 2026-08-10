# M1-T02 — Async store swap

**Goal:** Replace M0's in-memory store with an LACRM-backed store behind the same async contract, so no other component in the app has to change.

**Depends on:** T00, T01.

> **Note:** M0 was deliberately built so this swap wouldn't require rewriting features. Per PROFORMA-STATE-v8.md, M0-T02's confirm path already "calls store.importLeads() (async, matches existing AppStore contract — no component change needed at M1 store swap)." This task is where that groundwork pays off.

## In scope

- A new store implementation satisfying the existing AppStore async contract, backed by T01's LACRM client instead of in-memory state.
- Read-through and write-through behavior: the app's working state is populated from LACRM on load, and writes flow back to LACRM through T01's client.
- Loading and error states for network-dependent operations that didn't need them when the store was purely in-memory.

## Out of scope

- The specific sync logic for each data category (lead records/stages in T03; nurture/alerts/history/notes/scores in T04) — this task delivers the swapped store shell and contract; T03/T04 fill in what it syncs.
- Conflict resolution (T05).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- The public component/hook interface the rest of the app already uses against the M0 store must not change in ways that force other components to be edited — that was the entire point of building it as an async contract in M0.
- Accessibility: any new loading/error states introduced by real network calls (vs. instant in-memory reads) must be announced via the existing live-region pattern, not silent spinners.

## Acceptance criteria

- Every M0 feature (import, scoring, Today/All Leads, lead drawer, map, watchlist, call logging, settings) continues to work unmodified against the new store.
- Data loads from LACRM on app start and reflects real LACRM state, not stale in-memory defaults.
- A write (e.g., logging a call) round-trips to LACRM and is reflected back.
- Network/loading states are announced appropriately, not silent.

## How — Claude Code decides

Internal store implementation (state management approach, caching strategy) is Claude Code's call, within the constraint that the existing public contract doesn't change.

## References

- PROFORMA-STATE-v8.md: "What was built this session" (T02 confirm-path note), Tech Stack ("In-memory store only in M0 — async contract, ready for M1 LACRM swap")
- Spec v1.2: PRINCIPLE-01

---

## Decision & what was built (2026-08-04)

`src/store/lacrmStore.ts` (`useLacrmStore`) replaces `useInMemoryStore` as the sole
`StoreProvider` implementation (`inMemoryStore.ts` deleted — no longer referenced anywhere).
`AppStore`'s public shape (`src/store/types.ts`) was untouched, so every M0 feature component
compiles and runs against it unmodified, per the constraint.

**Read-through:** on mount, fetches contacts via `searchLacrmContacts('')` (T01's `GetContacts`
wrapper) and maps each non-company contact to a `Lead` via `lacrmContactToLeadPatch`, using the
LACRM `ContactId` as `Lead.id`. Fields LACRM doesn't hold a home for yet — `stage`, `dealValue`,
`score`/`scoreBreakdown`, `pinned`/`pinnedNote`, `called`/`lastContactDate`,
`employees`/`annualRevenue`/`industry` — default the same way a fresh import row defaults them.
That's intentional, not a bug: T01's mapping doc targets those categories at LACRM Custom Fields
and Notes, and wiring that sync is explicitly T03 (stage) / T04 (everything else)'s job, not
T02's. Scoring is still applied client-side via the existing `scoreLead`/`deriveStatus`, so a
freshly-hydrated lead is consistently `Cold`/0 until T03/T04 land — expected, not silent data
loss.

**Write-through:** `importLeads` calls `createLacrmContact` per lead (sequential, so a mid-batch
failure still leaves the already-created contacts both in LACRM and in local state — nothing
already-written gets dropped) and swaps in the real `ContactId`. `updateLead` always applies the
local optimistic update first; if the patch touches an LACRM-mapped contact field
(`contactName`/`company`/`email`/`phone`/`city`/`state`/`jobTitle`), it also fires
`updateLacrmContact` in the background — on failure this sets `store.error.leads` and announces
it rather than throwing, since several existing callers (`useTogglePin`, `MyListPage`,
`LeadDrawer`) call `updateLead` fire-and-forget without a catch. `deleteLead` is local-only for
now — T01's client never implemented an LACRM delete operation (out of its stated scope), so
there's nothing to write through to yet. `addCallLog` and `updateSettings` are unchanged
local-only actions (Notes sync is T04; Settings was never an LACRM concept).

**Loading/error UI:** `TodayPage` and `AllLeadsPage` (the two "leads list" surfaces) now branch
on `store.loading.leads` / `store.error.leads` in their empty-state instead of always assuming
"no leads yet" — a role="status" loading message and a role="alert" error message, both also
announced via `useAnnounce()` from inside the store hook itself (fires once, on hydrate
success/failure), satisfying PRINCIPLE-03's "no silent spinners."

**Known gap, flagged not guessed (resolved in T03):** at the time this task was built,
`searchLacrmContacts('')` only read one page of `GetContacts` — pagination was left unhandled
rather than guessed, since there were no live LACRM credentials to confirm the real parameter
names. T03 fetched LACRM's actual public API docs and confirmed `Page`/`MaxNumberOfResults`;
`getAllLacrmContacts()` in `lacrmApi.ts` now pages through fully. See M1-T03's own writeup.

**Verified against a live account 2026-08-06** (see the concurrent-pagination/StrictMode fix,
commit `437a231`) — full hydrate against the real production account (21,209 contacts) completes
in ~31s through the deployed Worker. That fix also caught and resolved a real dev-mode bug this
task's original build had missed: a `hydratedRef` guard meant to stop a double-fetch under React
18 StrictMode instead discarded every successfully-fetched result, leaving local dev stuck on
"Loading leads..." forever (production builds, which don't double-invoke effects, were never
affected). Fixed by relying on the standard cancelled-closure pattern instead of the ref.
