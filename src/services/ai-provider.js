const PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'claude'

async function callClaude(message, context = '') {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'claude', message, context }),
  })
  if (!response.ok) throw new Error('Claude API error')
  return response.json()
}

export async function processMessage(message, context) {
  if (PROVIDER === 'claude') return callClaude(message, context)
  throw new Error(`Provider ${PROVIDER} not implemented`)
}
