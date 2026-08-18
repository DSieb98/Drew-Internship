# M1-T04 — Extended-state sync

**Goal:** Extend two-way sync to cover the rest of what PRINCIPLE-01 requires — nurture state, hot-alert status, call history, notes, and lead scores — closing the gap that made B-03 (nurture persistence) a blocker in M0.

**Depends on:** T02, T03.

## In scope

- Nurture-sequence state (M0's nurture placeholder / future nurture feature) synced to LACRM rather than reset on reload — this resolves B-03.
- Hot-alert status persisted so it survives reload and is consistent across devices/sessions.
- Call history (M0-T08) synced to LACRM so logged calls aren't lost to browser session state.
- Lead notes synced bidirectionally.
- Lead scores (and their per-criterion breakdown, from M0-T03) synced or reliably recomputable from synced inputs — Drew/Claude Code should decide whether the score itself is stored in LACRM or recalculated client-side from synced criteria data, and document the choice.

## Out of scope

- The Watchlist ("My List") — that's its own decision and task (T06).
- Conflict resolution mechanics (T05).

## Constraints

- Project-wide constraints (PRINCIPLE-01/02/03).
- PRINCIPLE-01 applies to every category listed here explicitly, not just lead records.
- Accessibility: any new sync-status indicators (e.g., "saved," "syncing") follow the existing live-region pattern.

## Acceptance criteria

- Logging a call, adding a note, or a nurture-state change all persist through LACRM and survive a reload or a different device/session.
- B-03 (nurture persistence) is resolved and can be removed from Known Issues.
- Lead scores remain accurate and consistent with M0-T03's model after the sync round-trip.

## How — Claude Code decides

Whether scores are stored or recomputed, and the specific sync mechanics for each data category, are Claude Code's call, within the constraints.

## References

- Spec v1.2: REQ-04 (expanded scope), REQ-10, PRINCIPLE-01, §5 Open Blockers (B-03)
- PROFORMA-STATE-v8.md: Known Issues / QA Notes (nurture-state persistence carried from prototype)

---

## Decision & what was built (2026-08-04)

**Three scope conflicts resolved with Drew first, not guessed** (same pattern as B-01) — full
rationale in CLAUDE.md D-24:
1. **Nurture stays out of scope.** NurturePage is still M0's "coming later" placeholder — there's
   no touch/approval engine to sync. B-03 stays open; M2 builds the engine and closes it there.
2. **"Lead notes" treated as redundant with call-log notes**, already covered by the call-history
   category. No new generic `Lead.notes` field or UI.
3. **dealValue added to this pass**, even though T04's in-scope list didn't literally name it —
   without it the hot-alert acceptance criterion (below) can't hold on a fresh device.

**Verified against LACRM's real, public v2 API docs** (fetched directly this session): `Notes`
core functions (`CreateNote`, `EditNote`, `DeleteNote`, `GetNote`, `GetNotes`,
`GetNotesAttachedToContact`) and `Settings > Custom_Fields` functions (`CreateCustomField`,
`EditCustomField`, `DeleteCustomField`, `GetCustomField`, `GetCustomFields`) — plus confirmation
that custom field values are read/written as flat top-level keys on the Contact object, named
after the field (`"Customer Reference #": "123456789"` style), not a nested `FieldId`/value array.

**Worker (`worker/src/index.ts`):** added `GET/POST /api/lacrm/custom-fields`
(`GetCustomFields`/`CreateCustomField`, `RecordType` fixed to `Contact`) and
`GET/POST /api/lacrm/notes` (`GetNotes`/`CreateNote`).

**Client (`src/utils/lacrmApi.ts`):** `getCustomFields()`/`createCustomField()`,
`getAllNotes()`/`createNote()` — the two `getAll*` functions page through `HasMoreResults` like
the existing contact/pipeline-item ones. `LacrmContact`/`LacrmContactInput` extended with the
seven `"SalesForge …"` custom-field keys (literal, must match the `CF_*` constants in
`lacrmMapping.ts` by hand).

**Mapping (`src/utils/lacrmMapping.ts`):** `CF_SCORE`/`CF_SCORE_BREAKDOWN`/`CF_STATUS_OVERRIDE`/
`CF_EMPLOYEES`/`CF_ANNUAL_REVENUE`/`CF_INDUSTRY`/`CF_DEAL_VALUE` constants plus
`SALESFORGE_CUSTOM_FIELDS` (the `CreateCustomField` bootstrap spec — Number/TextArea/Dropdown/
Currency/Text types as appropriate); `leadToLacrmContactInput()`/`lacrmContactToLeadPatch()`
extended to read/write them. `scoreBreakdown` round-trips as JSON in a TextArea field — there's no
sane way to model a configurable-length per-criterion breakdown as separate fields. Call history:
`callLogToNoteText()`/`noteToCallLog()` convert a `CallLog` to/from a marker-prefixed
(`"SalesForge Call Log"` first line, JSON body) LACRM Note — the marker lets hydrate tell
SalesWhiz-authored notes apart from anything a user enters directly in LACRM, which this app
doesn't model and leaves untouched.

**Store (`src/store/lacrmStore.ts`):** hydrate now also fetches `getAllNotes()` and runs
`ensureSalesforgeCustomFields()` (creates any missing custom field, best-effort/non-fatal) in
parallel with contacts/pipelines. Score/status/scoring-inputs are **stored, not purely
recomputed on read** — `contactToLead()` takes the persisted score/breakdown straight from the
custom fields rather than re-running `scoreLead()`. This matters because `pinnedNote` is a real
scoring input (S-05..S-08) with no LACRM home until T06; recomputing on every hydrate would
silently drop those points each session since `pinnedNote` always comes back blank. Local edits
still recompute live via `applyScoring()` and push the fresh result back to LACRM — only the
*read* path trusts the stored value, so the gap self-heals once T06 lands. `Lead.called`/
`lastContactDate` are no longer independently patchable in practice — `ADD_CALL_LOG` derives them
from call-log dates, so "Mark as called" (`LeadDrawer.tsx`) now logs a zero-duration, no-notes
call instead of patching those fields directly, making it durable for free. `updateLead()` now
also fires its LACRM write when only `stage` changes (previously only native contact fields
triggered it), since stage feeds the same scoring criteria the write now carries.

**Hot-alert status:** given no separate field — the Today-page alert is a live filter (Hot status
+ dealValue ≥ threshold), and both status (via score) and dealValue now sync, so the alert is
already consistent across reload/devices without extra storage. `hotAlertMinDealValue` itself
stays a device-local Setting, same as before.

**Not verified against a live account**, same standing caveat as T01/T02/T03 — still no LACRM
credentials pulled. `npm run typecheck` and `npm run build` pass for both the app and `worker/`.
