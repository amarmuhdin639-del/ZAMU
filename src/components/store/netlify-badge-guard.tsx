'use client'

import { useEffect } from 'react'

/**
 * ZAMU badge guard (layer 2) — removes Netlify's runtime-injected
 * "Powered by Netlify" badge (#nl-badge-frame) and the "Build your own
 * site" promo popup for every visitor, on every page, including after
 * soft navigations.
 *
 * Layer 1 is netlify/edge-functions/hud-stripper.ts: it strips the hud
 * <script> from the HTML stream at the edge, so badge and popup usually
 * never exist at all. This client guard is the safety net in case the
 * edge strip ever fails or Netlify changes the shape.
 *
 * Each selector is swept in its OWN try/catch: one malformed selector
 * must never disable the whole guard again.
 */
const SELECTORS = [
  '#nl-badge-frame',
  'iframe[id^="nl-badge"]',
  'iframe[srcdoc*="netlify" i]',
  'script[src^="/.netlify/scripts/hud"]',
  '[data-netlify-badge]',
  '[id^="netlify-"]',
  '[class*="netlify-badge"]',
  '[class*="netlify-ai"]',
  'netlify-badge',
  'netlify-ai-assistant',
  'iframe[src*="netlify"]',
  'a[href^="https://www.netlify.com"]',
]

export function NetlifyBadgeGuard() {
  useEffect(() => {
    let queued = false
    const sweep = () => {
      for (const sel of SELECTORS) {
        try {
          document.querySelectorAll(sel).forEach((el) => el.remove())
        } catch {
          /* a single bad selector must never kill the rest */
        }
      }
    }
    const mo = new MutationObserver(() => {
      if (queued) return
      queued = true
      window.setTimeout(() => {
        queued = false
        sweep()
      }, 120)
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })
    sweep()
    const watchdog = window.setInterval(sweep, 3000)
    return () => {
      mo.disconnect()
      window.clearInterval(watchdog)
    }
  }, [])

  return null
}

export default NetlifyBadgeGuard
