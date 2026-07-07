# ProForma / SalesForge State — Updated: 2026-07-02

> **Read this at the start of every Claude Code session.** Update it at the end.
> It is the source of truth for what has been decided, what is in progress, and what is open.

---

## Current phase: M0 — Production Foundation

### M0 task status

| Task | Name | Status |
|------|------|--------|
| **T01** | App shell, navigation & accessibility baseline | ✅ Done |
| **T02** | Lead import | ✅ Done |
| **T03** | Scoring engine & status derivation | ⬜ Not started |
| **T04** | Today & All Leads views | ⬜ Not started |
| **T05** | Lead drawer / warm handoff + AI features | ⬜ Not started |
| **T06** | Map view | ⬜ Not started |
| **T07** | Watchlist / "My List" | ⬜ Not started |
| **T08** | Call logging & Call History | ⬜ Not started |
| **T09** | Settings | ⬜ Not started |
| **T10** | Plain-language layer & onboarding | ⬜ Not started |
| **T11** | Free-form AI assistant | ⬜ Not started |

---

## Decided

| # | Decision | Date | Notes |
|---|----------|------|-------|
| D-01 | MVP data source = Excel spreadsheet | pre-M0 | |
| D-02 | CRM = Less Annoying CRM (LACRM) | pre-M0 | |
| D-03 | Email tool = Instantly.ai | pre-M0 | **Deferred indefinitely** (see D-04) |
| D-04 | Instantly.ai deferred indefinitely | 2026-06 | REQ-05 send + REQ-06 capture both out of scope |
| D-05 | Automation = Make.com | pre-M0 | M3+ |
| D-06 | Enrichment = Clay.com | pre-M0 | M3+ |
| D-07 | Browser-only fresh rebuild; prototype is reference only | 2026-07-02 | |
| D-16 | Stack: React 18 + TS 5 + Vite 5 + react-router-dom v6 + focus-trap-react | 2026-07-02 | M0-T01 |
| D-17 | Deploy target: GitHub Pages (static dist/ from `npm run build`) | 2026-07-02 | M0-T01 |
| D-18 | Store action methods are async (Promise<void>) from day one | 2026-07-02 | Enables M0→M1 swap without component rewrites |
| D-19 | Section nav = `<nav>` + `aria-current` links; no ARIA tablist | 2026-07-02 | Links are the correct JAWS pattern for section navigation |
| D-20 | Lead import uses SheetJS (xlsx, Apache 2.0) client-side; no lead data sent over the network | 2026-07-07 | M0-T02; PRINCIPLE-02 (commercial OK) + PII (stays in browser) |

---

## Open / Pending

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| O-01 | Confirmed LACRM stage names (exact list) | Drew | 🔴 High — needed before M2 |
| O-02 | M4 — keep as parking lot or drop? | Drew | 🟡 Medium |
| O-03 | G5 / AI assistant PII — send full lead set or scoped context? | Drew | 🟡 Medium |
| O-04 | Watchlist pins/notes — sync to LACRM in M1 or device-local only? | Drew | 🟡 Medium |

---

## What was built in T01

- Vite + React 18 + TypeScript 5 project in `src/`
- App shell: `<header>` → `<nav>` → `<main>` with semantic landmarks
- Skip-to-main-content link (first focus stop, visually hidden until focused)
- `<nav aria-label="Main navigation">` with 8 `NavLink` items; active link carries
  `aria-current="page"`; `RouteAnnouncer` fires the page name via the live region on
  every navigation and moves focus to `<main>` on subsequent navigations
- `LiveRegionProvider` (`src/components/LiveRegion.tsx`) + `useAnnounce()` hook — polite
  `aria-live` region for status messages that don't steal focus
- `FocusTrapDialog` (`src/components/FocusTrapDialog.tsx`) + `useFocusTrap()` hook —
  reusable focus-trapped modal shell for T05/T08 and beyond
- `AppStore` interface with async action methods in `src/store/types.ts`
- `useInMemoryStore` (useReducer) + `StoreProvider` — M0 in-memory implementation,
  ready to swap to LACRM-backed store in M1 without touching feature components
- 8 placeholder pages: Today, All Leads, Map, History, My List, Settings have content
  placeholders; Nurture and Reports show honest "coming later" messaging
- `npm run build` produces static `dist/` folder (0.40 kB HTML, 2.60 kB CSS, 170 kB JS gzipped 55 kB)
- Dev server: `npm run dev` (requires `NODE_OPTIONS=--use-system-ca` on this machine)

---

## What was built in T02

- `src/utils/parseLeadFile.ts` — SheetJS wrapper; reads XLSX/XLS/CSV entirely in the browser via `FileReader.readAsBinaryString`. No data leaves the browser at any point.
- `src/utils/guessMapping.ts` — field definitions (13 mappable Lead fields + required flag) and auto-guess logic: exact alias match first, then substring fallback; each header claimed at most once.
- `src/components/LeadImportDialog.tsx` — 3-step focus-trapped dialog:
  - **Step 1 — File:** `<input type="file" accept=".xlsx,.xls,.csv">`. Parse errors (empty file, bad format, read failure) announced via live region and rendered as `role="alert"` inline. File picker labeled for JAWS.
  - **Step 2 — Mapping:** 13 `<select>` dropdowns pre-populated by auto-guess; user can correct any. Required field ("Company name *") blocks Next if unmapped with announced error.
  - **Step 3 — Preview:** First 5 leads shown as a labeled list before confirm. Back and Import buttons. Import button label shows row count.
  - On confirm: calls `store.importLeads()` (async, per AppStore contract); outcome announced via `useAnnounce()`.
  - Cancel at any step via Escape, click-outside, or "Cancel import" button (FocusTrapDialog `closeLabel` prop — new optional prop added).
- `src/pages/AllLeadsPage.tsx` — "Import leads from spreadsheet" button; success banner after import; interim lead count + bare list (company / contact / email / deal value). Clearly badged "Interim view · full display coming in T04".
- `src/components/FocusTrapDialog.tsx` — added optional `closeLabel` prop (defaults to "Dismiss") so wizard dialogs can show "Cancel import" instead.
- `src/index.css` — dialog inner styles (heading, body, error), shared `btn-primary`/`btn-secondary`, all import-dialog step styles, and interim lead list styles.
- **PII check:** `parseLeadFile` uses `FileReader` + `XLSX.read` (in-memory). The `store.importLeads()` call is a pure reducer dispatch with no side effects. No `fetch`, `XMLHttpRequest`, or `WebSocket` call is made during import. Verified by reading the code path end-to-end — no network request carries lead data.

---

## Session log

| Date | What was done |
|------|---------------|
| 2026-06-02 | Initial spec files generated; .env set up |
| 2026-07-02 | M0-T01 complete: app shell, nav, accessibility baseline, store contract, build tooling |
| 2026-07-07 | Housekeeping: renumbered D-08/09/10/11 → D-16/17/18/19 to free IDs that specs reserve |
| 2026-07-07 | M0-T02 complete: lead import (see "What was built in T02" below) |
