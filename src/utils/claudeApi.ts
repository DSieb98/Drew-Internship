/**
 * Browser-safe Anthropic API helper.
 * Calls the SynetheixSales credential proxy Worker (M1-T00) instead of Anthropic
 * directly — the real API key lives server-side and never reaches the browser.
 * See worker/README.md and docs/specs/M1/M1-T00-credential-architecture.md.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL

interface ChatResponse {
  text?: string
  error?: string
}

export async function askClaude(prompt: string): Promise<string> {
  if (!WORKER_URL) {
    throw new Error('AI assistant is not configured (missing VITE_WORKER_URL).')
  }

  const res = await fetch(`${WORKER_URL}/api/anthropic/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  const data = await res.json().catch(() => ({})) as ChatResponse
  if (!res.ok) {
    // A 402 here means the Worker's monthly AI budget cap (D-39) was hit — data.error
    // already carries a Tim-readable explanation, so no special-casing needed beyond
    // surfacing it same as any other error.
    throw new Error(data.error ?? `API error ${res.status}`)
  }
  return data.text ?? ''
}

// D-39 — AI cost budget. Reads the Worker's running monthly Anthropic spend so the
// Reports dashboard can show it; the Worker (not this client) is the source of truth
// and the thing that actually enforces the cap on every askClaude() call.
export interface AiUsageStatus {
  month: string
  costUsd: number
  budgetUsd: number
  remainingUsd: number
  percentUsed: number
}

export async function getAiUsageStatus(): Promise<AiUsageStatus> {
  if (!WORKER_URL) {
    throw new Error('AI assistant is not configured (missing VITE_WORKER_URL).')
  }

  const res = await fetch(`${WORKER_URL}/api/anthropic/usage`)
  const data = await res.json().catch(() => ({})) as Partial<AiUsageStatus> & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `API error ${res.status}`)
  }
  return data as AiUsageStatus
}
