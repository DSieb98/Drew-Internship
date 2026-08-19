/**
 * SynetheixSales credential proxy (M1-T00) + LACRM client (M1-T01).
 *
 * The static app on GitHub Pages cannot hold API secrets — anything shipped
 * to the browser is public. This Worker holds the real LACRM + Anthropic
 * keys server-side and exposes only the narrow operations the app actually
 * needs, so a leaked Worker URL can't be used for arbitrary LACRM or
 * Anthropic calls.
 *
 * LACRM uses its v2 API: POST https://api.lessannoyingcrm.com/v2/ with an
 * `Authorization: <API_KEY>` header (raw key, no "Bearer" prefix) and a
 * `{ Function, Parameters }` JSON body. Key is generated at
 * https://account.lessannoyingcrm.com/app/Settings/Api.
 */

export interface Env {
  ANTHROPIC_API_KEY: string
  LACRM_API_KEY: string
  // AI cost-budget tracking (D-39) — Workers KV namespace, one JSON-string-of-a-number
  // value per calendar month ("usage:YYYY-MM" -> cumulative USD spent). KV has no atomic
  // increment, so two requests landing in the same instant could race and one update could
  // be lost — accepted for this app's scale (one user, a handful of AI calls a day); not
  // safe to rely on if usage ever gets meaningfully concurrent. See worker/README.md for
  // the one-time `wrangler kv namespace create` step this binding needs.
  AI_COST_KV: KVNamespace
  // In-app feedback ("Feedback" nav page): one JSON value per submitted request, keyed
  // `feedback:<id>`, so Tim can type anything he thinks would help and Drew can see it next
  // time he's in the app instead of it living only in a conversation neither of them can find
  // again later. Same KV-is-good-enough-at-this-scale reasoning as AI_COST_KV — one user,
  // occasional submissions, no need for a real database. See worker/README.md.
  FEEDBACK_KV: KVNamespace
}

const ALLOWED_ORIGINS = new Set([
  'https://dsieb98.github.io',
  'http://localhost:5173', // vite dev
  'http://localhost:4173', // vite preview
])

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-haiku-4-5'
const LACRM_URL = 'https://api.lessannoyingcrm.com/v2/'

// ── AI cost budget (D-39) ────────────────────────────────────────────────
// Drew's confirmed hard cap: the AI assistant (Anthropic calls) may not cost
// more than this in a calendar month. Pricing is Claude Haiku 4.5's public
// per-million-token rate ($1.00 input / $5.00 output), current as of the
// model this Worker calls (see ANTHROPIC_MODEL above) — revisit both figures
// together if the model ever changes.
const MONTHLY_BUDGET_USD = 20
const HAIKU_INPUT_USD_PER_MTOK = 1.0
const HAIKU_OUTPUT_USD_PER_MTOK = 5.0

function currentUsageKey(): string {
  return `usage:${new Date().toISOString().slice(0, 7)}` // "usage:2026-08"
}

async function getMonthCostUsd(env: Env): Promise<number> {
  const raw = await env.AI_COST_KV.get(currentUsageKey())
  return raw ? Number(raw) || 0 : 0
}

async function addMonthCostUsd(env: Env, deltaUsd: number): Promise<number> {
  const key = currentUsageKey()
  const updated = (await getMonthCostUsd(env)) + deltaUsd
  await env.AI_COST_KV.put(key, String(updated))
  return updated
}

function estimateCostUsd(usage: { input_tokens: number; output_tokens: number }): number {
  return (
    (usage.input_tokens / 1_000_000) * HAIKU_INPUT_USD_PER_MTOK +
    (usage.output_tokens / 1_000_000) * HAIKU_OUTPUT_USD_PER_MTOK
  )
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin',
  }
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function json(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  })
}

// ── Anthropic ─────────────────────────────────────────────────────────────

interface AnthropicChatBody {
  prompt?: string
}

interface AnthropicUpstreamResponse {
  content: Array<{ type: string; text: string }>
  usage: { input_tokens: number; output_tokens: number }
}

interface AnthropicUpstreamError {
  error?: { message?: string }
}

async function handleAnthropicChat(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: AnthropicChatBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, origin)
  }

  const prompt = body.prompt?.trim()
  if (!prompt) return json({ error: 'Missing "prompt".' }, 400, origin)

  // D-39: hard cap — checked before spending anything this call. Best-effort under
  // concurrent requests (see the AI_COST_KV comment on Env), acceptable at this app's
  // real usage volume.
  const spentSoFar = await getMonthCostUsd(env)
  if (spentSoFar >= MONTHLY_BUDGET_USD) {
    return json(
      {
        error: `The AI assistant has reached its $${MONTHLY_BUDGET_USD.toFixed(2)} budget for this month. It'll be available again next month — everything else in SalesWhiz keeps working.`,
        budgetReached: true,
      },
      402,
      origin
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch {
    return json({ error: 'Could not reach the AI assistant right now. Please try again shortly.' }, 502, origin)
  }

  if (!upstream.ok) {
    const errBody = await upstream.json().catch(() => ({})) as AnthropicUpstreamError
    return json({ error: errBody.error?.message ?? `AI assistant error (${upstream.status}).` }, 502, origin)
  }

  const data = await upstream.json() as AnthropicUpstreamResponse
  const text = data.content.find(b => b.type === 'text')?.text ?? ''

  if (data.usage) {
    // Don't let a KV write failure break a successful answer — log-and-continue.
    try {
      await addMonthCostUsd(env, estimateCostUsd(data.usage))
    } catch {
      // best-effort; next request's budget check just runs on slightly-stale spend
    }
  }

  return json({ text }, 200, origin)
}

async function handleAnthropicUsage(env: Env, origin: string | null): Promise<Response> {
  const costUsd = await getMonthCostUsd(env)
  const remainingUsd = Math.max(0, MONTHLY_BUDGET_USD - costUsd)
  return json(
    {
      month: new Date().toISOString().slice(0, 7),
      costUsd,
      budgetUsd: MONTHLY_BUDGET_USD,
      remainingUsd,
      percentUsed: Math.min(100, (costUsd / MONTHLY_BUDGET_USD) * 100),
    },
    200,
    origin
  )
}

// ── In-app feedback ("Feedback" nav page) ───────────────────────────────────
// Deliberately not an LACRM concept (like Settings) — this is Tim-to-Drew
// communication about the app itself, not lead data, so it has no natural
// home in LACRM's contact/pipeline model. Stored in its own KV namespace
// instead, same pattern as AI_COST_KV.

interface FeedbackEntry {
  id: string
  text: string
  submittedAt: string
  status: 'new' | 'reviewed'
}

async function handleFeedbackSubmit(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: { text?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, origin)
  }

  const text = body.text?.trim()
  if (!text) return json({ error: 'Missing "text".' }, 400, origin)
  if (text.length > 4000) return json({ error: 'Request is too long (4000 characters max).' }, 400, origin)

  const entry: FeedbackEntry = {
    id: crypto.randomUUID(),
    text,
    submittedAt: new Date().toISOString(),
    status: 'new',
  }

  await env.FEEDBACK_KV.put(`feedback:${entry.id}`, JSON.stringify(entry))
  return json(entry, 200, origin)
}

async function handleFeedbackList(env: Env, origin: string | null): Promise<Response> {
  const list = await env.FEEDBACK_KV.list({ prefix: 'feedback:' })
  const entries = await Promise.all(
    list.keys.map(async k => {
      const raw = await env.FEEDBACK_KV.get(k.name)
      return raw ? (JSON.parse(raw) as FeedbackEntry) : null
    })
  )
  const sorted = entries
    .filter((e): e is FeedbackEntry => e !== null)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  return json({ entries: sorted }, 200, origin)
}

async function handleFeedbackUpdate(id: string, req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: { status?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, origin)
  }

  if (body.status !== 'new' && body.status !== 'reviewed') {
    return json({ error: 'status must be "new" or "reviewed".' }, 400, origin)
  }

  const key = `feedback:${id}`
  const raw = await env.FEEDBACK_KV.get(key)
  if (!raw) return json({ error: 'Not found.' }, 404, origin)

  const entry = { ...(JSON.parse(raw) as FeedbackEntry), status: body.status }
  await env.FEEDBACK_KV.put(key, JSON.stringify(entry))
  return json(entry, 200, origin)
}

// ── LACRM ─────────────────────────────────────────────────────────────────

interface LacrmSuccessEnvelope {
  Success?: boolean
  Error?: string
}

async function callLacrm<T>(env: Env, fn: string, parameters: Record<string, unknown> = {}): Promise<T> {
  const upstream = await fetch(LACRM_URL, {
    method: 'POST',
    headers: {
      Authorization: env.LACRM_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ Function: fn, Parameters: parameters }),
  })

  const data = await upstream.json().catch(() => null) as (T & LacrmSuccessEnvelope) | null
  if (!upstream.ok || !data || data.Success === false) {
    throw new Error(data?.Error ?? `LACRM error (${upstream.status}) calling ${fn}.`)
  }
  return data
}

async function lacrmRoute(fn: string, parameters: Record<string, unknown>, env: Env, origin: string | null): Promise<Response> {
  try {
    const data = await callLacrm(env, fn, parameters)
    return json(data, 200, origin)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reach LACRM right now. Please try again shortly.'
    return json({ error: message }, 502, origin)
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin')
    const url = new URL(req.url)
    const { pathname } = url
    const { method } = req

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (pathname === '/api/anthropic/chat' && method === 'POST') {
      return handleAnthropicChat(req, env, origin)
    }

    if (pathname === '/api/anthropic/usage' && method === 'GET') {
      return handleAnthropicUsage(env, origin)
    }

    if (pathname === '/api/lacrm/ping' && method === 'GET') {
      return lacrmRoute('GetUser', {}, env, origin)
    }

    if (pathname === '/api/lacrm/contacts' && method === 'GET') {
      const search = url.searchParams.get('search') ?? ''
      const page = Number(url.searchParams.get('page') ?? '1')
      const maxResults = Number(url.searchParams.get('maxResults') ?? '500')
      return lacrmRoute(
        'GetContacts',
        { SearchTerms: search, RecordTypeFilter: 'Contacts', Page: page, MaxNumberOfResults: maxResults },
        env,
        origin
      )
    }

    if (pathname === '/api/lacrm/contacts' && method === 'POST') {
      const body = await req.json().catch(() => ({})) as Record<string, unknown>
      return lacrmRoute('CreateContact', body, env, origin)
    }

    const contactMatch = pathname.match(/^\/api\/lacrm\/contacts\/([^/]+)$/)
    if (contactMatch && method === 'GET') {
      return lacrmRoute('GetContact', { ContactId: contactMatch[1] }, env, origin)
    }
    if (contactMatch && method === 'PATCH') {
      const body = await req.json().catch(() => ({})) as Record<string, unknown>
      return lacrmRoute('EditContact', { ContactId: contactMatch[1], ...body }, env, origin)
    }

    if (pathname === '/api/lacrm/pipelines' && method === 'GET') {
      return lacrmRoute('GetPipelines', {}, env, origin)
    }

    if (pathname === '/api/lacrm/pipeline-items' && method === 'GET') {
      const pipelineId = url.searchParams.get('pipelineId') ?? ''
      const page = Number(url.searchParams.get('page') ?? '1')
      const maxResults = Number(url.searchParams.get('maxResults') ?? '500')
      if (!pipelineId) return json({ error: 'Missing "pipelineId".' }, 400, origin)
      return lacrmRoute(
        'GetPipelineItems',
        { PipelineId: pipelineId, Page: page, MaxNumberOfResults: maxResults },
        env,
        origin
      )
    }

    if (pathname === '/api/lacrm/pipeline-items' && method === 'POST') {
      const body = await req.json().catch(() => ({})) as Record<string, unknown>
      return lacrmRoute('CreatePipelineItem', body, env, origin)
    }

    const pipelineItemMatch = pathname.match(/^\/api\/lacrm\/pipeline-items\/([^/]+)$/)
    if (pipelineItemMatch && method === 'PATCH') {
      const body = await req.json().catch(() => ({})) as Record<string, unknown>
      return lacrmRoute('EditPipelineItem', { PipelineItemId: pipelineItemMatch[1], ...body }, env, origin)
    }

    // ── M1-T04: custom fields (score/status/scoring-input sync) ────────────

    if (pathname === '/api/lacrm/custom-fields' && method === 'GET') {
      const page = Number(url.searchParams.get('page') ?? '1')
      const maxResults = Number(url.searchParams.get('maxResults') ?? '500')
      return lacrmRoute(
        'GetCustomFields',
        { RecordType: 'Contact', Page: page, MaxNumberOfResults: maxResults },
        env,
        origin
      )
    }

    if (pathname === '/api/lacrm/custom-fields' && method === 'POST') {
      const body = await req.json().catch(() => ({})) as Record<string, unknown>
      return lacrmRoute('CreateCustomField', body, env, origin)
    }

    // ── M1-T04: notes (call history sync) ───────────────────────────────────

    if (pathname === '/api/lacrm/notes' && method === 'GET') {
      const page = Number(url.searchParams.get('page') ?? '1')
      const maxResults = Number(url.searchParams.get('maxResults') ?? '500')
      return lacrmRoute('GetNotes', { Page: page, MaxNumberOfResults: maxResults }, env, origin)
    }

    if (pathname === '/api/lacrm/notes' && method === 'POST') {
      const body = await req.json().catch(() => ({})) as Record<string, unknown>
      return lacrmRoute('CreateNote', body, env, origin)
    }

    // ── In-app feedback ──────────────────────────────────────────────────

    if (pathname === '/api/feedback' && method === 'POST') {
      return handleFeedbackSubmit(req, env, origin)
    }

    if (pathname === '/api/feedback' && method === 'GET') {
      return handleFeedbackList(env, origin)
    }

    const feedbackMatch = pathname.match(/^\/api\/feedback\/([^/]+)$/)
    if (feedbackMatch && method === 'PATCH') {
      return handleFeedbackUpdate(feedbackMatch[1], req, env, origin)
    }

    return json({ error: 'Not found.' }, 404, origin)
  },
}
