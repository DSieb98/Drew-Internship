/**
 * Browser-safe company-research helper for the LeadCard "Research company" button (D-48).
 * Calls the SalesWhiz credential proxy Worker (same pattern as claudeApi.ts / D-21) — the
 * real search-provider API key lives server-side and never reaches the browser.
 *
 * The endpoint path is deliberately provider-neutral (`/api/company-research/search`, not
 * `/api/exa/search`) — the backing provider already switched once (Perplexity, which has no
 * free-tier key available → Exa's Answer API, which does search + synthesized summary +
 * citations in one call) with no reason for the app-facing contract to change. See
 * worker/src/index.ts's handleCompanyResearchExa and CLAUDE.md decision D-48.
 *
 * Only public, non-PII fields (company/city/state/industry) are sent; see the PII note
 * rendered alongside the button in LeadCard/CompanyResearchDialog.
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

  const res = await fetch(`${WORKER_URL}/api/company-research/search`, {
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

// ── Employees/revenue/industry enrichment (D-49) — Exa's Agent API ─────────
// Async (create a run, poll to a terminal status) per the build-with-exa skill's guidance:
// enrichment/structured-extraction tasks use the Agent API, not /search or /answer. Display-
// only for now (Drew's call, 2026-08-20) — this never writes to a Lead; a future write-back
// path, if added, is scoped to need human approval per touch, not silent/automatic.

export interface EnrichmentFields {
  employees: number | null
  annualRevenue: number | null
  industry: string | null
}

export interface EnrichmentResult {
  structured: EnrichmentFields
  citations: string[]
}

const ENRICH_POLL_INTERVAL_MS = 3000
const ENRICH_MAX_POLLS = 40 // ~2 minutes at the interval above, then a friendly timeout

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Runs one Exa Agent enrichment for a company and resolves once it completes. `onStatus` fires
 * on every poll (e.g. "pending", "running") so the caller can show progress — the run can
 * realistically take anywhere from a few seconds to over a minute.
 */
export async function enrichCompany(
  query: CompanyResearchQuery,
  onStatus?: (status: string) => void
): Promise<EnrichmentResult> {
  if (!WORKER_URL) {
    throw new Error('Company research is not configured (missing VITE_WORKER_URL).')
  }

  const createRes = await fetch(`${WORKER_URL}/api/company-research/enrich`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query),
  })
  const createData = await createRes.json().catch(() => ({})) as { runId?: string; error?: string }
  if (!createRes.ok || !createData.runId) {
    throw new Error(createData.error ?? `API error ${createRes.status}`)
  }
  const runId = createData.runId

  for (let attempt = 0; attempt < ENRICH_MAX_POLLS; attempt++) {
    await wait(ENRICH_POLL_INTERVAL_MS)

    const pollRes = await fetch(`${WORKER_URL}/api/company-research/enrich/${encodeURIComponent(runId)}`)
    const pollData = await pollRes.json().catch(() => ({})) as {
      status?: string
      structured?: EnrichmentFields
      citations?: string[]
      error?: string
    }
    if (!pollRes.ok) {
      throw new Error(pollData.error ?? `API error ${pollRes.status}`)
    }

    const status = pollData.status ?? 'unknown'
    onStatus?.(status)

    if (status === 'completed') {
      return {
        structured: pollData.structured ?? { employees: null, annualRevenue: null, industry: null },
        citations: pollData.citations ?? [],
      }
    }
    if (status === 'failed' || status === 'cancelled') {
      throw new Error(pollData.error ?? 'Company research did not complete successfully.')
    }
    // any other status (pending/running/etc.) — keep polling
  }

  throw new Error('Company research is taking longer than expected. Please try again in a moment.')
}
