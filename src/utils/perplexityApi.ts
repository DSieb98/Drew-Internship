/**
 * DORMANT (D-48, 2026-08-20) — not imported anywhere. Perplexity has no free-tier API key
 * available, so the live "Research company" feature uses Exa's Answer API instead — see
 * companyResearchApi.ts, which CompanyResearchDialog actually calls. This file is kept as-is
 * (unused) in case a Perplexity key becomes viable later; the matching Worker-side handler
 * (handleCompanyResearchPerplexity, also unused/unrouted) is in worker/src/index.ts.
 *
 * Browser-safe Perplexity API helper for the LeadCard "Research company" button.
 * Calls the SalesWhiz credential proxy Worker (same pattern as claudeApi.ts / D-21) — the
 * real Perplexity API key lives server-side and never reaches the browser.
 *
 * The Worker calls Perplexity's official Chat Completions API (the search-augmented "sonar"
 * model) — never the consumer perplexity.ai site, which its Terms of Service prohibit
 * automating. Only public, non-PII fields (company/city/state/industry) are sent; see the
 * PII note rendered alongside the button in LeadCard.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL

export interface CompanyResearchQuery {
  company: string
  city?: string | null
  state?: string | null
  industry?: string | null
}

export interface CompanyResearchResult {
  text: string
  citations: string[]
}

export async function researchCompany(query: CompanyResearchQuery): Promise<CompanyResearchResult> {
  if (!WORKER_URL) {
    throw new Error('Company research is not configured (missing VITE_WORKER_URL).')
  }

  const res = await fetch(`${WORKER_URL}/api/perplexity/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query),
  })

  const data = await res.json().catch(() => ({})) as Partial<CompanyResearchResult> & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `API error ${res.status}`)
  }
  return { text: data.text ?? '', citations: data.citations ?? [] }
}
