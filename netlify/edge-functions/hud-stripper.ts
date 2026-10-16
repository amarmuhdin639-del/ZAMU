/**
 * ZAMU hud-stripper — removes Netlify's injected promo script
 * (<script src="/.netlify/scripts/hud?variant=public">) from every HTML
 * response at the edge, before any browser executes it. That script is
 * what draws the "Powered by Netlify" badge iframe (#nl-badge-frame)
 * and the "Build your own site" AI popup — so both disappear at the
 * source: for every visitor, zero flash, even with JS disabled.
 *
 * Fail-open: on any unexpected condition the original response is
 * returned untouched, so this can never break the store.
 */

// Netlify provides HTMLRewriter at the edge; it is not in the DOM lib.
type RewriterElement = { remove: () => void }
declare const HTMLRewriter: new () => {
  on: (
    selector: string,
    handlers: { element?: (el: RewriterElement) => void }
  ) => { transform: (response: Response) => Response }
}

const HUD_SCRIPT = 'script[src^="/.netlify/scripts/hud"]'

export default async (
  _request: Request,
  context: { next: () => Promise<Response> }
) => {
  const response = await context.next()
  try {
    const ct = response.headers.get('content-type') || ''
    if (!ct.includes('text/html')) return response
    return new HTMLRewriter()
      .on(HUD_SCRIPT, { element: (el) => el.remove() })
      .transform(response)
  } catch {
    return response
  }
}

export const config = { path: '/*' }
