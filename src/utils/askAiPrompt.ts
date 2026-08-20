/**
 * Builds the lead-data portion of the AI assistant's prompt (AskAiDialog.tsx). Pulled out of
 * the component so the token-safety cap below is unit-testable without React.
 *
 * Found live 2026-08-20: selecting "All leads" scope against the real production account
 * (~21,212 leads) built a prompt that failed with "280498 tokens > 200000 maximum" — Anthropic
 * rejects any single request over its 200k-token context window, and summarizing every lead
 * blew past that by 80k tokens. MAX_LEADS_IN_PROMPT caps what actually goes in the prompt,
 * keeping every scope (including "All leads") safely under the limit at any real account size.
 */
import type { Lead } from '../store/types'

export const MAX_LEADS_IN_PROMPT = 300

export interface PromptLeadSelection {
  included: Lead[]
  truncated: boolean
}

// Sorted by score (hottest first) so, when a scope has to be cut, the leads represented are
// the ones most likely to matter for the kind of question this assistant gets asked
// ("who should I call first," "summarize my hot leads").
export function selectLeadsForPrompt(leads: Lead[], max: number = MAX_LEADS_IN_PROMPT): PromptLeadSelection {
  if (leads.length <= max) return { included: leads, truncated: false }
  const sorted = [...leads].sort((a, b) => b.score - a.score)
  return { included: sorted.slice(0, max), truncated: true }
}

// Deliberately excludes email, phone, and pinnedNote — the fields most likely to carry
// sensitive contact PII or Tim's private notes (PII boundary, M0-T11 gap G5).
export function summarizeLead(lead: Lead): string {
  const parts = [lead.company, `status ${lead.status}`, `score ${lead.score}/100`]
  if (lead.contactName) parts.push(`contact ${lead.contactName}`)
  if (lead.dealValue > 0) parts.push(`deal $${lead.dealValue.toLocaleString()}`)
  if (lead.stage) parts.push(`stage "${lead.stage}"`)
  parts.push(lead.lastContactDate ? `last contact ${lead.lastContactDate}` : 'never contacted')
  return `- ${parts.join(', ')}`
}
