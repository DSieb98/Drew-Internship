# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

SalesForge — a browser-only, screen-reader-first sales dashboard for a non-technical user
(Tim) who navigates entirely via JAWS. Built as a fresh production application from the specs
in `docs/specs/`. The prototype (`salesforge-v2.jsx`) is reference only — do not use its code.

## Tech Stack

- **React 18 + TypeScript 5** via Vite 5
- **react-router-dom v6** with `HashRouter` (hash routing required for GitHub Pages + local
  `file://` use)
- **focus-trap-react v10** (MIT) for dialog focus trapping
- Plain CSS — no framework. All ARIA patterns hand-rolled for full control.

## Development Commands

```bash
# Set NODE_OPTIONS on Windows due to corporate CA cert issue
export NODE_OPTIONS=--use-system-ca

npm run dev          # Vite dev server at http://localhost:5173/
npm run build        # Production build → dist/
npm run preview      # Serve the dist/ build locally
npm run typecheck    # tsc --noEmit (type check without build)
npm run test         # vitest run (unit/integration tests — added M1-T05)
npm install          # May need NODE_OPTIONS=--use-system-ca due to SSL cert issue
```

**Note:** npm registry calls fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` unless you prefix
with `NODE_OPTIONS=--use-system-ca`. Add this to your shell profile or run it before npm.

## Architecture

**State:** `src/store/` — `AppStore` interface + `StoreContext` provider. `useLacrmStore`
(M1-T02/T03/T04/T06) is the live implementation: reads leads, pipeline stage, scoring inputs
(score/statusOverride/employees/annualRevenue/industry/dealValue, as LACRM Contact custom
fields), Watchlist pin state (pinned/pinnedNote, also as LACRM Contact custom fields, D-26) and
call history (as LACRM Notes) through from LACRM on mount, and writes contact-field edits, stage
changes, pin/note changes, and logged calls back through the LACRM client. Only `Settings` stays
local-only — it isn't an LACRM concept. Every write goes through `syncWrite()`/`withRetry()`
(`src/utils/retry.ts` — retry/backoff, offline fail-fast) and reverts the optimistic local edit
if it's ultimately unconfirmed ("LACRM wins," PRINCIPLE-01); `AppStore.syncState` tracks global
sync health, shown via `SyncStatusIndicator.tsx` in the header. See
`docs/specs/M1/M1-T02-async-store-swap.md`, `M1-T03-lead-stage-sync.md`,
`M1-T04-extended-state-sync.md`, `M1-T05-conflict-resolution.md`, and
`M1-T06-watchlist-sync-decision.md`. All action methods are `async` (Promise-returning).

**Routing:** Hash-based (`#/`) — `HashRouter` renders `<Routes>` in `<main>`. All 8 sections
are routes; Reports is still a "coming later" honest placeholder from M0. Nurture became a real
page in M3-T01 (D-27).

**Accessibility:**
- Skip link → `<header>` → `<nav aria-label="Main navigation">` (links + `aria-current="page"`)
  → `<main id="main-content" tabIndex={-1}>`
- `LiveRegionProvider` in `src/components/LiveRegion.tsx` wraps the whole app and provides the
  `AnnounceContext`. Use `useAnnounce()` to fire polite status messages without stealing focus.
- `FocusTrapDialog` in `src/components/FocusTrapDialog.tsx` — generic focus-trapped dialog shell
  for all modals (T05 lead drawer, T08 call log, etc.). Use `useFocusTrap()` for open/close state.
- `RouteAnnouncer` in `App.tsx` announces the page name on every navigation and moves focus to
  `<main>` on subsequent navigations (not on initial load, so Tab still hits the skip link first).

**Heading structure:** `<h1>SalesForge</h1>` in the app header. Each page section opens with
`<h2>` as the first element. Sub-sections within a page use `<h3>`.

## Repo Structure

```
src/
  App.tsx              — skip link, header, AppNav, RouteAnnouncer, Routes
  main.tsx             — React root; provider nesting: HashRouter > LiveRegionProvider > StoreProvider
  index.css            — all global styles (no CSS modules in M0)
  nav/
    AppNav.tsx         — nav landmark + 8 NavItem links with aria-current
  pages/               — one file per section; 7 real, 1 "coming later" placeholder (Reports)
  store/
    types.ts           — Lead, CallLog, Settings, SyncState, NurtureTouch, AppStore interface (async contract)
    lacrmStore.ts      — M1 LACRM-backed implementation of AppStore (read/write-through, retry/revert)
    StoreContext.tsx   — provider + useStore() hook
  nurture/
    nurturePlan.ts     — M3-T01: fixed 4-touch plan, due-date/eligibility helpers (pure, no I/O)
  hooks/
    useAnnounce.ts     — fire to the live region
    useFocusTrap.ts    — open/close state for FocusTrapDialog
  components/
    LiveRegion.tsx     — polite aria-live region + AnnounceContext provider
    FocusTrapDialog.tsx — generic focus-trapped modal shell
    SyncStatusIndicator.tsx — always-visible header badge for AppStore.syncState (M1-T05)
    NurtureTouchDialog.tsx — M3-T01: AI-draft/edit/approve one nurture touch
  utils/
    retry.ts           — withRetry()/isOnline() — retry/backoff + offline detection (M1-T05)
    leadActivity.ts    — isGoneQuiet() — shared "gone quiet" check (Today/All Leads/Nurture)
docs/specs/            — project specifications (master plan + per-milestone files)
worker/                — Cloudflare Worker credential proxy (D-21); separate deploy from the
                          static app, see worker/README.md
```

## Accessibility Rules (PRINCIPLE-03 — applies to every task)

- Every interactive element has a descriptive accessible name.
- Status messages go through `useAnnounce()` — never raw DOM mutations.
- All dialogs use `FocusTrapDialog` — no hand-rolled focus trapping.
- Color is never the only conveyor of meaning — always pair with text.
- List semantics for any list of leads, logs, or options.
- Nav links only; no ARIA tablist for section navigation.

## Key Decisions (record here as they are made)

| # | Decision | Milestone |
|---|----------|-----------|
| D-07 | Browser-only fresh rebuild; prototype is reference only | M0 |
| D-16 | Stack: React 18 + TS 5 + Vite 5 + HashRouter + focus-trap-react | M0-T01 |
| D-17 | Deploy: GitHub Pages (static dist/ from `npm run build`) | M0-T01 |
| D-18 | Store contract is async from the start (all actions return Promise<void>) | M0-T01 |
| D-19 | Section nav uses `<nav>` + `aria-current` links, not ARIA tablist | M0-T01 |
| D-20 | Lead import uses SheetJS (xlsx, Apache 2.0) parsed entirely client-side; no lead data leaves the browser | M0-T02 |
| D-21 | Credential architecture: a Cloudflare Worker (`worker/`) holds the LACRM + Anthropic API keys server-side and exposes two purpose-built endpoints (`/api/anthropic/chat`, `/api/lacrm/ping`); the app calls the Worker, never the upstream APIs directly. First exception to "browser-only, no server" — GitHub Pages deploy (D-17) is unchanged, the Worker is a separate deploy. Free tier ($0 at this traffic scale). See `docs/specs/M1/M1-T00-credential-architecture.md` and `worker/README.md`. | M1-T00 |
| D-22 | Store swap: `useLacrmStore` replaces `useInMemoryStore` behind the unchanged `AppStore` contract. Only LACRM-mapped contact fields (name/company/email/phone/city/state/job title) read/write through today; stage/score/pin-state/call-history/settings stay local-only until T03/T04 wire their sync. `inMemoryStore.ts` deleted as dead code. See `docs/specs/M1/M1-T02-async-store-swap.md`. | M1-T02 |
| D-23 | Pipeline stage sync: `Lead.stage` reads/writes through to LACRM's confirmed sales pipeline via `Pipeline_Items` API functions (`CreatePipelineItem`/`EditPipelineItem`/`GetPipelineItems`, verified against LACRM's real public v2 docs, not guessed). Which of the account's pipelines is "the" sales pipeline is picked by name-overlap against the B-01 confirmed stage list (`selectSalesPipeline()`), since no pipeline *name* was ever confirmed. Added a stage `<select>` to `LeadDrawer` — the only in-app trigger for a stage change — since no prior spec had planned one and T03's acceptance criteria requires the write path to be exercisable. See `docs/specs/M1/M1-T03-lead-stage-sync.md`. | M1-T03 |
| D-24 | Extended-state sync scope, resolved against three conflicts between the T04 spec and the actual codebase (asked Drew rather than guessed, same as B-01): **(1) Nurture** — NurturePage is still M0's placeholder (no touch/approval engine exists), so there's nothing real to sync; B-03 stays open and is deferred to M2, which already scopes building the engine and closing B-03 together. **(2) "Lead notes"** — treated as redundant with call-log notes (already in scope under call history); no new generic Lead.notes field or UI was added. **(3) dealValue** — added to this sync pass (not in T04's literal in-scope list) because the hot-alert acceptance criterion ("consistent across devices/sessions") is unmet without it — the alert filters on dealValue ≥ threshold. Mechanics: score/statusOverride/employees/annualRevenue/industry/dealValue sync as LACRM Contact custom fields (`"SalesForge …"`, bootstrap-created via `CreateCustomField` if absent — `ensureSalesforgeCustomFields()`); call history syncs as one LACRM Note per call (marker-prefixed so other LACRM notes aren't misread as call logs), with `CallLog.id` becoming the real `NoteId` and `Lead.called`/`lastContactDate` derived from call-log dates instead of their own field (so "Mark as called" is now a minimal call log, not a separate patch). Score is *stored*, not purely recomputed on read, because pinnedNote (a scoring input, S-05..S-08) has no LACRM home until T06 — recomputing on every hydrate would silently drop those points each session; local edits still recompute live and push the fresh value back. Hot-alert status and nurture custom fields from the original T01 mapping-doc plan were dropped as unnecessary/out of scope respectively. See `docs/specs/M1/M1-T04-extended-state-sync.md`. | M1-T04 |
| D-25 | Conflict resolution / "LACRM wins" enforcement: fixed a real bug where `updateLead()` dispatched its patch optimistically but never reverted it on write failure — LACRM's actual (unchanged) state didn't win, the stale local edit did. Now every LACRM write goes through a `syncWrite()`/`withRetry()` helper (`src/utils/retry.ts`: 4 attempts, exponential backoff 500ms→8000ms, offline checked before every attempt and fails fast with no retries spent) and, on exhausted failure, `updateLead`/stage edits revert to the last LACRM-confirmed lead snapshot; `importLeads` skips (never fake-adds) a lead whose create call fails. A global `syncState` (`'idle'\|'syncing'\|'offline'\|'error'`, added to `AppStore`) drives a small always-visible header badge (`SyncStatusIndicator.tsx`, text+icon, not a second aria-live region — transitions are already announced once via the existing live-region pattern) and updates instantly on browser `online`/`offline` events, not just on the next failed write. Added `vitest`/`@testing-library/react` (this project's first test runner) with `src/utils/retry.test.ts` and `src/store/lacrmStore.test.ts` proving revert-on-failure, offline fail-fast, and recovery-within-budget against the real hook. See `docs/specs/M1/M1-T05-conflict-resolution.md`. | M1-T05 |
| D-26 | Watchlist sync (open blocker 4, M1-T06): Drew decided pins/private notes **sync to LACRM**, consistent with PRINCIPLE-01, rather than staying an explicit device-local exception. `Lead.pinned`/`pinnedNote` now round-trip as two more LACRM Contact custom fields (`SalesForge Pinned`, `SalesForge Pinned Note`), bootstrap-created the same way as T04's fields via `ensureSalesforgeCustomFields()`. `SalesForge Pinned` is a **Dropdown** (`'Yes'`/`'No'`) rather than LACRM's `Checkbox` type — Checkbox is actually a multi-select-style field with an undocumented value shape, while Dropdown's plain-string in/out was already proven working by `CF_STATUS_OVERRIDE` (T04). No UI change needed: `MyListPage`/`LeadCard`/`useTogglePin` already went through `store.updateLead()`, which now write-throughs and reverts-on-failure for these two fields same as every other synced field (T05). See `docs/specs/M1/M1-T06-watchlist-sync-decision.md`. | M1-T06 |
| D-27 | Nurture engine (closes B-03), built as `docs/specs/M3/` rather than a new "M2" folder — the original top-level plan's M2 (`docs/specs/M2-pipeline-nurture-persistence.md`) had REQ-09 (done, M1-T03) + REQ-10/nurture (never built, despite M1-T04/D-24 saying "M2 builds the engine"); the `docs/specs/M2/` folder was later repointed at Clay enrichment (old-M3's scope) instead, silently orphaning REQ-10/B-03 rather than carrying the promise forward. Filed as M3 (the number Drew used asking for it) rather than reopening "M2" — see `docs/specs/M3/M3-00-index.md`'s numbering note for the full history, kept there so this doesn't happen again. **Built:** `Lead` gains `nurtureEnrolled`/`nurtureEnrolledAt`/`nurtureTouches`/`nurtureArchived` (`src/store/types.ts`), synced as 4 more LACRM Contact custom fields (`CF_NURTURE_*`, `lacrmMapping.ts`) through the same `updateLead()` write-through/revert path every other synced field already uses — no new `AppStore` methods needed. The 4-touch plan (Day 0/7/21/35, email/call) is a fixed pure-function module (`src/nurture/nurturePlan.ts`); a lead is *active* nurture only while `nurtureEnrolled && !nurtureArchived && status === 'Cold'` — computed, not a separate "graduate" write, so a score improvement moves a lead back to the main pipeline with nothing to fall out of sync. `NurturePage.tsx` (replacing M0's placeholder) surfaces gone-quiet Cold leads as enroll-candidates (reusing the same `isGoneQuiet()` check as the existing "Gone Quiet" filter, now deduplicated into `src/utils/leadActivity.ts` from 3 copies), an active-nurture list opening `NurtureTouchDialog.tsx` (AI-draft via the existing `askClaude()` Worker call, same UX pattern as `LeadDrawer`'s opener/next-steps/email tabs, editable, mark done/skip), a "moved back to main pipeline" list, and archive/restore. "Promote to Warm" sets `statusOverride` via the same path every other status change uses — built correctly from the start rather than as a fix, since this rebuild never had the legacy prototype's `promoteModal` bug to begin with. "Approve"/"mark done" means Tim did the touch himself (this app has no send infrastructure — Instantly.ai/Make.com own that, M4/deferred); it logs that it happened, same relationship `LeadDrawer`'s copy/mailto actions already have to actual sending. See `docs/specs/M3/M3-T01-nurture-engine.md`. | M3-T01 |
| D-27a | Custom-field bootstrap loop resilience: `ensureSalesforgeCustomFields()` (`lacrmStore.ts`) attempted every missing field in one sequential loop with no per-iteration error handling — one rejected `createCustomField()` call threw and silently killed every field after it in `SALESFORGE_CUSTOM_FIELDS`, forever, every hydrate. Found live 2026-08-10 verifying M3-T01: **9 of 13 SalesForge custom fields had never actually been created** in the real production account, including fields from M1-T04/M1-T06 already marked done. Fixed with a per-field `try/catch` inside the loop, so one bad spec can't block unrelated fields. See `docs/specs/M3/M3-T01-nurture-engine.md`. | M3-T01 (found) |
| D-27b | `Currency`-type custom fields need `CurrencyDisplaySettings` — an array of exactly one `{CurrencyType, CurrencySymbol, NumberOfDecimalPlaces, SymbolPlacement}` object (confirmed live against LACRM's real API, not the docs' prose alone: a plain object was tried first and also rejected with a 400). `CF_ANNUAL_REVENUE`/`CF_DEAL_VALUE` (M1-T04) were missing this entirely — the actual trigger for D-27a's cascading failure. Fixed in `lacrmMapping.ts`/`lacrmApi.ts`; both fields now create successfully. | M3-T01 (found) |
| D-27c | `Lead.importedAt` was `new Date().toISOString()` — "now" — on every single hydrate (`contactToLead()`, `lacrmStore.ts`), not the lead's actual import date. `isGoneQuiet()` falls back to `importedAt` whenever `lastContactDate` is null (true for virtually every real lead, since call-logging through this app is new) — resetting it to "now" every load meant no lead could *ever* register as gone-quiet against real data. Silently broken since M1-T04; the existing "Gone Quiet" filter (All Leads) and Today's gone-quiet notice were both affected, not just Nurture's eligibility list. Fixed by mapping LACRM's real `DateCreated` field (confirmed present on `GetContacts`/`GetContact` responses) instead. Verified live: Gone Quiet went from 0/21,212 to 21,194/21,212 — correct for a bulk-imported prospect list with no call history yet. | M3-T01 (found) |
