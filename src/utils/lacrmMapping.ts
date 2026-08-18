/**
 * SalesWhiz Lead ↔ LACRM field mapping (M1-T01, extended in M1-T03/T04).
 * Full category-by-category decision writeup: docs/specs/M1/M1-T01-lacrm-client-mapping.md,
 * M1-T03-lead-stage-sync.md, and M1-T04-extended-state-sync.md.
 *
 * This module covers Contact field mapping (native + T04's custom fields,
 * T06's pin/note fields, M3-T01's nurture fields), pipeline stage-name
 * reconciliation, and call-log ↔ Note conversion — all wired end-to-end.
 *
 * NOTE (D-32/D-33, 2026-08-12): the 13 CF_* custom field names below and CALL_LOG_NOTE_MARKER
 * were migrated live (via a one-time script calling LACRM's EditCustomField/EditNote, run through
 * temporary Worker routes since removed) — each field renamed in place by CustomFieldId, so no
 * data was lost or duplicated. Gotcha found live: EditCustomField treats an omitted
 * Options/CurrencyDisplaySettings as "clear it," not "leave unchanged" (same class of surprise as
 * D-27b's Currency-field bug) — the migration re-sent each field's existing Options (with their
 * OptionIds preserved) and CurrencyDisplaySettings alongside the new Name to avoid wiping them.
 * Verified live: 0 existing "SalesForge Call Log" notes existed to migrate (call logging hadn't
 * been used in production yet), and real contact data reads correctly under the new field names
 * post-migration. See CLAUDE.md D-33.
 *
 * NOTE (D-35, 2026-08-13): app renamed again, SynetheixSales → SalesWhiz. The 13 CF_* names and
 * CALL_LOG_NOTE_MARKER below deliberately still say "SynetheixSales" — they're live LACRM field/
 * note-marker names, not display text, and weren't in scope for this rename (would need the same
 * live EditCustomField/EditNote migration as D-33 to change safely). Don't blind-rename these.
 */

import type { CallLog, Lead, NurtureTouch, ScoreCriterionResult } from '../store/types'
import type { LacrmContact, LacrmContactInput, LacrmNote, LacrmPipeline } from './lacrmApi'

// ── Custom fields (M1-T04 — score/status-override/scoring-input sync) ────
//
// LACRM's API takes/returns custom field values as flat top-level keys named
// after the field (confirmed against the public v2 docs — same convention as
// the native 'Company Name'/'Job Title' keys above), not a nested
// FieldId/value array. These constants are the single source of truth for
// those names — lacrmApi.ts's LacrmContact/LacrmContactInput interfaces
// declare the matching literal keys and must be kept in sync by hand if
// renamed here.
export const CF_SCORE = 'SynetheixSales Score' as const
export const CF_SCORE_BREAKDOWN = 'SynetheixSales Score Breakdown' as const
export const CF_STATUS_OVERRIDE = 'SynetheixSales Status Override' as const
export const CF_EMPLOYEES = 'SynetheixSales Employees' as const
export const CF_ANNUAL_REVENUE = 'SynetheixSales Annual Revenue' as const
export const CF_INDUSTRY = 'SynetheixSales Industry' as const
export const CF_DEAL_VALUE = 'SynetheixSales Deal Value' as const
export const CF_PINNED = 'SynetheixSales Pinned' as const
export const CF_PINNED_NOTE = 'SynetheixSales Pinned Note' as const
// M3-T01 — nurture engine (closes B-03). CF_NURTURE_ENROLLED_AT stores an ISO date as plain Text
// rather than LACRM's 'Date' custom-field type — no prior field in this app has used 'Date' yet
// (lastContactDate derives from call-log Notes, not a custom field), so Text keeps this on the
// same proven, tested-live in/out shape as every other synced field instead of an unverified one.
export const CF_NURTURE_ENROLLED = 'SynetheixSales Nurture Enrolled' as const
export const CF_NURTURE_ENROLLED_AT = 'SynetheixSales Nurture Enrolled At' as const
export const CF_NURTURE_TOUCHES = 'SynetheixSales Nurture Touches' as const
export const CF_NURTURE_ARCHIVED = 'SynetheixSales Nurture Archived' as const

// LACRM's web app contact page — `account.lessannoyingcrm.com` is LACRM's own
// account-router subdomain (not this app's account-specific one), which
// redirects a signed-in browser to the right account automatically, so this
// works as a single fixed link regardless of which LACRM account is logged
// in. `Lead.id` *is* the LACRM `ContactId` (see `contactToLead()` in
// lacrmStore.ts), so no separate lookup is needed. Confirmed against a real
// LACRM contact URL (`/app/View_Contact?ContactId=...`), not guessed.
export function lacrmContactUrl(contactId: string): string {
  return `https://account.lessannoyingcrm.com/app/View_Contact?ContactId=${encodeURIComponent(contactId)}`
}

export interface SalesforgeCurrencyDisplaySettings {
  CurrencyType: string
  CurrencySymbol: string
  NumberOfDecimalPlaces: number
  SymbolPlacement: string
}

export interface SalesforgeCustomFieldSpec {
  Name: string
  Type: string
  Options?: string[]
  // Required by LACRM's real CreateCustomField API for Type: 'Currency' fields (confirmed
  // against the public v2 docs, not guessed) — found 2026-08-10 while verifying M3-T01 against
  // the live account: CF_ANNUAL_REVENUE/CF_DEAL_VALUE never actually got created because this
  // was missing, and every field *after* them in this array (Industry, Pinned, Pinned Note, and
  // all 4 nurture fields) silently never got attempted either — see the loop-resilience fix in
  // ensureSalesforgeCustomFields() (lacrmStore.ts) for the other half of this bug. Array of one
  // object, not a plain object — matches the array shape LACRM echoes back on every field in
  // GetCustomFields responses (a plain object was tried first and rejected with a 400 too).
  CurrencyDisplaySettings?: [SalesforgeCurrencyDisplaySettings]
}

const USD_DISPLAY: [SalesforgeCurrencyDisplaySettings] = [{
  CurrencyType: '$',
  CurrencySymbol: '$',
  NumberOfDecimalPlaces: 2,
  SymbolPlacement: 'LeftNoSpace',
}]

/** Bootstrap spec for ensureSalesforgeCustomFields() (lacrmStore.ts) — created once per
 *  account, on first hydrate, if not already present. RecordType defaults to Contact. */
export const SALESFORGE_CUSTOM_FIELDS: SalesforgeCustomFieldSpec[] = [
  { Name: CF_SCORE, Type: 'Number' },
  { Name: CF_SCORE_BREAKDOWN, Type: 'TextArea' },
  { Name: CF_STATUS_OVERRIDE, Type: 'Dropdown', Options: ['Hot', 'Warm', 'Cold'] },
  { Name: CF_EMPLOYEES, Type: 'Number' },
  { Name: CF_ANNUAL_REVENUE, Type: 'Currency', CurrencyDisplaySettings: USD_DISPLAY },
  { Name: CF_INDUSTRY, Type: 'Text' },
  { Name: CF_DEAL_VALUE, Type: 'Currency', CurrencyDisplaySettings: USD_DISPLAY },
  // M1-T06 (D-26) — Watchlist pin/note now syncs to LACRM. Dropdown 'Yes'/'No'
  // rather than LACRM's Checkbox type: Checkbox is really a multi-select-style
  // field with an undocumented value shape, where Dropdown's plain string
  // in/out is already proven working by CF_STATUS_OVERRIDE above.
  { Name: CF_PINNED, Type: 'Dropdown', Options: ['Yes', 'No'] },
  { Name: CF_PINNED_NOTE, Type: 'TextArea' },
  // M3-T01 — nurture engine.
  { Name: CF_NURTURE_ENROLLED, Type: 'Dropdown', Options: ['Yes', 'No'] },
  { Name: CF_NURTURE_ENROLLED_AT, Type: 'Text' },
  { Name: CF_NURTURE_TOUCHES, Type: 'TextArea' },
  { Name: CF_NURTURE_ARCHIVED, Type: 'Dropdown', Options: ['Yes', 'No'] },
]

function encodeScoreBreakdown(breakdown: ScoreCriterionResult[]): string {
  return JSON.stringify(breakdown)
}

function decodeScoreBreakdown(raw: string | undefined): ScoreCriterionResult[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// M3-T01 — nurture touches, same JSON-in-TextArea shape as scoreBreakdown above.
function encodeNurtureTouches(touches: NurtureTouch[]): string {
  return JSON.stringify(touches)
}

function decodeNurtureTouches(raw: string | undefined): NurtureTouch[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ── Lead ↔ Contact ───────────────────────────────────────────────────────

export function leadToLacrmContactInput(lead: Lead): LacrmContactInput {
  const input: LacrmContactInput = {
    IsCompany: false,
    Name: lead.contactName || lead.company || 'Unknown',
  }
  if (lead.company) input['Company Name'] = lead.company
  if (lead.jobTitle) input['Job Title'] = lead.jobTitle
  if (lead.email) input.Email = [{ Text: lead.email, Type: 'Work' }]
  if (lead.phone) input.Phone = [{ Text: lead.phone, Type: 'Work' }]
  if (lead.city || lead.state) {
    input.Address = [{ City: lead.city || undefined, State: lead.state || undefined, Type: 'Work' }]
  }

  // M1-T04 — score is always written (recomputed on every local edit, see
  // applyScoring() in lacrmStore.ts) so a plain reload restores the exact
  // last-known-accurate value rather than re-deriving from partial inputs.
  input[CF_SCORE] = lead.score
  input[CF_SCORE_BREAKDOWN] = encodeScoreBreakdown(lead.scoreBreakdown)
  input[CF_DEAL_VALUE] = lead.dealValue
  if (lead.statusOverride) input[CF_STATUS_OVERRIDE] = lead.statusOverride
  if (lead.employees != null) input[CF_EMPLOYEES] = lead.employees
  if (lead.annualRevenue != null) input[CF_ANNUAL_REVENUE] = lead.annualRevenue
  if (lead.industry) input[CF_INDUSTRY] = lead.industry

  // M1-T06 (D-26) — always written (like score above) so pin state is never
  // ambiguous between "not pinned" and "not yet synced."
  input[CF_PINNED] = lead.pinned ? 'Yes' : 'No'
  input[CF_PINNED_NOTE] = lead.pinnedNote

  // M3-T01 — nurture state, always written for the same reason as pin state above.
  input[CF_NURTURE_ENROLLED] = lead.nurtureEnrolled ? 'Yes' : 'No'
  input[CF_NURTURE_ENROLLED_AT] = lead.nurtureEnrolledAt ?? ''
  input[CF_NURTURE_TOUCHES] = encodeNurtureTouches(lead.nurtureTouches)
  input[CF_NURTURE_ARCHIVED] = lead.nurtureArchived ? 'Yes' : 'No'

  return input
}

export function lacrmContactToLeadPatch(contact: LacrmContact): Partial<Lead> {
  const patch: Partial<Lead> = {
    contactName: [contact.Name.FirstName, contact.Name.LastName].filter(Boolean).join(' '),
    company: contact['Company Name'] ?? '',
    jobTitle: contact['Job Title'] ?? null,
    email: contact.Email?.[0]?.Text ?? '',
    phone: contact.Phone?.[0]?.Text ?? '',
  }
  const address = contact.Address?.[0]
  if (address) {
    patch.city = address.City ?? ''
    patch.state = address.State ?? ''
  }

  if (typeof contact[CF_SCORE] === 'number') patch.score = contact[CF_SCORE]
  patch.scoreBreakdown = decodeScoreBreakdown(contact[CF_SCORE_BREAKDOWN])
  if (typeof contact[CF_DEAL_VALUE] === 'number') patch.dealValue = contact[CF_DEAL_VALUE]
  const override = contact[CF_STATUS_OVERRIDE]
  patch.statusOverride = override === 'Hot' || override === 'Warm' || override === 'Cold' ? override : null
  patch.employees = typeof contact[CF_EMPLOYEES] === 'number' ? contact[CF_EMPLOYEES] : null
  patch.annualRevenue = typeof contact[CF_ANNUAL_REVENUE] === 'number' ? contact[CF_ANNUAL_REVENUE] : null
  patch.industry = contact[CF_INDUSTRY] || null
  patch.pinned = contact[CF_PINNED] === 'Yes'
  patch.pinnedNote = contact[CF_PINNED_NOTE] ?? ''

  patch.nurtureEnrolled = contact[CF_NURTURE_ENROLLED] === 'Yes'
  patch.nurtureEnrolledAt = contact[CF_NURTURE_ENROLLED_AT] || null
  patch.nurtureTouches = decodeNurtureTouches(contact[CF_NURTURE_TOUCHES])
  patch.nurtureArchived = contact[CF_NURTURE_ARCHIVED] === 'Yes'

  return patch
}

// ── Call log ↔ Note (M1-T04 — call-history sync) ────────────────────────
//
// LACRM has no per-record "call log" concept, so each CallLog is written as
// one Note (CreateNote) attached to the contact, marked with a recognizable
// first line so hydrate can tell app-authored call logs apart from
// any other note a user enters directly in LACRM (which this app doesn't
// model and leaves untouched). CallLog.id becomes the Note's NoteId — a
// real, durable, cross-device id instead of the old client-generated one.

const CALL_LOG_NOTE_MARKER = 'SynetheixSales Call Log'

export function callLogToNoteText(log: Omit<CallLog, 'id'>): string {
  return `${CALL_LOG_NOTE_MARKER}\n${JSON.stringify({
    date: log.date,
    durationMinutes: log.durationMinutes,
    outcome: log.outcome,
    notes: log.notes,
  })}`
}

/** Returns null for any note that isn't an app call-log note (wrong marker,
 *  or malformed) — callers filter those out rather than treating them as an error. */
export function noteToCallLog(note: LacrmNote): CallLog | null {
  const newlineIdx = note.Note.indexOf('\n')
  if (newlineIdx === -1) return null
  const marker = note.Note.slice(0, newlineIdx)
  if (marker !== CALL_LOG_NOTE_MARKER) return null
  try {
    const parsed = JSON.parse(note.Note.slice(newlineIdx + 1).trim())
    if (!parsed || typeof parsed !== 'object') return null
    return {
      id: note.NoteId,
      leadId: note.ContactId,
      date: parsed.date,
      durationMinutes: parsed.durationMinutes,
      outcome: parsed.outcome,
      notes: parsed.notes ?? '',
    }
  } catch {
    return null
  }
}

// ── Pipeline stage reconciliation (B-01) ────────────────────────────────
//
// Confirmed LACRM stages (Drew, 2026-08-04): Discovery Call, Needs Analysis,
// Sample Box Sent, Quote, First Order, Long-term Relationship — plus
// "Qualified" as the REQ-09 entry stage. Going forward, Lead.stage should
// just hold one of these canonical names directly (no translation needed,
// since app vocabulary === LACRM vocabulary once T03 lands). This table only
// exists to migrate *pre-existing* leads still carrying the old placeholder
// vocabulary the first time they're synced.
//
// Ambiguities resolved here explicitly (not guessed) — flag to Drew if wrong:
//   - New Lead / Contacted → no LACRM stage. These are pre-qualification,
//     SalesWhiz-only states (REQ-04 only creates the CRM record at
//     "Qualified"). Mapped to `null`: sync the Contact record itself
//     (PRINCIPLE-01 still wants it durable), but don't place it in the
//     pipeline yet.
//   - Proposal Sent / Quote Requested → both collapse into "Quote". LACRM's
//     confirmed list has one "Quote" stage, not two.
//   - Follow-Up → "Needs Analysis" (closest fit: ongoing engagement before a
//     firm next step).
//   - Sample Sent → "Sample Box Sent" (naming difference only).
export const LEGACY_STAGE_MIGRATION: Record<string, string | null> = {
  'New Lead': null,
  'Contacted': null,
  'Qualified': 'Qualified',
  'Proposal Sent': 'Quote',
  'Quote Requested': 'Quote',
  'Follow-Up': 'Needs Analysis',
  'Sample Sent': 'Sample Box Sent',
}

/** Migrates a possibly-legacy stage string to the canonical LACRM stage name (or null = no pipeline placement yet). */
export function canonicalStageName(stage: string): string | null {
  if (stage in LEGACY_STAGE_MIGRATION) return LEGACY_STAGE_MIGRATION[stage]
  return stage || null
}

/** Resolves a canonical stage name to a live LACRM StatusId, by exact case-insensitive name match against the given pipeline. Returns null if the pipeline has no matching status (e.g. "Qualified" may not exist as a real LACRM status — T03 must handle that case rather than assume it always resolves). */
export function resolveStageStatusId(stageName: string | null, pipeline: LacrmPipeline): string | null {
  if (!stageName) return null
  const match = pipeline.Statuses.find(s => s.Name.toLowerCase() === stageName.toLowerCase())
  return match?.StatusId ?? null
}

/** Migrates a possibly-legacy stage string to the label the app should *display* — unlike
 *  canonicalStageName(), this never collapses to null: New Lead / Contacted keep their own label
 *  (they're just not placed in the LACRM pipeline), everything else moves to its confirmed name. */
export function displayStageName(stage: string): string {
  return canonicalStageName(stage) ?? stage
}

// ── Confirmed pipeline (B-01, resolved 2026-08-04 — see M2-pipeline-nurture-persistence.md) ──

/** The real LACRM pipeline stages, in flow order — everything after the app-only pre-qualification pair. */
export const CONFIRMED_LACRM_STAGES = [
  'Qualified',
  'Discovery Call',
  'Needs Analysis',
  'Sample Box Sent',
  'Quote',
  'First Order',
  'Long-term Relationship',
] as const

/** Full stage list a user can pick from in the app, pre-qualification states included. */
export const SELECTABLE_STAGES = ['New Lead', 'Contacted', ...CONFIRMED_LACRM_STAGES] as const

/** Reverse of resolveStageStatusId — the live stage name for a StatusId, or null if not found (e.g. a status that's been deleted/renamed in LACRM since last sync). */
export function statusIdToStageName(statusId: string, pipeline: LacrmPipeline): string | null {
  return pipeline.Statuses.find(s => s.StatusId === statusId)?.Name ?? null
}

/** Picks which of the account's pipelines is "the" sales pipeline B-01 confirmed, by counting
 *  case-insensitive name overlap against CONFIRMED_LACRM_STAGES. Doesn't guess a pipeline *name*
 *  (never confirmed) — most accounts have exactly one pipeline, so this degrades to "the only one"
 *  in the common case, and picks the best-overlapping one if there happen to be several. Returns
 *  null (not a guess) if no pipeline has any matching status name at all. */
export function selectSalesPipeline(pipelines: LacrmPipeline[]): LacrmPipeline | null {
  const confirmed = new Set(CONFIRMED_LACRM_STAGES.map(s => s.toLowerCase()))
  let best: LacrmPipeline | null = null
  let bestScore = 0
  for (const pipeline of pipelines) {
    const score = pipeline.Statuses.filter(s => confirmed.has(s.Name.toLowerCase())).length
    if (score > bestScore) {
      best = pipeline
      bestScore = score
    }
  }
  return best
}

// ── Still deferred, on purpose (D-24) ───────────────────────────────────
//
// - Hot-alert status has no field of its own — it's the Today page's live
//   filter (Hot status + dealValue ≥ settings.hotAlertMinDealValue), and
//   both of those now sync (status via score, dealValue via CF_DEAL_VALUE),
//   so the alert is already consistent across reload/devices without extra
//   storage. hotAlertMinDealValue itself stays a device-local Setting.
// - Nurture-sequence state: built in M3-T01 (see CF_NURTURE_* above) —
//   this note stays as a record that it was deferred here, not silently
//   forgotten (see docs/specs/M3/M3-00-index.md for the full history of
//   how that deferral almost got lost).
