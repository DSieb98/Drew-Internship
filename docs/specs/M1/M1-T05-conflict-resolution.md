# M1-T05 — Conflict resolution & "LACRM wins" handling

**Goal:** Define and implement what happens when SalesForge's local working state and LACRM's data disagree — network failures, concurrent edits, stale reads — so PRINCIPLE-01's "LACRM wins" rule is actually enforced in code, not just stated in the spec.

**Depends on:** T02, T03, T04 (touches the same sync code paths — build alongside those tasks rather than strictly after, per the M1 index's tight-coupling note).

## In scope

- A defined conflict-resolution strategy: when SalesForge's cached/local view of a lead differs from what LACRM currently holds, LACRM's version wins (PRINCIPLE-01), and the user is not silently shown stale data.
- Handling for offline/unreachable LACRM: what the user sees, what happens to pending writes (queued? blocked? clearly flagged as unsynced?).
- Retry/backoff behavior for failed writes, with a clear, announced failure state if retries are exhausted — never a silent data loss.
- A visible (not necessarily loud) indicator of sync state so Tim isn't left guessing whether his last action actually saved.

## Out of scope

- Building new sync categories — this task hardens the sync paths T03/T04 already built.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01 is explicit and non-negotiable here: "in any conflict between what SalesForge shows and what LACRM holds, LACRM wins."
- Accessibility: sync/error/retry states must be announced via the existing live-region pattern; a failed sync is never silent.

## Acceptance criteria

- A simulated conflict (local state vs. LACRM state differ) resolves to LACRM's version, and this is verifiable in a test/demo.
- A simulated offline/unreachable LACRM produces a clear, announced state — not a crash or silent failure.
- A failed write is retried per the chosen backoff strategy and, if it ultimately fails, is surfaced to the user rather than silently dropped.

## How — Claude Code decides

The specific retry/backoff parameters and how sync state is represented/surfaced in the UI are Claude Code's call, within the constraints.

## References

- Spec v1.2: PRINCIPLE-01
- M1-00-index.md: tight-coupling note

---

## Decision & what was built (2026-08-04)

**The real bug this task fixes:** `updateLead()` (`lacrmStore.ts`) already dispatched its patch
optimistically *before* the LACRM write, but on write failure it only announced an error — the
optimistic edit stayed on screen even though LACRM never actually got it. That's a direct
PRINCIPLE-01 violation (SalesForge showing something LACRM doesn't hold), not a hypothetical.
T05 closes it: every write-through path now reverts to the last LACRM-confirmed value if it
can't be saved.

**Retry/backoff (`src/utils/retry.ts`, new):** `withRetry()` wraps a single async call — 4
attempts total (1 + 3 retries), exponential delay starting at 500ms and doubling, capped at
8000ms. Checked before *every* attempt, including the first: if the browser is offline
(`navigator.onLine === false`), it throws `OfflineError` immediately — no wasted retry, no
network round trip, distinct from a real failed call. If every attempt fails while online, it
throws `RetryExhaustedError`, whose `.message` is deliberately plain-language ("LACRM couldn't be
reached after several tries...") rather than echoing the raw fetch/API error — Tim is
non-technical (PRINCIPLE-02) — with the real error kept on `.cause` for anyone debugging later.

**Sync state (`src/store/types.ts` — `SyncState`/`SyncStatus`, added to `AppStore`):** one global
`{ status, pendingCount, lastError, lastSyncedAt }`, not per-lead — `'idle' | 'syncing' |
'offline' | 'error'`. Global rather than per-record because the failure modes T05 covers
(offline, LACRM down) aren't lead-specific, and a global indicator is what answers Tim's actual
question ("did my last action save?") without adding a status column to every list.

**Store wiring (`lacrmStore.ts`):**
- Every LACRM write (`updateLacrmContact`, `createLacrmContact`, `createPipelineItem`/
  `editPipelineItem`, `createNote`) now goes through one `syncWrite()` helper that calls
  `withRetry()` and updates `syncState` — one place instead of reimplementing bookkeeping at
  each call site.
- `updateLead()`: on exhausted failure, dispatches the patch's *inverse* — the full pre-edit lead
  snapshot — reverting the optimistic UI back to LACRM's last-known state. Same for a stage-only
  edit. This is the literal "LACRM wins" enforcement the acceptance criteria ask for.
- `importLeads()`: a lead whose `createLacrmContact` call fails (even after retries) is skipped,
  not added locally with a fake id — nothing appears "imported" that LACRM doesn't actually have.
  Failures are counted and summarized in one announcement rather than one per lead.
- `addCallLog()` was already LACRM-first (write, then dispatch) — no revert needed, just wrapped
  in `syncWrite()` for the same retry/backoff policy.
- `window` `online`/`offline` listeners update `syncState` and announce the transition
  immediately, independent of any in-flight write — this is what makes "simulated offline"
  produce an instant, clear, announced state rather than waiting for the next failed write to
  discover it.

**UI (`src/components/SyncStatusIndicator.tsx`, new; mounted in `App.tsx`'s header):** a small
persistent badge — icon + text, text always present (PRINCIPLE-03: color is never the only
conveyor) — showing the current `syncState.status` in plain language ("All changes saved to
LACRM" / "Saving to LACRM…" / "Offline — changes aren't being saved" / "Couldn't save the last
change to LACRM"). Deliberately *not* a second `aria-live` region: the store already announces
every transition once via the existing live-region pattern (`useAnnounce()`), so a second
auto-announcing region would double-speak every change. The badge exists for Tim to check the
current state on demand (JAWS virtual cursor), after the transient announcement has faded.

**Tests (`npm run test`, vitest + jsdom + @testing-library/react — new devDependency, none of
this project's prior milestones had a test runner):** `src/utils/retry.test.ts` proves the
backoff schedule, retry-exhaustion, and offline fail-fast in isolation. `src/store/
lacrmStore.test.ts` mocks `lacrmApi` and exercises the real `useLacrmStore` hook end-to-end —
this is the "verifiable in a test/demo" acceptance criterion: a write that exhausts retries
reverts the optimistic edit and lands in `'error'` status; a transient failure that recovers
within budget keeps the edit and returns to `'idle'`; going offline (both mid-write and via the
browser event) fails fast/flips status without crashing and without spending retries; every
failure path is asserted to have called the announce spy, not just changed state silently. All
10 tests pass; `npm run typecheck` and `npm run build` both pass.

**Not verified against a live account**, same standing caveat as T01–T04 — still no LACRM
credentials pulled, so the retry/offline paths are proven against mocks, not a real flaky
connection.
