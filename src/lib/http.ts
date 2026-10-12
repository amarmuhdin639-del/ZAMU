// Fetch helper — always turns any error response into a clear, human message.
// Never crashes on a non-JSON error page (proxy 502 HTML, truncated reply, etc.).
const STATUS_HINTS: Record<number, string> = {
  400: 'the form data was not accepted',
  401: 'please log in again',
  403: 'you do not have permission for this action',
  404: 'the server route is missing — the site deploy may be outdated',
  409: 'conflict — the item may already exist or just went out of stock',
  413: 'the file is too large',
  429: 'too many requests — wait a moment and try again',
  500: 'server error — please try again',
  502: 'server temporarily unavailable — please try again',
  503: 'server temporarily unavailable — please try again',
}

export async function jsonOrThrow<T = Record<string, unknown>>(res: Response): Promise<T> {
  let text = ''
  try {
    text = await res.text()
  } catch {
    throw new Error(
      `The response did not arrive fully — check your connection and try again (${res.status})`
    )
  }

  let body: unknown = null
  let parsed = false
  if (text.trim()) {
    try {
      body = JSON.parse(text)
      parsed = true
    } catch {
      parsed = false
    }
  }

  if (!res.ok) {
    const serverMsg =
      parsed && body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : null
    throw new Error(
      serverMsg ??
        `Request failed (${res.status} — ${STATUS_HINTS[res.status] ?? 'unexpected server response'})`
    )
  }

  if (!parsed && text.trim()) {
    throw new Error(`The server sent an unexpected reply (${res.status})`)
  }
  return (parsed ? body : {}) as T
}
