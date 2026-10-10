// Fetch helper — never crashes on a non-JSON error page (e.g. proxy 502 HTML).
export async function jsonOrThrow<T = Record<string, unknown>>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T
  } catch {
    throw new Error(`Request failed (${res.status} ${res.statusText || 'unexpected server response'})`)
  }
}
