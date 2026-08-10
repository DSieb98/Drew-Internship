/**
 * M3-T01 — nurture touch plan and pure helpers.
 *
 * The 4-touch sequence itself (Day 0 email, Day 7 call, Day 21 email, Day 35 call) is fixed —
 * REQ-10 doesn't call for it to be configurable the way score thresholds are, and the top-level
 * spec (docs/specs/M2-pipeline-nurture-persistence.md) states it as a fixed cadence. Nothing
 * about a lead's *eligibility* is decided here beyond the plan/date arithmetic — that's
 * `isGoneQuiet()` in leadActivity.ts, reused as-is from the existing Today/All Leads pages.
 */
import type { Lead, NurtureTouch, NurtureTouchStatus } from '../store/types'

export interface NurtureTouchDef {
  step: number
  dayOffset: number
  type: 'email' | 'call'
  label: string
}

export const NURTURE_TOUCH_PLAN: readonly NurtureTouchDef[] = [
  { step: 0, dayOffset: 0,  type: 'email', label: 'Day 0 — Check-in email' },
  { step: 1, dayOffset: 7,  type: 'call',  label: 'Day 7 — Follow-up call' },
  { step: 2, dayOffset: 21, type: 'email', label: 'Day 21 — Re-engagement email' },
  { step: 3, dayOffset: 35, type: 'call',  label: 'Day 35 — Final call' },
]

/** Fresh, all-pending touch set for a lead just enrolled. */
export function makeInitialTouches(): NurtureTouch[] {
  return NURTURE_TOUCH_PLAN.map(def => ({
    step: def.step,
    status: 'pending' as NurtureTouchStatus,
    draftText: '',
    completedAt: null,
  }))
}

/** Due date (ISO 8601 date) for a given touch step, relative to when the lead was enrolled. */
export function touchDueDate(enrolledAt: string, step: number): string {
  const def = NURTURE_TOUCH_PLAN[step]
  const d = new Date(enrolledAt + 'T00:00:00')
  d.setDate(d.getDate() + def.dayOffset)
  return d.toISOString().split('T')[0]
}

/** Index of the first still-pending touch, or -1 if all 4 are done/skipped (sequence complete —
 *  the lead is a candidate for archiving, not further AI-drafting). */
export function currentTouchIndex(touches: NurtureTouch[]): number {
  return touches.findIndex(t => t.status === 'pending')
}

/** A lead counts as *active* nurture (shown in the working list, not just "was once enrolled")
 *  only while it's still actually Cold. A score improvement or a Tim status override moves a
 *  lead out of this list automatically — no separate "graduate" write, so there's nothing to get
 *  out of sync between the stored nurtureEnrolled flag and the lead's real, live status. */
export function isActiveInNurture(lead: Lead): boolean {
  return lead.nurtureEnrolled && !lead.nurtureArchived && lead.status === 'Cold'
}

/** A lead whose enrollment is stale (still flagged nurtureEnrolled, but graduated out because its
 *  status improved) — shown as a small "graduated" note so Tim can clear the flag, not silently. */
export function hasGraduatedFromNurture(lead: Lead): boolean {
  return lead.nurtureEnrolled && !lead.nurtureArchived && lead.status !== 'Cold'
}
