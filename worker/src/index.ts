/**
 * SalesForge credential proxy (M1-T00) + LACRM client (M1-T01).
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
}

const ALLOWED_ORIGINS = new Set([
  'https://dsieb98.github.io',
  'http://localhost:5173', // vite dev
  'http://localhost:4173', // vite preview
])

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-haiku-4-5'
const LACRM_URL = 'https://api.lessannoyingcrm.com/v2/'

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
  return json({ text }, 200, origin)
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

    return json({ error: 'Not found.' }, 404, origin)
  },
}
