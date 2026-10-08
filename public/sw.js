/* ZAMU service worker — offline shell for weak Ethiopian networks.
 *
 * Strategy:
 *  - navigations (HTML): network-first with timeout -> cache fallback -> /offline.html
 *  - static assets (_next/static, icons, uploads, images): cache-first + background refresh
 *  - API calls: network only (always fresh prices/stock)
 *  - never cache POST/PUT/PATCH/DELETE
 */

const VERSION = 'zamu-v4'
const STATIC_CACHE = `${VERSION}-static`
const PAGE_CACHE = `${VERSION}-pages`
const OFFLINE_URL = '/offline.html'

const PRECACHE = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname === '/logo.svg' ||
    /\.(?:png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // same-origin GET only
  if (url.origin !== self.location.origin) return
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  // static assets: cache-first, refresh in background
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone())
            return res
          })
          .catch(() => null)
        if (cached) {
          fetchPromise.catch(() => {})
          return cached
        }
        const res = await fetchPromise
        return res || Response.error()
      })
    )
    return
  }

  // navigations: network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse
          if (preloaded) return preloaded
          const network = await Promise.race([
            fetch(request),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
          ])
          if (network && network.ok) {
            const cache = await caches.open(PAGE_CACHE)
            cache.put(request, network.clone())
          }
          return network
        } catch {
          const cachedPage = await caches.match(request)
          if (cachedPage) return cachedPage
          const offline = await caches.match(OFFLINE_URL)
          if (offline) return offline
          return new Response('<h1>You are offline</h1>', {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
          })
        }
      })()
    )
  }
})
