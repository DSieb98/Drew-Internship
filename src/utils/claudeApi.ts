/**
 * Browser-safe Anthropic API helper.
 * Calls the SalesForge credential proxy Worker (M1-T00) instead of Anthropic
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
    throw new Error(data.error ?? `API error ${res.status}`)
  }
  return data.text ?? ''
}
