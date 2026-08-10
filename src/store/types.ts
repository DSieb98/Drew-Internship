// ── Tier (used by scoring Settings) ──────────────────────────────────────────

export const TOP_TIER_MAX = 2_000_000_000

export interface Tier {
  min: number
  max: number    // TOP_TIER_MAX for the "and above" top tier
  points: number
}

// ── Score breakdown ───────────────────────────────────────────────────────────

export interface ScoreCriterionResult {
  id: string
  label: string
  maxPoints: number
  earnedPoints: number
}

// ── Nurture (M3-T01) ────────────────────────────────────────────────────────

export type NurtureTouchStatus = 'pending' | 'done' | 'skipped'

export interface NurtureTouch {
  step: number                    // 0-3, index into NURTURE_TOUCH_PLAN (src/nurture/nurturePlan.ts)
  status: NurtureTouchStatus
  draftText: string               // AI-drafted, Tim-editable
  completedAt: string | null      // ISO 8601 date, set when status becomes 'done' or 'skipped'
}

// ── Lead ──────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  // Contact
  company: string
  contactName: string
  email: string
  phone: string
  // Location
  city: string
  state: string
  timezone: string        // IANA timezone, e.g. 'America/New_York'
  // Deal
  dealValue: number
  stage: string
  // Scoring (computed by T03 scoring engine)
  score: number
  scoreBreakdown: ScoreCriterionResult[]
  // Status: derived from score via configurable thresholds (REQ-12),
  // overridable by Tim via statusOverride.
  status: 'Hot' | 'Warm' | 'Cold'
  statusOverride: 'Hot' | 'Warm' | 'Cold' | null
  // Engagement
  pinned: boolean
  pinnedNote: string
  called: boolean
  lastContactDate: string | null  // ISO 8601 date, e.g. '2026-07-01'
  // Scoring inputs (T02 maps these from the spreadsheet; T03 consumes them)
  employees: number | null
  annualRevenue: number | null
  industry: string | null
  jobTitle: string | null
  // Nurture (M3-T01, closes B-03). Active nurture = nurtureEnrolled && !nurtureArchived &&
  // status === 'Cold' (computed, not a separate flag — see nurturePlan.ts's isActiveInNurture()).
  nurtureEnrolled: boolean
  nurtureEnrolledAt: string | null   // ISO 8601 date; touch due-dates are computed from this
  nurtureTouches: NurtureTouch[]     // length 4 once enrolled, [] otherwise
  nurtureArchived: boolean
  // Housekeeping
  importedAt: string              // ISO 8601 date-time
}

// ── Call log ──────────────────────────────────────────────────────────────────

export type CallOutcome =
  | 'Reached'
  | 'No answer'
  | 'Left voicemail'
  | 'Not interested'

export interface CallLog {
  id: string
  leadId: string
  date: string             // ISO 8601 date
  durationMinutes: number
  outcome: CallOutcome
  notes: string
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface Settings {
  // Score → status thresholds (REQ-12). Configurable in Settings (T09).
  hotScoreThreshold: number    // score ≥ this → Hot
  warmScoreThreshold: number   // score ≥ this → Warm; below → Cold

  // Qualification cutoff (REQ-03). Default 0 until Greg & Tim confirm.
  scoreQualificationThreshold: number

  // Hot-lead alert filter (REQ-07). Configurable in Settings (T09).
  hotAlertMinDealValue: number // qualifying lead must have dealValue ≥ this

  // Deal-value label thresholds (DV-01). Configurable in Settings (T09).
  dealHighThreshold: number    // dealValue ≥ this → 'High'
  dealMediumThreshold: number  // dealValue ≥ this → 'Medium'; below → 'Low'

  // Employee count tiers (S-02, max 11 pts). Always exactly 4 tiers.
  employeeTiers: [Tier, Tier, Tier, Tier]

  // Annual revenue tiers (S-03, max 11 pts). Always exactly 4 tiers.
  revenueTiers: [Tier, Tier, Tier, Tier]

  // Promo product points (S-06, 3 levels).
  promoInterestPoints: number        // has inquired
  promoOneOrderPoints: number        // placed one order
  promoMultipleOrdersPoints: number  // repeat buyer

  // Gone-quiet threshold. Configurable in Settings (T09).
  nurtureSilenceDays: number   // days since lastContactDate → show "gone quiet" cue

  // Recent-activity window on Today page. Configurable in Settings (T04).
  recentActivityDays: number   // leads contacted within this many days appear in Recent Activity
}

// ── Store contract ─────────────────────────────────────────────────────────────
//
// All action methods return Promise<void> so this interface can be fulfilled
// by both the M0 in-memory implementation (resolves immediately) and the M1
// LACRM-backed implementation (resolves after network call) with no changes
// to consuming components.

export interface StoreLoading {
  leads: boolean
  callLogs: boolean
  settings: boolean
}

export interface StoreError {
  leads: string | null
  callLogs: string | null
  settings: string | null
}

// ── Sync state (M1-T05) ──────────────────────────────────────────────────
//
// PRINCIPLE-01 ("LACRM wins"): a write SalesForge can't confirm happened
// must never look identical to one that did. This is a single, global
// picture of write-through health — not per-lead — surfaced in the UI so
// Tim always knows whether his last action actually saved.
//
// 'offline'  — browser reports no network; writes fail fast, no retries spent.
// 'syncing'  — at least one write is in flight or retrying.
// 'error'    — the most recent write exhausted its retries; local state has
//              been reverted to the last LACRM-confirmed value.
// 'idle'     — nothing pending, last write (if any) succeeded.
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  /** Writes currently in flight or retrying. */
  pendingCount: number
  /** Message from the most recent failed write, cleared on the next success. */
  lastError: string | null
  /** ISO 8601 date-time of the last write that succeeded, or hydrate completing. */
  lastSyncedAt: string | null
}

export interface AppStore {
  // State
  leads: Lead[]
  callLogs: CallLog[]
  settings: Settings
  loading: StoreLoading
  error: StoreError
  syncState: SyncState

  // Lead actions
  importLeads: (leads: Lead[]) => Promise<void>
  updateLead: (id: string, patch: Partial<Omit<Lead, 'id' | 'importedAt'>>) => Promise<void>
  deleteLead: (id: string) => Promise<void>

  // Call log actions
  addCallLog: (log: Omit<CallLog, 'id'>) => Promise<void>

  // Settings actions
  updateSettings: (patch: Partial<Settings>) => Promise<void>
}
