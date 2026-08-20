/**
 * Local, deterministic lead search by company, contact name, city, state, or industry — powers
 * the AI assistant's "Find a lead" navigation (M0-T11/D-30, extended for D-31 — "find the guy
 * from this city" — and D-45 — industry). Kept as a plain client-side match rather than an LLM
 * round trip: it's instant, free, and can't hallucinate a lead that doesn't exist, which matters
 * more here than any fuzziness an AI call would add.
 *
 * Industry matching (D-45) is plain substring matching against `Lead.industry`'s free text —
 * there's no NAICS code system behind it, just whatever string was entered (LACRM custom field,
 * CF_INDUSTRY). "Find restaurants" matches a lead whose industry field says "Restaurants" the
 * same way "find the guy from dallas" matches on city — no classification/lookup table needed.
 */
import type { Lead } from '../store/types'
import { normalizeStateAbbr, stateFullName } from './usGeo'

const MAX_RESULTS = 8
const MIN_REVERSE_MATCH_LEN = 3

export interface LeadSearchResult {
  matches: Lead[]
  totalMatches: number
}

// Scores one field against the query. Beyond the usual "field starts with/contains query"
// (typing a partial name), also checks the reverse — "query contains field" — so a whole typed
// phrase like "the guy from dallas" still matches a lead whose city is "Dallas", not just an
// exact city-name lookup. Reverse matching is skipped for very short fields to avoid a 2-letter
// state code spuriously matching inside an unrelated word.
function fieldScore(field: string, query: string): number {
  const f = field.trim().toLowerCase()
  if (!f) return -1
  if (f === query) return 4
  if (f.startsWith(query) || query.startsWith(f)) return 3
  if (f.includes(query)) return 2
  if (f.length >= MIN_REVERSE_MATCH_LEN && query.includes(f)) return 2
  return -1
}

function leadMatchScore(lead: Lead, query: string, queryTokens: string[]): number {
  const fullStateName = stateFullName(lead.state)
  const stateAbbr = normalizeStateAbbr(lead.state)

  const scores = [
    fieldScore(lead.company, query),
    fieldScore(lead.contactName, query),
    fieldScore(lead.city, query),
    fullStateName ? fieldScore(fullStateName, query) : -1,
    // Word-boundary check for the 2-letter state code itself ("tx"), since fieldScore's
    // reverse-match length guard deliberately excludes it.
    stateAbbr && queryTokens.includes(stateAbbr.toLowerCase()) ? 3 : -1,
    lead.industry ? fieldScore(lead.industry, query) : -1,
  ]
  return Math.max(...scores)
}

export function findLeads(leads: Lead[], query: string): LeadSearchResult {
  const q = query.trim().toLowerCase()
  if (!q) return { matches: [], totalMatches: 0 }
  const queryTokens = q.split(/[^a-z0-9]+/).filter(Boolean)

  const scored = leads
    .map(lead => ({ lead, score: leadMatchScore(lead, q, queryTokens) }))
    .filter(r => r.score >= 0)
    // Best field match first; among ties, surface the hotter/higher-scored lead first (most
    // useful when a city match alone turns up many leads); company name breaks remaining ties.
    .sort((a, b) => b.score - a.score || b.lead.score - a.lead.score || a.lead.company.localeCompare(b.lead.company))

  return {
    matches: scored.slice(0, MAX_RESULTS).map(r => r.lead),
    totalMatches: scored.length,
  }
}
