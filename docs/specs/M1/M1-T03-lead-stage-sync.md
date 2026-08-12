# M1-T03 — Lead records + pipeline stage sync

**Goal:** Make lead records and pipeline stage genuinely two-way synced with LACRM — the core of REQ-04 plus REQ-09's stage tracking.

**Depends on:** T02.

## In scope

- Two-way sync of lead records: creates, updates, and stage changes made in SynetheixSales write to LACRM; changes in LACRM (or by other reps) are reflected back in SynetheixSales.
- REQ-09 stage tracking using LACRM's confirmed stage names (from T01), not the prototype-carried placeholder list.
- Handling for a lead that exists in LACRM but was never imported through SynetheixSales (M0-T02), and vice versa, per the resolution procedure already defined in spec v1.2 §5 for reconciling stage-name mismatches.

## Out of scope

- Nurture state, hot-alert status, call history, notes, and score sync — T04.
- Conflict resolution mechanics — T05 (this task assumes the happy path; T05 handles what happens when SynetheixSales and LACRM disagree).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- **B-01 resolved 2026-08-04** — confirmed stage names available in `M2-pipeline-nurture-persistence.md`; this task is no longer blocked on it (still blocked on T00/T02 per the depends-on above).
- PRINCIPLE-01: in any disagreement, LACRM's data wins (full conflict handling in T05, but this task's basic sync direction must respect that priority).

## Acceptance criteria

- Creating or editing a lead in SynetheixSales is reflected in LACRM.
- A stage change in SynetheixSales writes the correct LACRM stage name.
- A change made directly in LACRM appears in SynetheixSales on next sync/load.
- Stage names displayed anywhere in the app exactly match LACRM's real names — no leftover prototype placeholder names.

## How — Claude Code decides

Sync trigger mechanism (on-save, polling, webhook if LACRM supports it) and internal reconciliation logic are Claude Code's call, within the constraints.

## References

- Spec v1.2: REQ-04, REQ-09, B-01 resolution procedure (§5), PRINCIPLE-01
- PROFORMA-STATE-v8.md: Open Blocker 1

---

## Decision & what was built (2026-08-04)

**Verified against LACRM's real, public v2 API docs** (`account.lessannoyingcrm.com/api_docs/v2/`,
fetched directly this session — not guessed): `Pipeline_Items` core functions
(`CreatePipelineItem`, `EditPipelineItem`, `GetPipelineItems`, `DeletePipelineItem(s)`,
`GetPipelineItem(s)AttachedToContact`) and confirmed `Contacts`' `GetContacts`/`GetContactsById`
both paginate via `Page`/`MaxNumberOfResults` (default 500), and that `DeleteContact` exists
(`ContactId` only) — resolving two gaps T01/T02 had explicitly flagged as unverified rather than
guessed.

**Worker (`worker/src/index.ts`):** added `GET/POST /api/lacrm/pipeline-items` and
`PATCH /api/lacrm/pipeline-items/:id` (→ `GetPipelineItems`/`CreatePipelineItem`/
`EditPipelineItem`); `GET /api/lacrm/contacts` now passes through `page`/`maxResults`.

**Client (`src/utils/lacrmApi.ts`):** `getAllLacrmContacts()` and `getAllPipelineItems()` page
through `HasMoreResults` automatically (fixes T02's flagged one-page-only gap); `createPipelineItem()`
/ `editPipelineItem()` added. `searchLacrmContacts()` now returns the raw paginated result (was
`LacrmContact[]`) — its only caller (`lacrmStore.ts`) was updated to `getAllLacrmContacts()` instead,
nothing else referenced it.

**Mapping (`src/utils/lacrmMapping.ts`):** `CONFIRMED_LACRM_STAGES` (the 7-stage B-01 flow) and
`SELECTABLE_STAGES` (+ `New Lead`/`Contacted` pre-qualification) exported for the UI;
`displayStageName()` (legacy label → confirmed name, but keeps `New Lead`/`Contacted` as-is rather
than collapsing them like `canonicalStageName()` does for pipeline-placement purposes);
`statusIdToStageName()` (StatusId → name, the read direction); `selectSalesPipeline()` (picks the
account's pipeline with the most name-overlap against `CONFIRMED_LACRM_STAGES` — B-01 confirmed
stage *names*, never a pipeline *name*, and most accounts have exactly one pipeline anyway, so
guessing a pipeline name would be worse than this overlap heuristic; returns `null`, not a guess,
if nothing matches).

**Store (`src/store/lacrmStore.ts`):** hydrate now also fetches `getLacrmPipelines()` +
`getAllPipelineItems()` for the selected sales pipeline, in parallel with contacts, and resolves
each lead's `stage` from its pipeline item's `StatusId`; unplaced contacts keep `stage: ''`
(honest "unknown," not a guessed default). `importLeads()` places a newly-created contact in the
pipeline if its (migrated) stage resolves to a real status — a placement failure doesn't lose the
contact itself, since `CreateContact` already succeeded; it's reported via `error.leads` and
`announce()`, not thrown. `updateLead()` gained a parallel stage-sync branch alongside the
existing contact-field one: `EditPipelineItem` if the contact already has a placement,
`CreatePipelineItem` if this is its first. Both branches share the "optimistic local update always
applies, LACRM write failure is reported not thrown" pattern T02 established, since several
existing callers (`useTogglePin`, `MyListPage`) call `updateLead` fire-and-forget.

**New UI surface (required by this task's own acceptance criteria — "a stage change in
SynetheixSales writes the correct LACRM stage name" needs something in SynetheixSales that can actually
change it):** `LeadDrawer`'s Briefing tab replaced the read-only stage `<dd>` with a `<select>`
(`SELECTABLE_STAGES`, labelled, announced via `useAnnounce()` on change) calling
`store.updateLead(id, { stage })`. No prior M0/M1 spec had planned stage-editing UI — REQ-09's own
acceptance criteria ("Tim can update stage manually from CRM or mobile") describes LACRM's own
apps, not SynetheixSales — but T03's acceptance criteria requires the write path to be exercisable, so
this is the minimal control that does it.

**Not verified against a live account**, same standing caveat as T01/T02 — still no LACRM
credentials pulled. `npm run typecheck` and `npm run build` pass for both the app and
`worker/` (`npm run typecheck` in `worker/`).
