/**
 * LACRM API client (M1-T01/T03) via the credential proxy Worker (M1-T00).
 * Talks to LACRM's v2 API (Contacts, Pipelines, Pipeline Items) through the
 * Worker so the real API key never reaches the browser. See worker/README.md,
 * docs/specs/M1/M1-T01-lacrm-client-mapping.md, and M1-T03-lead-stage-sync.md.
 *
 * Read+write for contacts, read for pipelines, read+write for pipeline items
 * (a contact's placement + status within a pipeline — T03's stage sync),
 * custom fields (score/status-override/scoring-input sync — T04), and notes
 * (call-history sync — T04) are all implemented here.
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

// Pages through a `{ Results, HasMoreResults }`-shaped LACRM search endpoint. LACRM's pagination
// is a plain page NUMBER, not a cursor/token — unlike cursor pagination, a page doesn't depend on
// having already fetched the one before it, so pages can be requested concurrently instead of one
// at a time. A page past the real end just comes back `{ HasMoreResults: false, Results: [] }`
// (confirmed against the live API, not assumed), so speculatively requesting a batch of pages
// before knowing exactly where the data ends is safe — worst case a few of the last batch's
// requests are wasted. This is what makes hydrate() usable on large accounts (M1-T05 perf
// follow-up): a sequential loop over e.g. 15 pages of 500 contacts each took minutes on a real
// account; four pages in flight at once cuts that roughly 4x.
const PAGE_FETCH_CONCURRENCY = 4

async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ Results: T[]; HasMoreResults: boolean }>
): Promise<T[]> {
  const all: T[] = []
  let nextPage = 1
  let done = false
  while (!done) {
    const batchPages = Array.from({ length: PAGE_FETCH_CONCURRENCY }, (_, i) => nextPage + i)
    const batchResults = await Promise.all(batchPages.map(fetchPage))
    for (const result of batchResults) {
      all.push(...result.Results)
      if (!result.HasMoreResults) {
        done = true
        break // any further pages already in flight in this batch are past the end — ignore them
      }
    }
    nextPage += PAGE_FETCH_CONCURRENCY
  }
  return all
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

// M1-T04 custom-field keys. LACRM's Contacts API takes/returns custom field
// values as flat top-level keys named after the field (confirmed against the
// public v2 docs — same convention as the native 'Company Name'/'Job Title'
// keys below), not a nested FieldId/value array. The literal strings here
// must match the CF_* constants in lacrmMapping.ts exactly — that file owns
// the canonical names and the CreateCustomField bootstrap spec.
interface LacrmSalesforgeCustomFields {
  'SalesForge Score'?: number
  'SalesForge Score Breakdown'?: string
  'SalesForge Status Override'?: string
  'SalesForge Employees'?: number
  'SalesForge Annual Revenue'?: number
  'SalesForge Industry'?: string
  'SalesForge Deal Value'?: number
  // M1-T06 (D-26) — Watchlist sync. Dropdown, not Checkbox: LACRM's Checkbox
  // type is a multi-select-style field (an Options array with an undocumented
  // return shape), while Dropdown's plain-string in/out is already proven by
  // CF_STATUS_OVERRIDE above. 'Yes'/'No' over a real boolean for the same reason.
  'SalesForge Pinned'?: string
  'SalesForge Pinned Note'?: string
}

// LACRM's Contacts API uses literal space-containing keys for a few fields.
export interface LacrmContact extends LacrmSalesforgeCustomFields {
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
export interface LacrmContactInput extends LacrmSalesforgeCustomFields {
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

export interface LacrmPipelineItem {
  PipelineItemId: string
  PipelineId: string
  StatusId: string
  ContactId: string
}

export interface LacrmPipelineItemSearchResult {
  HasMoreResults: boolean
  Results: LacrmPipelineItem[]
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

export async function searchLacrmContacts(term: string, page = 1): Promise<LacrmContactSearchResult> {
  return request<LacrmContactSearchResult>(
    `/api/lacrm/contacts?search=${encodeURIComponent(term)}&page=${page}`
  )
}

/** Pages through GetContacts until HasMoreResults is false (concurrently, see fetchAllPages()).
 *  Used for the read-through hydrate — a single search() call only returns one page (up to 500
 *  results by default). */
export async function getAllLacrmContacts(term = ''): Promise<LacrmContact[]> {
  return fetchAllPages(page => searchLacrmContacts(term, page))
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

// ── Pipeline items (a contact's placement + status within a pipeline) ────

async function getPipelineItemsPage(pipelineId: string, page: number): Promise<LacrmPipelineItemSearchResult> {
  return request<LacrmPipelineItemSearchResult>(
    `/api/lacrm/pipeline-items?pipelineId=${encodeURIComponent(pipelineId)}&page=${page}`
  )
}

/** Pages through GetPipelineItems for one pipeline until HasMoreResults is false (concurrently). */
export async function getAllPipelineItems(pipelineId: string): Promise<LacrmPipelineItem[]> {
  return fetchAllPages(page => getPipelineItemsPage(pipelineId, page))
}

export async function createPipelineItem(
  contactId: string,
  pipelineId: string,
  statusId: string
): Promise<{ PipelineItemId: string }> {
  return request<{ PipelineItemId: string }>('/api/lacrm/pipeline-items', {
    method: 'POST',
    body: JSON.stringify({ ContactId: contactId, PipelineId: pipelineId, StatusId: statusId }),
  })
}

export async function editPipelineItem(pipelineItemId: string, statusId: string): Promise<void> {
  await request<Record<string, never>>(`/api/lacrm/pipeline-items/${encodeURIComponent(pipelineItemId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ StatusId: statusId }),
  })
}

// ── Custom fields (M1-T04 — score/status-override/scoring-input sync) ────

export interface LacrmCustomField {
  CustomFieldId: string
  Name: string
  Type: string
}

export interface LacrmCustomFieldSearchResult {
  HasMoreResults: boolean
  Results: LacrmCustomField[]
}

export interface LacrmCustomFieldInput {
  Name: string
  Type: string
  Options?: string[]
}

async function getCustomFieldsPage(page: number): Promise<LacrmCustomFieldSearchResult> {
  return request<LacrmCustomFieldSearchResult>(`/api/lacrm/custom-fields?page=${page}`)
}

/** Pages through GetCustomFields (Contact record type) until HasMoreResults is false
 *  (concurrently). Used to check which of SALESFORGE_CUSTOM_FIELDS already exist before
 *  bootstrap-creating the rest. */
export async function getCustomFields(): Promise<LacrmCustomField[]> {
  return fetchAllPages(getCustomFieldsPage)
}

export async function createCustomField(input: LacrmCustomFieldInput): Promise<{ CustomFieldId: string }> {
  return request<{ CustomFieldId: string }>('/api/lacrm/custom-fields', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// ── Notes (M1-T04 — call-history sync) ────────────────────────────────────

export interface LacrmNote {
  NoteId: string
  ContactId: string
  Note: string
  DateDisplayedInHistory?: string
}

export interface LacrmNoteSearchResult {
  HasMoreResults: boolean
  Results: LacrmNote[]
}

async function getNotesPage(page: number): Promise<LacrmNoteSearchResult> {
  return request<LacrmNoteSearchResult>(`/api/lacrm/notes?page=${page}`)
}

/** Pages through GetNotes (whole account, no ContactId filter — there's no bulk
 *  per-contact notes endpoint) until HasMoreResults is false (concurrently). Callers filter for
 *  SalesForge-authored call-log notes; see noteToCallLog() in lacrmMapping.ts. */
export async function getAllNotes(): Promise<LacrmNote[]> {
  return fetchAllPages(getNotesPage)
}

export async function createNote(
  contactId: string,
  note: string,
  dateDisplayedInHistory?: string
): Promise<{ NoteId: string }> {
  return request<{ NoteId: string }>('/api/lacrm/notes', {
    method: 'POST',
    body: JSON.stringify({
      ContactId: contactId,
      Note: note,
      ...(dateDisplayedInHistory ? { DateDisplayedInHistory: dateDisplayedInHistory } : {}),
    }),
  })
}
