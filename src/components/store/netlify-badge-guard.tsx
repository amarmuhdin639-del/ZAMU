'use client'

import { useEffect } from 'react'

/**
 * ZAMU badge guard — silently removes Netlify's injected "Powered by
 * Netlify" badge and the "Build your own site with Netlify" promo popup
 * for every visitor, on every page, including after soft navigations.
 *
 * Two layers: a debounced sweep on DOM mutations + a 3 s watchdog sweep.
 * Our own DOM never contains "netlify" ids/classes (verified), so the
 * selectors below can never hit real store elements.
 */
const SELECTORS = [
  '[data-netlify-badge]',
  '[id^="netlify-"]',
  '[class*="netlify-badge"]',
  '[class*="netlify-ai"]',
  'netlify-badge',
  'netlify-ai-assistant',
  'iframe[src*="netlify"]',
  '[href^="https://www.netlify.com"]',
].join(',')

export function NetlifyBadgeGuard() {
  useEffect(() => {
    let queued = false
    const sweep = () => {
      try {
        document.querySelectorAll(SELECTORS).forEach((el) => el.remove())
      } catch {
        /* the guard must never break the page */
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
