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
npm install          # May need NODE_OPTIONS=--use-system-ca due to SSL cert issue
```

**Note:** npm registry calls fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` unless you prefix
with `NODE_OPTIONS=--use-system-ca`. Add this to your shell profile or run it before npm.

## Architecture

**State:** `src/store/` — `AppStore` interface + `StoreContext` provider. M0 uses
`useInMemoryStore` (useReducer, no persistence). M1 will swap to an LACRM-backed
implementation via the same provider; all action methods are `async` (Promise-returning)
so consumers don't change.

**Routing:** Hash-based (`#/`) — `HashRouter` renders `<Routes>` in `<main>`. All 8 sections
are routes; Nurture and Reports are "coming later" honest placeholders in M0.

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
  pages/               — one file per section; 6 real, 2 "coming later" placeholders
  store/
    types.ts           — Lead, CallLog, Settings, AppStore interface (async contract)
    inMemoryStore.ts   — M0 useReducer implementation of AppStore
    StoreContext.tsx   — provider + useStore() hook
  hooks/
    useAnnounce.ts     — fire to the live region
    useFocusTrap.ts    — open/close state for FocusTrapDialog
  components/
    LiveRegion.tsx     — polite aria-live region + AnnounceContext provider
    FocusTrapDialog.tsx — generic focus-trapped modal shell
docs/specs/            — project specifications (master plan + per-milestone files)
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
| D-08 | Stack: React 18 + TS 5 + Vite 5 + HashRouter + focus-trap-react | M0-T01 |
| D-09 | Deploy: GitHub Pages (static dist/ from `npm run build`) | M0-T01 |
| D-10 | Store contract is async from the start (all actions return Promise<void>) | M0-T01 |
| D-11 | Section nav uses `<nav>` + `aria-current` links, not ARIA tablist | M0-T01 |
