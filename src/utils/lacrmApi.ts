/**
 * LACRM API client (M1-T01) via the credential proxy Worker (M1-T00).
 * Talks to LACRM's v2 API (Contacts + Pipelines) through the Worker so the
 * real API key never reaches the browser. See worker/README.md and
 * docs/specs/M1/M1-T01-lacrm-client-mapping.md.
 *
 * Only read+write for contacts and read for pipelines is implemented here —
 * that's T01's scope. Pipeline-item (stage) writes, notes, and custom fields
 * (score/hot-alert/nurture) are mapped in lacrmMapping.ts but wired up by
 * T03/T04, which own the actual sync logic.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL

interface WorkerErrorBody {
  error?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!WORKER_URL) {
    throw new Error('LACRM is not configured (missing VITE_WORKER_URL).')
  }
  const res = await fetch(`${WORKER_URL}${path}`, {
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  })
  const data = await res.json().catch(() => ({})) as T & WorkerErrorBody
  if (!res.ok) {
    throw new Error(data.error ?? `LACRM request failed (${res.status}).`)
  }
  return data
}

// ── Types (LACRM v2 shapes — see account.lessannoyingcrm.com/api_docs/v2) ──

export interface LacrmEmail { Text: string; Type?: string }
export interface LacrmPhone { Text: string; Type?: string }
export interface LacrmAddress {
  Street?: string
  City?: string
  State?: string
  Zip?: string
  Country?: string
  Type?: string
}

// LACRM's Contacts API uses literal space-containing keys for a few fields.
export interface LacrmContact {
  ContactId: string
  IsCompany: boolean
  AssignedTo?: number
  Name: { FirstName: string; LastName: string }
  Email?: LacrmEmail[]
  Phone?: LacrmPhone[]
  Address?: LacrmAddress[]
  'Company Name'?: string
  'Job Title'?: string
  'Background Info'?: string
}

// CreateContact/EditContact take Name as a single string; GetContact returns
// it split into { FirstName, LastName } — that's a real LACRM asymmetry, not
// a mistake here.
export interface LacrmContactInput {
  IsCompany: boolean
  AssignedTo?: number
  Name: string
  Email?: LacrmEmail[]
  Phone?: LacrmPhone[]
  Address?: LacrmAddress[]
  'Company Name'?: string
  'Job Title'?: string
  'Background Info'?: string
}

export interface LacrmContactSearchResult {
  HasMoreResults: boolean
  Results: LacrmContact[]
}

export interface LacrmPipelineStatus {
  StatusId: string
  Name: string
  IsActive?: boolean
}

export interface LacrmPipeline {
  PipelineId: string
  Name: string
  Statuses: LacrmPipelineStatus[]
}

// ── Connectivity ─────────────────────────────────────────────────────────

export async function pingLacrm(): Promise<{ ok: boolean; message: string }> {
  try {
    const user = await request<{ FirstName: string; LastName: string; Email: string }>('/api/lacrm/ping')
    const name = [user.FirstName, user.LastName].filter(Boolean).join(' ')
    return { ok: true, message: name ? `LACRM connection succeeded (${name}).` : 'LACRM connection succeeded.' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reach LACRM right now. Please try again shortly.'
    return { ok: false, message }
  }
}

// ── Contacts (leads) ─────────────────────────────────────────────────────

export async function searchLacrmContacts(term: string): Promise<LacrmContact[]> {
  const result = await request<LacrmContactSearchResult>(`/api/lacrm/contacts?search=${encodeURIComponent(term)}`)
  return result.Results
}

export async function getLacrmContact(contactId: string): Promise<LacrmContact> {
  return request<LacrmContact>(`/api/lacrm/contacts/${encodeURIComponent(contactId)}`)
}

export async function createLacrmContact(input: LacrmContactInput): Promise<{ ContactId: string }> {
  return request<{ ContactId: string }>('/api/lacrm/contacts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateLacrmContact(contactId: string, input: Partial<LacrmContactInput>): Promise<void> {
  await request<Record<string, never>>(`/api/lacrm/contacts/${encodeURIComponent(contactId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

// ── Pipelines (stages) ───────────────────────────────────────────────────

export async function getLacrmPipelines(): Promise<LacrmPipeline[]> {
  return request<LacrmPipeline[]>('/api/lacrm/pipelines')
}
