/**
 * SalesForge credential proxy (M1-T00).
 *
 * The static app on GitHub Pages cannot hold API secrets — anything shipped
 * to the browser is public. This Worker holds the real LACRM + Anthropic
 * keys server-side and exposes only the two narrow operations the app
 * actually needs, so a leaked Worker URL can't be used for arbitrary LACRM
 * or Anthropic calls.
 */

export interface Env {
  ANTHROPIC_API_KEY: string
  LACRM_USER_CODE: string
  LACRM_API_TOKEN: string
}

const ALLOWED_ORIGINS = new Set([
  'https://dsieb98.github.io',
  'http://localhost:5173', // vite dev
  'http://localhost:4173', // vite preview
])

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-haiku-4-5'
const LACRM_URL = 'https://api.lessannoyingcrm.com'

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

interface LacrmUpstreamResponse {
  Success?: boolean
  Error?: string
}

async function handleLacrmPing(env: Env, origin: string | null): Promise<Response> {
  const url = new URL(LACRM_URL)
  url.searchParams.set('UserCode', env.LACRM_USER_CODE)
  url.searchParams.set('APIToken', env.LACRM_API_TOKEN)
  url.searchParams.set('Function', 'GetUserInfo')

  let upstream: Response
  try {
    upstream = await fetch(url.toString())
  } catch {
    return json({ ok: false, error: 'Could not reach LACRM right now. Please try again shortly.' }, 502, origin)
  }

  const data = await upstream.json().catch(() => null) as LacrmUpstreamResponse | null
  if (!data || data.Success !== true) {
    return json({ ok: false, error: data?.Error ?? 'LACRM rejected the stored credentials.' }, 502, origin)
  }
  return json({ ok: true }, 200, origin)
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin')
    const url = new URL(req.url)

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (url.pathname === '/api/anthropic/chat' && req.method === 'POST') {
      return handleAnthropicChat(req, env, origin)
    }
    if (url.pathname === '/api/lacrm/ping' && req.method === 'GET') {
      return handleLacrmPing(env, origin)
    }
    return json({ error: 'Not found.' }, 404, origin)
  },
}
