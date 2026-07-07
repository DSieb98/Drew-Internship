# M0 — Production Foundation

**Goal:** Stand up the production SalesForge application as a fresh, browser-only build, and
bring across every Phase-1 capability that exists today — plus the small Phase-1 items that were
never finished — so there is one real app, not a prototype, to build the rest of the system on.

**Status of inputs:** Fresh start. The prototype (`salesforge-v2.jsx`) is reference and
inspiration only — match its behavior and UX quality, but do not treat its code, structure, or
data shapes as a design to copy.

---

## Why this milestone exists

The spec flags the current single-in-browser-JSX-file build as not viable for the long term, and
nothing in the system is live. M0 produces the foundation everything else depends on: a real,
deployable, fully JAWS-accessible app that runs reliably for Tim's daily use and is ready for the
LACRM integration that follows in M1.

## In scope

- A production-quality, browser-only SalesForge app that reproduces the prototype's working
  Phase-1 experience:
  - **Lead ingestion (REQ-01)** — Excel/XLSX import in the browser, with column mapping and a
    preview before confirm. PII stays client-side.
  - **Lead scoring (REQ-03)** — the approved 8-criterion / 100-point model, with the per-criterion
    breakdown visible to Tim. Score is tracked separately from Hot/Warm/Cold status.
  - **Hot lead alert UI (REQ-07)** — dashboard alert driven by the highest-value qualifying Hot
    lead; threshold configurable in Settings. (Dashboard display only; no push.)
  - **Warm handoff (REQ-08)** — the lead drawer briefing: contact/deal/notes, AI call opener, AI
    next-step tips, and the AI email-draft tab (draft + copy/mailto only — no automated send).
  - **Today / All Leads / Map views**, including the US map with lead pins and status/city
    filters (gap G3).
  - **Watchlist / "My List" (gap G1)** — pin any lead regardless of status, keep a private
    per-lead note, show pinned count and a total-potential **dollar sum**, unpin.
  - **Call logging + Call History (gap G2)** — log a call (date, duration, outcome, notes), mark
    a lead as called, and review past calls in a History view.
  - **Plain-language layer (gap G4)** — the "what does this mean?" explanations, glossary, and
    onboarding tour.
  - **Free-form AI assistant (gap G5)** — the "Ask your AI assistant" feature (see PII note below).
- **Finish the unfinished Phase-1 items:**
  - **REQ-12** — derive Hot/Warm/Cold status from the lead's score, with the score-to-status
    threshold(s) configurable in Settings (no code change to adjust).
  - **DV-01** — make the deal-value High/Medium/Low thresholds configurable in Settings (currently
    hardcoded at $25K / $10K). Keep the Watchlist total as a dollar sum.
  - **Settings page** — one place for all configurable values: score threshold, hot-alert deal
    value, employee tiers, revenue tiers, promo-order points, nurture silence threshold, deal-value
    thresholds, and the new status thresholds. Add basic min/max validation on tier inputs (the
    prototype allows min > max).

## Out of scope

- Any LACRM sync or durable persistence (M1). In-memory state is acceptable for M0 only.
- Clay.com enrichment, Make.com automation, nurture persistence, reporting (later milestones).
- Instantly.ai send / response capture (deferred indefinitely).

## Constraints

- Browser-only; all the project-wide constraints in `00-development-plan.md` §3 apply.
- Fully JAWS-accessible (PRINCIPLE-03): section navigation uses a `<nav>` landmark with `aria-current="page"` links (not an ARIA tablist). Meet or exceed the established patterns on all other accessibility requirements.
- Commercial-licensing (PRINCIPLE-02) for every dependency.
- **PII (gap G5):** the free-form AI assistant currently sends every lead's name, company, and
  notes to the Anthropic API in one prompt. Until Drew decides otherwise (open question 3),
  implement it so the data sent can be scoped/limited rather than hardwired to "send everything,"
  and keep all other AI features to the per-feature minimum PII (spec §1a).

## Acceptance criteria

- Tim can complete a full daily workflow end to end using only JAWS: review Today, open a lead,
  read the briefing, log a call, pin a lead and add a private note, import a spreadsheet, and
  adjust a Settings value — with no mouse and no unlabeled controls.
- Importing a real lead spreadsheet produces correctly mapped, scored leads with a visible
  per-criterion breakdown.
- Changing any Settings value (e.g., the status threshold or a deal-value threshold) changes the
  app's behavior immediately and without code changes.
- Hot/Warm/Cold status is derived from score via the configurable threshold (REQ-12), and is
  overridable by Tim.
- The app is deployed/runnable in whatever production form Claude Code selects, and the choice is
  documented.

## How — Claude Code decides

Framework, project structure, build tooling, deployment form, and data shapes are all yours. The
prototype uses React 18 + SheetJS + D3; continue with that or choose another stack, provided every
dependency is commercially licensed and the result is fully JAWS-accessible.

## References

- Spec v1.2: REQ-01, REQ-03, REQ-07, REQ-08, REQ-12, TZ-01, DV-01, §1a (PII), §3 (status legend)
- Prototype: `salesforge-v2.jsx` (reference only)
- Gap analysis: `00-development-plan.md` §6 (G1–G5)
