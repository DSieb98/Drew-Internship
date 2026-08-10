# M7-T01 — Nurture touch engine (data model, LACRM sync, UI)

> **Renumbered 2026-08-10:** this was originally filed as M3-T01. Drew reactivated the *original*
> M3 (Instantly.ai email automation, REQ-05/06) and its folder now holds that content instead —
> see `docs/specs/M3/M3-00-index.md`'s reactivation note. This spec documents real, already-shipped
> code (commits `2f85924`/`8305bdd`, D-27/D-27a/b/c in `CLAUDE.md`), so rather than let it be lost
> to the M3 folder's repurposing, it moved here as M7 (next open milestone number) with references
> updated accordingly. No code changed — this is a docs-only move.

**Goal:** Replace `NurturePage`'s M0 placeholder with a real 4-touch nurture engine — Cold leads
that have gone quiet can be enrolled, each touch is AI-drafted and Tim-editable, progress persists
through LACRM (closing B-03), and a lead whose score improves rejoins the main pipeline without a
separate manual step.

**Depends on:** M1 (LACRM sync, all six tasks done), M1-T00 (Worker/AI-drafting infrastructure,
already proven by `LeadDrawer`'s opener/next-steps/email-draft tabs).

**Owner:** Claude Code (real app code — unlike M2, nothing here is Drew's own no-code config).

## In scope

- **Data model:** a 4-touch sequence per lead (Day 0 email, Day 7 call, Day 21 email, Day 35
  call), each touch tracked as pending/done/skipped with an AI-drafted, Tim-editable text field.
- **Eligibility surfacing:** Cold leads past `Settings.nurtureSilenceDays` with no active nurture
  enrollment are shown as candidates on the Nurture page — enrollment is an explicit Tim action,
  not automatic (see "Decision" below for why).
- **LACRM persistence:** nurture enrollment state, touch progress, and drafts sync as LACRM
  Contact custom fields, following the same bootstrap-on-first-hydrate pattern M1-T04/T06 already
  established (`ensureSalesforgeCustomFields()`).
- **AI drafting:** each touch's draft is generated via the existing `askClaude()` Worker call
  (M1-T00), editable before being marked done — same UX pattern as `LeadDrawer`'s existing AI tabs.
- **Graduation:** a nurture-enrolled lead whose live status is no longer Cold (score improved,
  or Tim set a status override) stops appearing in the *active* nurture list — computed, not a
  separate write, so there's no extra state to get out of sync.
- **Promote to Warm:** a real, working action from the Nurture page that sets the lead's actual
  status (via the same `updateLead()`/`statusOverride` path every other status change already
  uses) — built correctly from the start rather than as a bug fix, since this rebuild never had
  the legacy prototype's UI-only `promoteModal`.
- **Archive/restore:** a nurture lead can be archived (removed from active view, kept in a
  collapsed list) and restored.

## Out of scope

- Actually sending the drafted emails or making the drafted calls — this app is browser-only with
  no email-sending infrastructure (Instantly.ai/Make.com own that, and are M4/deferred territory
  per the top-level M3-enrichment-automation.md's own "out of scope" line). "Approve"/"Mark done"
  here means Tim did the touch himself (copied the draft, sent it, made the call) and is logging
  that it happened — the same relationship `LeadDrawer`'s "Copy to clipboard" / "Open in email
  client" already has to actual sending.
- Automatic enrollment with no Tim action (see Decision below).
- Changing scoring weights/thresholds — nurture reads `Settings.nurtureSilenceDays` and the
  existing Hot/Warm/Cold derivation, doesn't add new ones.

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01: nurture state is LACRM-backed, not `localStorage` — the entire reason B-03 was a
  blocker was the prototype's local-only nurture state resetting on reload.
- PRINCIPLE-03: touch review/approval is a focus-trapped dialog (`FocusTrapDialog`, no hand-rolled
  trapping); every state change (enroll, approve, skip, archive, restore, promote) is announced
  via `useAnnounce()`; list semantics for the eligible/active/archived lead lists.
- No new LACRM write path invented where an existing one already fits: nurture fields go through
  the same `updateLead()` write-through/revert-on-failure path (T05) every other synced field
  uses — no new `AppStore` methods needed.

## Acceptance criteria

- A Cold lead past the silence threshold appears as a nurture candidate and can be enrolled with
  one explicit action.
- Each of the 4 touches can be AI-drafted, edited, and marked done or skipped; the sequence
  advances correctly and shows the right touch as current.
- Touch progress and drafts survive a reload and appear identically in a fresh session (closes
  B-03 — verify against the live LACRM account, same bar M1-T02 used).
- A lead whose status becomes Warm/Hot (score change or override) no longer appears in the active
  nurture list, with no separate action required.
- "Promote to Warm" changes the lead's real status — reflected on Today/All Leads/My List
  immediately, not just within the Nurture page.
- A lead can be archived and restored; archived leads don't clutter the active/eligible lists.

## How — Claude Code decides

Everything here is Claude Code's build — data shapes, custom field names/types, UI structure, and
prompt wording for AI drafts are all within the constraints above. The one thing flagged rather
than assumed: whether "approve" should trigger an actual send. See "Out of scope" — this app has
no send infrastructure, so it can't, and that's stated rather than silently punted.

## References

- Spec v1.2: REQ-10, B-03
- `docs/specs/M7/M7-00-index.md` — numbering note (why this moved from M3 to M7)
- `docs/specs/M1/M1-T04-extended-state-sync.md` — where B-03 was deferred from (D-24)
- `src/components/LeadDrawer.tsx` — existing AI-draft/edit/copy pattern this task reuses
- `src/utils/claudeApi.ts`, `docs/specs/M1/M1-T00-credential-architecture.md` — AI infrastructure

---

## Decision & what was built (2026-08-10) — D-27

**Data model (`src/store/types.ts`):** `Lead` gains `nurtureEnrolled: boolean`,
`nurtureEnrolledAt: string | null`, `nurtureTouches: NurtureTouch[]`, `nurtureArchived: boolean`.
`NurtureTouch` is `{ step, status: 'pending'|'done'|'skipped', draftText, completedAt }`.

**Touch plan (`src/nurture/nurturePlan.ts`):** the 4-touch cadence (Day 0 email, Day 7 call,
Day 21 email, Day 35 call) is a fixed, pure-function module — no I/O, no store dependency.
`makeInitialTouches()`, `touchDueDate()`, `currentTouchIndex()` (first pending touch, or -1 =
sequence complete), `isActiveInNurture()`, `hasGraduatedFromNurture()`.

**"Active" is computed, not stored:** `isActiveInNurture(lead)` = `nurtureEnrolled &&
!nurtureArchived && status === 'Cold'`. A lead whose score improves (or gets a `statusOverride`)
simply stops appearing in the active-nurture list on the next render — no extra write, no
separate "graduate" action that could get out of sync with the lead's real status. It still shows
in a small "Moved Back to Main Pipeline" section with a one-click "Clear from this list" that
resets `nurtureEnrolled` (cosmetic only — the lead was never hidden from Today/All Leads).

**LACRM persistence (`lacrmMapping.ts`, `lacrmStore.ts`):** 4 new Contact custom fields
(`CF_NURTURE_ENROLLED` Dropdown Yes/No, `CF_NURTURE_ENROLLED_AT` Text/ISO-date,
`CF_NURTURE_TOUCHES` TextArea/JSON — same encode/decode shape as `CF_SCORE_BREAKDOWN`,
`CF_NURTURE_ARCHIVED` Dropdown Yes/No), bootstrap-created by the existing
`ensureSalesforgeCustomFields()` on first hydrate, same as T04/T06's fields. `Text` (not LACRM's
`Date` type) for the enrolled-at date deliberately — no field in this app has used `Date` yet, so
`Text` keeps it on the same proven-live shape as every other synced field. All 4 added to
`LACRM_MAPPED_FIELDS` so a patch touching any of them fires the existing write-through/revert path
— **no new `AppStore` methods.** Enroll/approve/skip/archive/restore/promote are all just
`store.updateLead(id, { ...patch })` calls from the UI layer.

**UI:** `NurturePage.tsx` (replacing M0's placeholder) — three/four sections: **Ready to Enroll**
(Cold + gone-quiet via the existing silence threshold, not yet enrolled/archived — reuses
`isGoneQuiet()`, now deduplicated from 3 near-identical copies in TodayPage/AllLeadsPage/LeadCard
into `src/utils/leadActivity.ts`), **Active Nurture** (sorted by next-due date, opens
`NurtureTouchDialog`), **Moved Back to Main Pipeline** (graduated, see above), and a collapsed
**Archived** `<details>`. `NurtureTouchDialog.tsx` manages one lead's *current* touch: AI-generate
via the existing `askClaude()` Worker call (same prompt-and-edit UX `LeadDrawer`'s opener/
next-steps/email tabs already use), an editable textarea, "Mark done"/"Skip this touch." Because
the dialog receives the lead looked up live from the store (by id, not a stale snapshot —
`NurturePage` derives `selectedLead` fresh every render rather than storing a `Lead` object like
the older per-page drawers do), committing a touch advances the same open dialog straight to the
next one via a `useEffect` keyed on the computed step index — no close/reopen loop needed to get
through all 4 touches. All 4 complete → a "sequence complete" panel with Promote to Warm / Archive.

**"Approve" doesn't send anything.** This app is browser-only with no email/call infrastructure
of its own (Instantly.ai and Make.com own actual sending, and are explicitly M4/deferred per the
top-level M3-enrichment-automation.md's "out of scope" line). "Mark email sent"/"Mark call made"
means Tim did it himself and is logging that it happened — the same relationship `LeadDrawer`'s
"Copy to clipboard"/"Open in email client" buttons already have to actual delivery. Stated
explicitly rather than assumed, per this task's own "How — Claude Code decides" note.

**Promote to Warm — built correctly from the start, not fixed.** The top-level spec's known-issue
language ("`promoteModal` currently updates UI state but doesn't actually change the lead's
status") describes the *original prototype* (`salesforge-v2.jsx`), which this rebuild never used
as code (per `CLAUDE.md`: reference only). There was no `promoteModal` anywhere in this codebase
to search for — confirmed by grep before writing this task. The Nurture page's "Promote to Warm"
action is `store.updateLead(id, { statusOverride: 'Warm' })`, the exact same write-through/
revert-on-failure path (T05) every other status change already uses, so it's correct by
construction rather than a fix applied after the fact.

**Production side-effect, flagged rather than silently deployed:** `ensureSalesforgeCustomFields()`
runs on every hydrate and will create these 4 new custom fields in Drew's real production LACRM
account (the same one M1-T02's 21,209-contact live-verification hit) the first time this code
runs against it — same mechanism T04/T06 already used for their own fields, but flagged here since
it's a real, outward-facing change to a live account, not just a code change.

**Verified against the live LACRM account (2026-08-10), Playwright-driven end to end:** enroll →
AI-generate a real draft → edit → mark done → **reload → touch progress persisted correctly
(the actual B-03 check)** → mark/skip through all 4 touches → sequence-complete panel → Promote
to Warm (confirmed the lead's card genuinely shows Warm on All Leads, not just within Nurture) →
graduated-section auto-detection → archive → confirmed under the Archived list → restore →
confirmed back in Active. Zero console errors throughout. `npm run typecheck` and the full
`vitest` suite pass.

**Three pre-existing, unrelated bugs were found and fixed while verifying** (see D-27a/b/c in
CLAUDE.md for the full writeup) — none were in this task's own diff, but all three blocked
verification or silently broke already-shipped sync:
1. `ensureSalesforgeCustomFields()`'s bootstrap loop had no per-field error handling, so one
   rejected field silently blocked every field after it in the array.
2. `SALESFORGE_CUSTOM_FIELDS`'s two `Currency`-type fields (`CF_ANNUAL_REVENUE`, `CF_DEAL_VALUE`,
   both from M1-T04) were missing LACRM's required `CurrencyDisplaySettings` parameter — meaning
   those two fields, plus everything after them in the array (Industry, Pinned, Pinned Note, and
   this task's 4 nurture fields), had **never actually been created** in the live account since
   M1-T04, despite being marked done.
3. `contactToLead()` set `Lead.importedAt` to `new Date().toISOString()` — "now" — on every single
   hydrate, so the "gone quiet" fallback (used whenever `lastContactDate` is null, which is true
   for virtually every real lead) could never fire against real data. Fixed by mapping LACRM's
   real `DateCreated` field instead.

**Known follow-up, not fixed this session:** with (2) and (3) both fixed, "gone quiet" now
correctly flags the vast majority of this 21,212-contact account (21,194 leads) — which means
NurturePage's "Ready to Enroll" list (and AllLeadsPage's existing "Gone Quiet" filter) renders
that many `<li>` items completely unpaginated. Functionally correct, confirmed working, but not
performant at this scale — needs pagination/virtualization as a follow-up, surfaced not silently
left. Also noted: there's no "archive mid-sequence" control (Archive only appears once all 4
touches are done/skipped) — Tim can't pull a lead out of active nurture early without completing
the sequence; worth a follow-up if that turns out to matter in practice.
