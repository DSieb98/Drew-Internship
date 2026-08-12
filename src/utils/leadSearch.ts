/**
 * Local, deterministic lead search by company or contact name — powers the AI assistant's
 * "Find a lead" navigation (M7-T02, Tim's JAWS feedback). Kept as a plain client-side match
 * rather than an LLM round trip: it's instant, free, and can't hallucinate a lead that doesn't
 * exist, which matters more here than any fuzziness an AI call would add.
 */
import type { Lead } from '../store/types'

const MAX_RESULTS = 8

export function findLeads(leads: Lead[], query: string): Lead[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored = leads
    .map(lead => {
      const company = lead.company.toLowerCase()
      const contact = lead.contactName?.toLowerCase() ?? ''
      let score = -1
      if (company === q || contact === q) score = 3
      else if (company.startsWith(q) || contact.startsWith(q)) score = 2
      else if (company.includes(q) || contact.includes(q)) score = 1
      return { lead, score }
    })
    .filter(r => r.score >= 0)
    .sort((a, b) => b.score - a.score || a.lead.company.localeCompare(b.lead.company))

  return scored.slice(0, MAX_RESULTS).map(r => r.lead)
}
