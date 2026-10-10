import ZAI from 'z-ai-web-dev-sdk'

// Translates admin-written rejection notes between English and Amharic so the
// customer always reads the reason in their own UI language (and vice versa).
// Returns null when translation fails — callers then fall back to the original.

export type ReasonTranslations = { en: string; am: string } | null

const SYSTEM =
  'You are a precise translator for an Ethiopian online clothing store. You translate short payment-rejection notes between English and Amharic. Always answer with strict JSON only — no extra text, no markdown fences.'

function buildPrompt(text: string): string {
  return [
    'Translate this store note to BOTH English and natural Amharic (Ethiopic script).',
    'Keep it short and polite, keep any order numbers / amounts / method names unchanged.',
    'Set "detected" to the language the note is mostly written in: "en" or "am".',
    'Return JSON exactly like: {"detected":"en","en":"...","am":"..."}',
    '',
    `Note: ${text}`,
  ].join('\n')
}

function parseJson(raw: string): { en: string; am: string } | null {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { en?: unknown; am?: unknown }
    const en = typeof parsed.en === 'string' ? parsed.en.trim() : ''
    const am = typeof parsed.am === 'string' ? parsed.am.trim() : ''
    if (!en || !am) return null
    return { en, am }
  } catch {
    return null
  }
}

export async function translateRejection(text: string, retries = 2): Promise<ReasonTranslations> {
  const trimmed = text.trim()
  if (!trimmed) return null
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: SYSTEM },
          { role: 'user', content: buildPrompt(trimmed) },
        ],
        thinking: { type: 'disabled' },
      })
      const parsed = parseJson(completion.choices[0]?.message?.content ?? '')
      if (parsed) return parsed
    } catch (e) {
      console.error(`translateRejection attempt ${attempt} failed`, e)
    }
  }
  return null
}
