/**
 * Shared "gone quiet" check — previously duplicated identically across TodayPage, AllLeadsPage,
 * and LeadCard. Extracted here (M3-T01) so Nurture eligibility uses exactly the same definition
 * as the existing "Gone Quiet" filter, rather than a second, driftable copy of the same logic.
 */
import type { Lead } from '../store/types'

export function isGoneQuiet(lead: Lead, silenceDays: number, now: Date): boolean {
  const refStr = lead.lastContactDate ?? lead.importedAt.split('T')[0]
  const ref = new Date(refStr + (refStr.includes('T') ? '' : 'T00:00:00'))
  return (now.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24) >= silenceDays
}
