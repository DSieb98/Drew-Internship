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
  // Company research button (LeadCard) — D-48. Originally built against Perplexity's Chat
  // Completions API, but Perplexity has no free-tier key available, so the live path is now
  // Exa's Answer API instead (search + synthesized summary + citations in one call, same
  // shape). EXA_API_KEY is the one actually used; PERPLEXITY_API_KEY / the Perplexity handler
  // are kept dormant in this file (unused, not wired to a route) in case a Perplexity key
  // becomes viable later — see handleCompanyResearchPerplexity below.
  EXA_API_KEY: string
  PERPLEXITY_API_KEY: string
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
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'
const PERPLEXITY_MODEL = 'sonar'
const EXA_URL = 'https://api.exa.ai/answer'
const EXA_AGENT_RUNS_URL = 'https://api.exa.ai/agent/runs'

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

// ── Company research (LeadCard "Research company" button, D-48) ────────────
// Each request is one user-initiated click for one company — no bulk/automated querying —
// and the answer is shown to Tim as-is inside SalesWhiz, never stored or redistributed.
// No lead PII beyond company name/city/state/industry is ever sent (see handleCompanyResearch*
// below) — same PII boundary as the Ask AI assistant (D-44/D-46).

interface CompanyResearchBody {
  company?: string
  city?: string
  state?: string
  industry?: string
}

function companyResearchPrompt(body: CompanyResearchBody): { company: string; prompt: string } | { error: string } {
  const company = body.company?.trim()
  if (!company) return { error: 'Missing "company".' }

  const location = [body.city?.trim(), body.state?.trim()].filter(Boolean).join(', ')
  const industry = body.industry?.trim()

  const prompt = `Give a concise, factual summary of the company "${company}"${location ? ` (based in ${location})` : ''}${industry ? `, which is in the ${industry} industry` : ''}. Cover what they do, approximate size if known, and any recent notable news. Keep it under 150 words and stick to verifiable public information — say plainly if you can't find reliable information rather than guessing.`

  return { company, prompt }
}

// ── Live path: Exa's Answer API ─────────────────────────────────────────────
// POST https://api.exa.ai/answer, `x-api-key: <key>` header, { query } body → one call does
// both the web search and the synthesized summary+citations (verified against Exa's real docs
// at https://exa.ai/docs/reference/answer 2026-08-20, not guessed — same habit as D-23/D-27b).
// Chosen over Perplexity (no free-tier key available) per Drew's pick 2026-08-20.

interface ExaUpstreamCitation {
  url?: string
}

interface ExaUpstreamResponse {
  answer?: string
  citations?: ExaUpstreamCitation[]
}

interface ExaUpstreamError {
  error?: string
  message?: string
}

async function handleCompanyResearchExa(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: CompanyResearchBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, origin)
  }

  const built = companyResearchPrompt(body)
  if ('error' in built) return json({ error: built.error }, 400, origin)

  let upstream: Response
  try {
    upstream = await fetch(EXA_URL, {
      method: 'POST',
      headers: {
        'x-api-key': env.EXA_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: built.prompt }),
    })
  } catch {
    return json({ error: 'Could not reach the company research service right now. Please try again shortly.' }, 502, origin)
  }

  if (!upstream.ok) {
    const errBody = await upstream.json().catch(() => ({})) as ExaUpstreamError
    return json({ error: errBody.error ?? errBody.message ?? `Company research error (${upstream.status}).` }, 502, origin)
  }

  const data = await upstream.json() as ExaUpstreamResponse
  const text = typeof data.answer === 'string' ? data.answer : ''
  const citations = (data.citations ?? []).map(c => c.url).filter((u): u is string => Boolean(u))
  return json({ text, citations }, 200, origin)
}

// ── Company enrichment (employees / revenue / industry) via Exa's Agent API ─
// Per the build-with-exa skill (2026-08-20): "list-building and enrichment workflows belong
// on the Agent API (/agent), not /search or /answer" — structured field extraction like this
// is exactly that shape, so it's a genuinely different endpoint from handleCompanyResearchExa
// above, not a variant of it. The Agent API is async: POST /agent/runs returns a run
// immediately, the caller must poll GET /agent/runs/{id} to a terminal status before reading
// results — see handleCreateEnrichmentRun / handleGetEnrichmentRun below and the skill's
// references/agent.md. `effort: 'low'` (cheap/fast) since this is three narrow, well-defined
// facts, not open-ended research.
//
// D-49, display-only for now (Drew's call): results are returned to the client and shown to
// Tim, but nothing here writes to a Lead — that's a deliberate, separate decision for later,
// gated on human approval when it happens (see CompanyResearchDialog.tsx).

const ENRICHMENT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    employees: {
      type: ['number', 'null'],
      description: 'Approximate current number of employees at the company. Null if not reliably determinable from public sources.',
    },
    annualRevenue: {
      type: ['number', 'null'],
      description: 'Approximate current annual revenue in US dollars (a plain number, not a string). Null if not reliably determinable from public sources.',
    },
    industry: {
      type: ['string', 'null'],
      description: "The company's primary industry or sector, in a few words. Null if not reliably determinable from public sources.",
    },
  },
  required: ['employees', 'annualRevenue', 'industry'],
}

interface EnrichmentFields {
  employees: number | null
  annualRevenue: number | null
  industry: string | null
}

interface ExaAgentCreateResponse {
  id?: string
  status?: string
}

interface ExaAgentRunResponse {
  status?: string
  output?: {
    text?: string
    structured?: EnrichmentFields
    grounding?: unknown
  }
  error?: string
}

async function handleCreateEnrichmentRun(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: CompanyResearchBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, origin)
  }

  const company = body.company?.trim()
  if (!company) return json({ error: 'Missing "company".' }, 400, origin)

  const location = [body.city?.trim(), body.state?.trim()].filter(Boolean).join(', ')
  const industryHint = body.industry?.trim()

  const query = `Research the company "${company}"${location ? ` (based in ${location})` : ''}${industryHint ? `, believed to be in the ${industryHint} industry` : ''} and find: (1) its approximate current number of employees, (2) its approximate current annual revenue in US dollars, (3) its primary industry or sector. Use reliable, recent public sources (its own website, LinkedIn, Crunchbase, news coverage). If a value can't be reliably determined, return null for that field rather than guessing.`

  let upstream: Response
  try {
    upstream = await fetch(EXA_AGENT_RUNS_URL, {
      method: 'POST',
      headers: {
        'x-api-key': env.EXA_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query,
        effort: 'low',
        outputSchema: ENRICHMENT_OUTPUT_SCHEMA,
      }),
    })
  } catch {
    return json({ error: 'Could not reach the company research service right now. Please try again shortly.' }, 502, origin)
  }

  if (!upstream.ok) {
    const errBody = await upstream.json().catch(() => ({})) as ExaUpstreamError
    return json({ error: errBody.error ?? errBody.message ?? `Company research error (${upstream.status}).` }, 502, origin)
  }

  const data = await upstream.json() as ExaAgentCreateResponse
  if (!data.id) return json({ error: 'Company research service did not return a run id.' }, 502, origin)
  return json({ runId: data.id, status: data.status ?? 'pending' }, 200, origin)
}

// The Agent API's docs describe `output.grounding` as "citations for text or structured
// fields" without pinning down an exact shape — rather than guess a schema, this walks
// whatever comes back and pulls out any `url` string it finds, at any nesting depth.
function extractCitationUrls(grounding: unknown): string[] {
  const urls = new Set<string>()
  function visit(node: unknown) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    const obj = node as Record<string, unknown>
    if (typeof obj.url === 'string') urls.add(obj.url)
    Object.values(obj).forEach(visit)
  }
  visit(grounding)
  return Array.from(urls)
}

async function handleGetEnrichmentRun(runId: string, env: Env, origin: string | null): Promise<Response> {
  let upstream: Response
  try {
    upstream = await fetch(`${EXA_AGENT_RUNS_URL}/${encodeURIComponent(runId)}`, {
      headers: { 'x-api-key': env.EXA_API_KEY },
    })
  } catch {
    return json({ error: 'Could not reach the company research service right now. Please try again shortly.' }, 502, origin)
  }

  if (!upstream.ok) {
    const errBody = await upstream.json().catch(() => ({})) as ExaUpstreamError
    return json({ error: errBody.error ?? errBody.message ?? `Company research error (${upstream.status}).` }, 502, origin)
  }

  const data = await upstream.json() as ExaAgentRunResponse
  const status = data.status ?? 'unknown'

  // Only a "completed" run carries real output — reading structured/grounding on any other
  // status would make a still-running or failed run look like an empty success (skill's own
  // Agent API pitfall list warns about exactly this).
  if (status === 'completed') {
    return json(
      { status, structured: data.output?.structured ?? null, citations: extractCitationUrls(data.output?.grounding) },
      200,
      origin
    )
  }
  if (status === 'failed' || status === 'cancelled') {
    return json({ status, error: data.error ?? 'The company research run did not complete successfully.' }, 200, origin)
  }
  return json({ status }, 200, origin)
}

// ── Dormant: Perplexity's Chat Completions API ──────────────────────────────
// Not wired to a route — no free-tier Perplexity key is available (2026-08-20), so this isn't
// callable today. Kept here, unused, in case that changes later; PERPLEXITY_API_KEY in Env is
// likewise unused while this stays dormant. Uses the search-augmented "sonar" model — the same
// product surface Perplexity's own chat UI calls, via their documented API with a key rather
// than by automating/scraping the perplexity.ai website (which its Terms of Service prohibit).

interface PerplexityUpstreamResponse {
  choices: Array<{ message: { content: string } }>
  citations?: string[]
}

interface PerplexityUpstreamError {
  error?: { message?: string }
}

// Exported (not imported anywhere) rather than left module-private, purely so `noUnusedLocals`
// doesn't flag intentionally-dormant code as dead code by accident.
export async function handleCompanyResearchPerplexity(req: Request, env: Env, origin: string | null): Promise<Response> {
  let body: CompanyResearchBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, origin)
  }

  const built = companyResearchPrompt(body)
  if ('error' in built) return json({ error: built.error }, 400, origin)

  let upstream: Response
  try {
    upstream = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: 'user', content: built.prompt }],
      }),
    })
  } catch {
    return json({ error: 'Could not reach the company research service right now. Please try again shortly.' }, 502, origin)
  }

  if (!upstream.ok) {
    const errBody = await upstream.json().catch(() => ({})) as PerplexityUpstreamError
    return json({ error: errBody.error?.message ?? `Company research error (${upstream.status}).` }, 502, origin)
  }

  const data = await upstream.json() as PerplexityUpstreamResponse
  const text = data.choices?.[0]?.message?.content ?? ''
  return json({ text, citations: data.citations ?? [] }, 200, origin)
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

    // D-48: provider-neutral path name on purpose — the backing search provider has already
    // switched once (Perplexity → Exa) without any reason for the app-facing contract to change.
    if (pathname === '/api/company-research/search' && method === 'POST') {
      return handleCompanyResearchExa(req, env, origin)
    }

    // D-49: employees/revenue/industry enrichment via Exa's Agent API — async create+poll,
    // see handleCreateEnrichmentRun/handleGetEnrichmentRun above.
    if (pathname === '/api/company-research/enrich' && method === 'POST') {
      return handleCreateEnrichmentRun(req, env, origin)
    }
    const enrichRunMatch = pathname.match(/^\/api\/company-research\/enrich\/([^/]+)$/)
    if (enrichRunMatch && method === 'GET') {
      return handleGetEnrichmentRun(enrichRunMatch[1], env, origin)
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
