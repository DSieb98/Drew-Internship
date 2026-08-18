// M5-T01/T02 — reporting metrics that are genuinely sourceable today, with no new tracking.
// Pure functions, no I/O — ReportsPage.tsx is the only caller.
//
// This is a first pass, not the final REQ-11 metric set: it covers exactly the candidates from
// M5-reporting.md's B-06 table that already have real data behind them (leads qualified, sample
// boxes sent). The rest (cost per lead, alerts triggered, emails sent, response rate) render as
// honest "not yet available" placeholders in ReportsPage — see D-37 and M5-T00a/T01. Revisit once
// M5-T00 (Tim's gap-analysis session) confirms what he actually wants to see.

import type { Lead } from '../store/types'
import { CONFIRMED_LACRM_STAGES, canonicalStageName } from './lacrmMapping'

type ConfirmedStage = typeof CONFIRMED_LACRM_STAGES[number]

/** Index of a lead's canonical stage within the confirmed LACRM pipeline flow, or -1 if the lead
 *  hasn't been placed in the pipeline yet (still "New Lead"/"Contacted" — see LEGACY_STAGE_MIGRATION
 *  in lacrmMapping.ts) or carries a stage name that doesn't resolve to any confirmed stage. */
function stageIndex(stage: string): number {
  const canonical = canonicalStageName(stage)
  if (!canonical) return -1
  return CONFIRMED_LACRM_STAGES.indexOf(canonical as ConfirmedStage)
}

/** Leads currently at, or already past, a given pipeline stage (e.g. "Sample Box Sent" also counts
 *  a lead now at "Quote" or "First Order" — they passed through it to get there).
 *
 * Caveat worth keeping visible in the UI: LACRM only stores a contact's *current* stage, not a
 * history of stage changes, so this is a live snapshot ("how many have reached this point so
 * far"), not a count of events within a specific month — REQ-11 asked for a monthly figure, but
 * that would need point-in-time history this app doesn't store anywhere (see M5-reporting.md's
 * "Time range" open question). */
export function countAtOrPastStage(leads: Lead[], targetStage: ConfirmedStage): number {
  const targetIndex = CONFIRMED_LACRM_STAGES.indexOf(targetStage)
  return leads.filter(l => stageIndex(l.stage) >= targetIndex).length
}

/** Leads meeting the score-qualification cutoff — reuses the app's existing "qualified" definition
 *  (Settings.scoreQualificationThreshold, the "Pipeline Qualification Cutoff" control) rather than
 *  inventing a separate one for reporting, per M5-T01's open question on what "qualified" means.
 *  Note the cutoff defaults to 0 (every lead qualifies) until Tim/Greg confirm a real number. */
export function countQualifiedLeads(leads: Lead[], scoreQualificationThreshold: number): number {
  return leads.filter(l => l.score >= scoreQualificationThreshold).length
}
