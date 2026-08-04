/**
 * LACRM connectivity check via the credential proxy Worker (M1-T00).
 * Full LACRM field mapping/sync is built in M1-T01+; this is only the
 * end-to-end credential mechanism proof.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL

interface PingResponse {
  ok: boolean
  error?: string
}

export async function pingLacrm(): Promise<{ ok: boolean; message: string }> {
  if (!WORKER_URL) {
    return { ok: false, message: 'LACRM connection is not configured (missing VITE_WORKER_URL).' }
  }

  try {
    const res = await fetch(`${WORKER_URL}/api/lacrm/ping`)
    const data = await res.json().catch(() => ({})) as PingResponse
    if (!res.ok || !data.ok) {
      return { ok: false, message: data.error ?? `LACRM connection failed (${res.status}).` }
    }
    return { ok: true, message: 'LACRM connection succeeded.' }
  } catch {
    return { ok: false, message: 'Could not reach the credential proxy. Please try again shortly.' }
  }
}
