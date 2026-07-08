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

export interface AppStore {
  // State
  leads: Lead[]
  callLogs: CallLog[]
  settings: Settings
  loading: StoreLoading
  error: StoreError

  // Lead actions
  importLeads: (leads: Lead[]) => Promise<void>
  updateLead: (id: string, patch: Partial<Omit<Lead, 'id' | 'importedAt'>>) => Promise<void>
  deleteLead: (id: string) => Promise<void>

  // Call log actions
  addCallLog: (log: Omit<CallLog, 'id'>) => Promise<void>

  // Settings actions
  updateSettings: (patch: Partial<Settings>) => Promise<void>
}
