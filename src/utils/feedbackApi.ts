/**
 * In-app feedback ("Feedback" nav page) — lets Tim type anything he thinks would help and
 * have it land somewhere Drew can see and act on, instead of it only living in a conversation.
 * Calls the credential-proxy Worker's /api/feedback endpoints (its own KV namespace, not an
 * LACRM concept — see worker/README.md), same client pattern as claudeApi.ts.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL

export type FeedbackStatus = 'new' | 'reviewed'

export interface FeedbackEntry {
  id: string
  text: string
  submittedAt: string
  status: FeedbackStatus
}

function requireWorkerUrl(): string {
  if (!WORKER_URL) {
    throw new Error('Feedback is not configured (missing VITE_WORKER_URL).')
  }
  return WORKER_URL
}

async function readJsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({})) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `API error ${res.status}`)
  }
  return data
}

export async function submitFeedback(text: string): Promise<FeedbackEntry> {
  const res = await fetch(`${requireWorkerUrl()}/api/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return readJsonOrThrow<FeedbackEntry>(res)
}

export async function getFeedbackList(): Promise<FeedbackEntry[]> {
  const res = await fetch(`${requireWorkerUrl()}/api/feedback`)
  const data = await readJsonOrThrow<{ entries: FeedbackEntry[] }>(res)
  return data.entries
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<FeedbackEntry> {
  const res = await fetch(`${requireWorkerUrl()}/api/feedback/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return readJsonOrThrow<FeedbackEntry>(res)
}
