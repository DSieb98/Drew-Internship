# ProForma / SalesForge — Phased Development Plan

**Source of truth:** ProForma_SalesForge_Spec_v1.2 (June 18, 2026)
**Audience:** Drew (project owner) + Claude Code (builder)
**Build target decision:** Browser-only. Fresh production rebuild (prototype is reference only).

---

## 0. How to read this plan

This is the top-level roadmap. Each milestone (`M0`–`M6`) has its own spec file in this
folder. Hand one milestone file at a time to Claude Code.

Every milestone file states **what** to achieve and the **constraints** that bound the work.
None of them prescribe **how** to build it — architecture, data shapes, file layout, and
library choices are Claude Code's call, subject only to the project-wide constraints in §3.

A milestone is "done" when its acceptance criteria are observably met against real data and,
where the milestone touches persisted data, real LACRM sync (PRINCIPLE-01). "Works in the demo"
is not done — see the spec's prototype-vs-production distinction.

---

## 1. Milestone map (dependency-ordered)

| Milestone | Name | Primary REQs | Gated by |
| :-- | :-- | :-- | :-- |
| **M0** | Production Foundation | REQ-01, REQ-03, REQ-07(UI), REQ-08, REQ-12, TZ-01, DV-01, Settings, Watchlist, Call log/History | — |
| **M1** | LACRM Integration | REQ-04 (two-way sync) | LACRM API verification (step 1 of M1) |
| **M2** | Pipeline + Nurture Persistence | REQ-09, REQ-10 | M1 complete; B-01 stage names |
| **M3** | Enrichment & Automation | REQ-02 (Clay.com), Make.com orchestration | M1 complete |
| **M4** | Outreach & Alerts | REQ-05 (AI draft only), REQ-07 (push) | See §4 — largely deferred |
| **M5** | Reporting | REQ-11 | M1 complete; B-06 scope |
| **M6** | Operations | Monitoring, cost tracking, optimization | M1–M5 in production |

**Dependency spine:** B-01 → M1 (REQ-04) → M2 (REQ-09 + REQ-10). M3, M5, M6 all sit
downstream of M1 because nothing persists durably until LACRM sync exists.

---

## 2. What changed from the spec's Phase 1–5 grouping

The spec's Phase Summary tracks *prototype* progress and therefore reads as "Phase 1 largely
complete." For a production build that is misleading: every Production-Status cell in the spec
is "Not live." This plan re-cuts the work around the real dependency chain and three decisions
made after v1.2:

1. **Browser-only, fresh rebuild.** M0 stands up the production app from scratch (prototype is
   inspiration, not a design doc) and stays client-side.
2. **Instantly.ai deferred indefinitely.** REQ-05 automated send and REQ-06 response capture
   leave the active roadmap (see §4).
3. **B-01 resolved.** LACRM stage names are confirmed and must be inserted into M2 before that
   milestone starts.

---

## 3. Project-wide constraints (apply to every milestone)

These are the bounds inside which Claude Code is free to choose any approach.

- **PRINCIPLE-01 — LACRM is the source of truth.** Anything that creates, updates, or tracks
  data must ultimately write back to LACRM. In-memory-only state is acceptable *only* pre-M1 and
  must be reconciled to LACRM once M1 lands.
- **PRINCIPLE-02 — Commercial-use licensing.** Every package, font, and data source must be
  licensed for commercial use. The current prototype stack (React 18 / SheetJS / D3 / Plus Jakarta
  Sans / Anthropic API) is clean; flag any AGPL/copyleft dependency before adding it. Claude Code
  may keep this stack or choose another, as long as the result stays commercially licensed.
- **PRINCIPLE-03 — Accessibility first.** SalesForge must be fully usable by Tim via JAWS.
  Accessibility is a build requirement on every feature, not a later pass. The prototype's
  established patterns (nav landmark with `aria-current="page"` links for section navigation,
  focus-trapped dialogs, aria-live regions, skip links, descriptive aria-labels, list semantics,
  plain-text dismiss labels) are the baseline to meet or exceed. Section navigation uses
  standard links — not an ARIA tablist — which is the correct pattern for JAWS users moving
  between sections of an app.
- **Browser-only.** No server-side component is assumed. Where a requirement appears to need a
  server (notably M1 LACRM sync), that tension must be surfaced and resolved within the milestone,
  not silently worked around. See §5.
- **Plain-language UX.** Tim is non-technical. The prototype's "explain / glossary / what does
  this mean?" layer and onboarding are part of the product, not extras.
- **PII handling (spec §1a).** Lead PII (names, emails, phones, company data) stays client-side
  during import (SheetJS, in-browser). Only the minimum PII needed for a given AI feature is sent
  to the Anthropic API. Any new feature that sends lead data to the API must respect this — see
  gap G5.

---

## 4. Instantly.ai deferral — effect on M4

Instantly.ai is deferred indefinitely. Concretely:

- **REQ-05 automated send** — out of scope indefinitely. The AI email *draft* tab in the lead
  drawer (already prototyped) stays in the product and is carried in M0; only the automated send
  through Instantly is removed.
- **REQ-06 qualification response capture** — out of scope indefinitely (depended on Instantly).
- **REQ-07 push email/SMS alerts** — remains deferred (B-05: Tim confirmed dashboard alert is
  sufficient).

M4 is therefore mostly a placeholder in this plan. It is retained to preserve the agreed
milestone order and to hold any future outreach work. **Open question for Drew:** drop M4
entirely, or keep it as a parking spot? (See questions at the end.)

---

## 5. Risk to surface early: browser-only × LACRM sync

REQ-04 requires two-way sync with the LACRM API, and PRINCIPLE-01 makes LACRM the durable store.
A pure browser app calling the LACRM API directly would expose API credentials in client code and
may hit CORS limits. This is the single biggest unknown in the plan. It is **not** resolved here
on purpose — M1 opens with a LACRM API capability verification step whose job is to determine
whether safe browser-only sync is possible (scoped tokens, CORS support, per-user auth) and, if
not, to report back so Drew can decide. Claude Code should treat "is browser-only sync safe and
feasible for this CRM?" as the first deliverable of M1, ahead of any sync design.

---

## 6. Gap analysis — prototype vs. spec

Reviewing `salesforge-v2.jsx` against v1.2 surfaced features that are **built but unspecified**,
plus confirmation of what's genuinely not built.

### Built in the prototype but missing a requirement of their own

| ID | Feature | Where it appears | Action |
| :-- | :-- | :-- | :-- |
| **G1** | **Watchlist / "My List" (Tim's Hot List)** — pin any lead, private per-lead note, pinned count + total-potential dollar sum, unpin | `TimHotListPage` | Owned by M0. This is the open "Watchlist scope" comment from v1.2 review — now defined here. |
| **G2** | **Call logging + Call History** — log date/duration/outcome/notes, "called" indicator, History tab | `LogCallModal`, `CallHistoryPage`, `calledIds`, `callLog` | Owned by M0; the logged data becomes LACRM-synced activity in M1. Spec only treats "call history" as data, never as a UI feature. |
| **G3** | **Map view** — US choropleth with lead pins, status/city filters | `USAMap`, `MapPage` | Owned by M0. Spec implies it (TZ-01, tech stack) but has no REQ for it. |
| **G4** | **Explain / Glossary / Onboarding layer** — plain-language definitions, glossary sheet, guided tour | `ExplainPage`, `GlossarySheet`, `Onboarding`, `Help` | Owned by M0 as part of PRINCIPLE-03 UX. Not itemized in spec. |
| **G5** | **Free-form "Ask AI assistant"** — open Q&A that sends *all* leads' names/companies/notes to Anthropic in one prompt | `AskAI` | Owned by M0, but flag against spec §1a: this sends more PII than the per-feature minimum. Needs a PII decision (scope the context, or accept it). |

### Confirmed not built (matches spec "Not Built / Partial")

REQ-04 LACRM sync (no persistence at all), REQ-12 status-from-score threshold (status is static
data, not derived from score), DV-01 thresholds hardcoded (not in Settings), REQ-02 Clay
enrichment, REQ-09 stage sync (display only; app stage names do **not** match the spec's
CRM-stage list), REQ-10 nurture persistence (in-memory only; the `promoteModal` bug is present),
REQ-11 reporting (placeholder page).

### Stage-name mismatch (B-01)

App stages today: `New Lead, Contacted, Qualified, Proposal Sent, Quote Requested, Follow-Up,
Sample Sent`. Spec's CRM approved-scope stages: `Discovery Call, Needs Analysis, Sample Box Sent,
Quote, First Order, Long-Term Relationship`. These don't line up. Drew has the confirmed LACRM
names — they must be dropped into M2 before that milestone is handed off.

---

## 7. Open questions for Drew

1. **Confirmed LACRM stage names** — please paste the exact list (and order). M2 has a marked
   placeholder waiting for them.
2. **M4** — drop it entirely now that Instantly is indefinitely deferred, or keep it as a parking
   spot for future outreach work?
3. **G5 / AI-assistant PII** — fine to keep sending the full lead set to Anthropic for the
   free-form assistant, or should that context be scoped down?
4. **Watchlist persistence** — should pins + private notes sync to LACRM in M1 (PRINCIPLE-01), or
   are they intentionally device-local "scratchpad" data exempt from the source-of-truth rule?
