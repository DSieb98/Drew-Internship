/**
 * Browser-safe Anthropic API helper.
 * Uses raw fetch because the @anthropic-ai/sdk targets Node.js.
 * Requires the `anthropic-dangerous-direct-browser-access` header so Anthropic
 * knows CORS is intentional for this single-user private tool.
 */

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>
}

interface AnthropicError {
  error?: { message?: string }
}

export async function askClaude(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as AnthropicError
    throw new Error(err.error?.message ?? `API error ${res.status}`)
  }

  const data = await res.json() as AnthropicResponse
  return data.content.find(b => b.type === 'text')?.text ?? ''
}
