#!/usr/bin/env bash
# ===============================================================
# ZAMU one-shot setup (v2, chat edition)
#   1. Restores the PWA (manifest, service worker, offline page,
#      install banner, notifications API, all app icons)
#   2. Fixes product create/edit: clear "SKU already exists" message + live SKU availability check while you type
#   3. Restores the whole payment-chain API (checkout, payment
#      upload, payment methods, admin payment approval) — the
#      "Unexpected token ... is not valid JSON" errors came from
#      these route files missing on GitHub, so the site returned
#      an HTML 404 page where the code expected JSON
#
# Safe: contains NO secrets, touches NO env vars, NO database.
# Usage: save next to package.json in your repo root, then:
#        bash zamu-setup.sh
# ===============================================================
set -u
cd "$(dirname "$0")"
[ -f package.json ] || { echo "ERROR: put zamu-setup.sh in your repo root (next to package.json) and run it there"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: node not found (run inside a Codespace)"; exit 1; }
MISS=0
step() { echo; echo "===== $1 ====="; }

step "1/5 Writing 20 project files"
mkdir -p public/icons src/lib src/components/store \
  "src/app/api/admin/products/[id]" \
  src/app/api/admin/notifications \
  src/app/api/admin/payments "src/app/api/admin/payments/[id]" \
  src/app/api/admin/payment-methods "src/app/api/admin/payment-methods/[id]" \
  "src/app/api/orders/[orderNumber]"

echo '  + src/app/manifest.ts'
cat > 'src/app/manifest.ts' <<'ZAMU_F01'
import type { MetadataRoute } from 'next'

// PWA manifest — ZAMU is installable: home screen icon, standalone window,
// offline-capable shell via /sw.js (low-bandwidth friendly).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ZAMU — Wear Your Style',
    short_name: 'ZAMU',
    description:
      'Family-owned streetwear store: football jerseys, baggy pants, oversized tees, hoodies and tracksuits. Pay with Telebirr, CBE Birr or bank transfer.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#141412',
    theme_color: '#141412',
    lang: 'en',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Shop', url: '/shop', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Track Order', url: '/track', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Wishlist', url: '/wishlist', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
ZAMU_F01

echo '  + public/sw.js'
cat > 'public/sw.js' <<'ZAMU_F02'
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
ZAMU_F02

echo '  + public/offline.html'
cat > 'public/offline.html' <<'ZAMU_F03'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Offline · ZAMU</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100svh; display: flex; align-items: center; justify-content: center;
      background: #faf9f5; color: #141412; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      text-align: center; padding: 24px;
    }
    .box { max-width: 420px; }
    /* geometric Z mark */
    .mark { width: 72px; height: 72px; margin: 0 auto 22px; position: relative; }
    .mark .top, .mark .bottom { position: absolute; left: 0; width: 72px; height: 13px; background: #141412; }
    .mark .top { top: 0; }
    .mark .bottom { bottom: 0; }
    .mark .diag { position: absolute; top: 0; right: 0; width: 0; height: 0;
      border-top: 59px solid #141412; border-left: 42px solid transparent; }
    .mark .sq { position: absolute; right: -8px; bottom: -8px; width: 12px; height: 12px; background: #141412; }
    h1 { font-size: 26px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 900; }
    p { margin-top: 12px; color: rgba(20,20,18,0.6); font-size: 14px; line-height: 1.6; }
    button {
      margin-top: 26px; background: #141412; color: #faf9f5; border: 0; border-radius: 0;
      padding: 15px 42px; font-weight: 800; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; cursor: pointer;
    }
    button:active { background: #3a3a36; }
    .am { margin-top: 18px; font-size: 13px; color: rgba(20,20,18,0.45); }
    .rule { width: 44px; height: 2px; background: #141412; margin: 20px auto 0; }
  </style>
</head>
<body>
  <div class="box">
    <div class="mark" aria-hidden="true"><span class="top"></span><span class="diag"></span><span class="bottom"></span><span class="sq"></span></div>
    <h1>ZAMU</h1>
    <div class="rule" aria-hidden="true"></div>
    <p>You're offline. Check your connection and try again — pages you visited before still work, and your bag is saved on this device.</p>
    <div class="am">ኢንተርኔት የለም — ግንኙነትዎን ያረጋግጡ እና እንደገና ይሞክሩ።</div>
    <button onclick="location.reload()">Try again</button>
  </div>
</body>
</html>
ZAMU_F03

echo '  + src/app/api/admin/notifications/route.ts'
cat > 'src/app/api/admin/notifications/route.ts' <<'ZAMU_F04'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const notifications = await db.notification.findMany({
    where: { audience: 'ADMIN' },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  const unread = notifications.filter((n) => !n.read).length
  return NextResponse.json({ notifications, unread })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  if (body?.id) {
    await db.notification.update({ where: { id: String(body.id) }, data: { read: true } }).catch(() => {})
  } else {
    await db.notification.updateMany({ where: { audience: 'ADMIN', read: false }, data: { read: true } })
  }
  return NextResponse.json({ ok: true })
}
ZAMU_F04

echo '  + src/components/store/pwa.tsx'
cat > 'src/components/store/pwa.tsx' <<'ZAMU_F05'
'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import { toast } from 'sonner'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'tibeb.pwa.dismissed'
const INSTALLED_KEY = 'tibeb.pwa.installed'

let deferredPrompt: InstallPromptEvent | null = null
const listeners = new Set<(v: InstallPromptEvent | null) => void>()

function setPrompt(e: InstallPromptEvent | null) {
  deferredPrompt = e
  listeners.forEach((fn) => fn(e))
}

/**
 * Registers the service worker (offline shell for weak networks) and
 * captures the browser install prompt for the banner / footer button.
 */
export function PWARegister({ siteName }: { siteName: string }) {
  const [installable, setInstallable] = useState<InstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // service worker — register immediately if the page already finished loading
    if ('serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register, { once: true })
    }
    // install prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
    }
    const onInstalled = () => {
      setPrompt(null)
      try {
        window.localStorage.setItem(INSTALLED_KEY, '1')
      } catch {}
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    const listener = (e: InstallPromptEvent | null) => setInstallable(e)
    listeners.add(listener)
    Promise.resolve().then(() => {
      if (deferredPrompt) setInstallable(deferredPrompt)
    })

    let dismissed = false
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === '1' || window.localStorage.getItem(INSTALLED_KEY) === '1'
    } catch {}
    if (deferredPrompt && !dismissed) {
      const timer = setTimeout(() => setShowBanner(true), 4000)
      return () => {
        clearTimeout(timer)
        listeners.delete(listener)
      }
    }
    return () => listeners.delete(listener)
  }, [])

  async function install() {
    if (!installable) return
    await installable.prompt()
    const choice = await installable.userChoice
    if (choice.outcome === 'accepted') toast.success(`${siteName} app installed`)
    setPrompt(null)
    setShowBanner(false)
  }

  function dismiss() {
    setShowBanner(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
  }

  if (!showBanner || !installable) return null

  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-2xl md:bottom-6 md:left-6 md:translate-x-0">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <p className="flex items-center gap-2 text-sm font-bold">
        <Download className="h-4 w-4 text-flame" /> <PWAInstallTitle siteName={siteName} />
      </p>
      <p className="mt-1 pr-4 text-xs leading-relaxed text-muted-foreground"><PWAInstallText /></p>
      <div className="mt-3 flex gap-2">
        <button onClick={install} className="flex-1 rounded-full bg-ink py-2.5 text-[11px] font-bold uppercase tracking-wider text-cream hover:bg-flame">
          <PWAInstallBtn />
        </button>
        <button onClick={dismiss} className="flex-1 rounded-full border border-border py-2.5 text-[11px] font-bold uppercase tracking-wider">
          <PWALaterBtn />
        </button>
      </div>
    </div>
  )
}

function PWAInstallTitle({ siteName }: { siteName: string }) {
  const { t } = useLang()
  return <>{t('pwa.installTitle', { site: siteName })}</>
}
function PWAInstallText() {
  const { t } = useLang()
  return <>{t('pwa.installText')}</>
}
function PWAInstallBtn() {
  const { t } = useLang()
  return <>{t('pwa.install')}</>
}
function PWALaterBtn() {
  const { t } = useLang()
  return <>{t('pwa.later')}</>
}

/** Footer "Install App" button — hidden until the browser allows install. */
export function PWAInstallButton() {
  const { t } = useLang()
  const [installable, setInstallable] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const listener = (e: InstallPromptEvent | null) => setInstallable(e)
    listeners.add(listener)
    Promise.resolve().then(() => {
      if (deferredPrompt) setInstallable(deferredPrompt)
    })
    let installed = false
    try {
      installed = window.localStorage.getItem(INSTALLED_KEY) === '1'
    } catch {}
    if (installed) return
    if (!('serviceWorker' in navigator)) return
    return () => listeners.delete(listener)
  }, [])

  if (!installable) return null

  async function install() {
    if (!installable) return
    await installable.prompt()
    await installable.userChoice
    setPrompt(null)
  }

  return (
    <button
      onClick={install}
      className="mt-5 inline-flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-cream/80 transition-colors hover:border-flame hover:text-flame"
    >
      <Download className="h-3.5 w-3.5" /> {t('footer.installApp')}
    </button>
  )
}
ZAMU_F05

echo '  + src/app/layout.tsx'
cat > 'src/app/layout.tsx' <<'ZAMU_F06'
import type { Metadata, Viewport } from 'next'
import { Anton, Archivo } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'ZAMU — Jerseys, Baggy Fits & Streetwear',
    template: '%s · ZAMU',
  },
  description:
    'ZAMU is a family-owned streetwear store: football jerseys, baggy pants, oversized tees, hoodies and tracksuits. Wear your style.',
  openGraph: {
    title: 'ZAMU — Wear Your Style',
    description: 'Jerseys, baggy fits & streetwear made for your everyday.',
    type: 'website',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ZAMU',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#141412',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster position="top-center" richColors toastOptions={{ style: { fontFamily: 'var(--font-archivo)' } }} />
      </body>
    </html>
  )
}
ZAMU_F06

echo '  + src/app/(storefront)/layout.tsx'
cat > 'src/app/(storefront)/layout.tsx' <<'ZAMU_F07'
import { Header } from '@/components/store/header'
import { Footer } from '@/components/store/footer'
import { MobileNav } from '@/components/store/mobile-nav'
import { CartDrawer } from '@/components/store/cart-drawer'
import { PWARegister } from '@/components/store/pwa'
import { LanguageProvider } from '@/lib/i18n'
import { db } from '@/lib/db'
import { getSettings, SETTING_DEFAULTS } from '@/lib/queries'
import { getSessionUser } from '@/lib/auth'

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSettings(), getSessionUser()])
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, slug: true },
    take: 12,
  })
  const map = { ...SETTING_DEFAULTS, ...settings }

  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col">
        <Header
          siteName={map.siteName}
          announcement={map.announcement}
          user={user}
          categories={categories}
        />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Footer settings={map} />
        <MobileNav />
        <CartDrawer />
        <PWARegister siteName={map.siteName} />
      </div>
    </LanguageProvider>
  )
}
ZAMU_F07

echo '  + src/lib/translate-rejection.ts'
cat > 'src/lib/translate-rejection.ts' <<'ZAMU_F08'
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
ZAMU_F08

echo '  + src/lib/http.ts'
cat > 'src/lib/http.ts' <<'ZAMU_F09'
// Fetch helper — never crashes on a non-JSON error page (e.g. proxy 502 HTML).
export async function jsonOrThrow<T = Record<string, unknown>>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T
  } catch {
    throw new Error(`Request failed (${res.status} ${res.statusText || 'unexpected server response'})`)
  }
}
ZAMU_F09

echo '  + src/lib/media.ts'
cat > 'src/lib/media.ts' <<'ZAMU_F10'
// Shared media helpers — safe for server and client components.

const VIDEO_RE = /\.(mp4|m4v|mov|webm)(\?|#|$)/i

export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false
  return VIDEO_RE.test(url)
}
ZAMU_F10

echo '  + src/app/api/admin/products/route.ts'
cat > 'src/app/api/admin/products/route.ts' <<'ZAMU_F11'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/shared'

const productSchema = z.object({
  name: z.string().min(2).max(120),
  sku: z.string().min(2).max(40),
  description: z.string().min(10).max(5000),
  price: z.number().positive().max(1000000),
  salePrice: z.number().positive().max(1000000).nullable().optional(),
  categoryId: z.string().min(1),
  customCategory: z.string().max(80).nullable().optional(),
  stock: z.number().int().min(0).max(100000),
  sizes: z.string().min(1).max(100),
  colors: z.string().min(2).max(4000),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  active: z.boolean().optional(),
  images: z.array(z.object({ url: z.string().min(1).max(300), alt: z.string().max(150).optional() })).max(8).optional(),
})

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sp = req.nextUrl.searchParams
  const q = sp.get('q') ?? ''
  const products = await db.product.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
    },
    take: 200,
  })
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = productSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product data' }, { status: 400 })
  }
  const d = parsed.data
  const baseSlug = slugify(d.name)
  let slug = baseSlug
  for (let i = 1; i < 50; i++) {
    const exists = await db.product.findUnique({ where: { slug } })
    if (!exists) break
    slug = `${baseSlug}-${i}`
  }
  const skuExists = await db.product.findUnique({ where: { sku: d.sku } })
  if (skuExists) {
    return NextResponse.json(
      { error: `SKU "${d.sku}" is already used by "${skuExists.name}". Choose a different, unique SKU.` },
      { status: 409 }
    )
  }

  const product = await db.product.create({
    data: {
      name: d.name,
      slug,
      sku: d.sku,
      description: d.description,
      price: d.price,
      salePrice: d.salePrice ?? null,
      categoryId: d.categoryId,
      customCategory: d.customCategory ?? null,
      stock: d.stock,
      sizes: d.sizes,
      colors: d.colors,
      featured: d.featured ?? false,
      isNew: d.isNew ?? false,
      bestSeller: d.bestSeller ?? false,
      active: d.active ?? true,
      images: d.images?.length ? { create: d.images.map((img, i) => ({ url: img.url, alt: img.alt ?? d.name, sortOrder: i })) } : undefined,
    },
  })

  await db.auditLog.create({
    data: { adminId: admin.id, adminName: admin.name, action: 'PRODUCT_CREATED', details: `Created product ${d.name} (${d.sku})` },
  })
  return NextResponse.json({ product })
}
ZAMU_F11

echo '  + src/app/api/admin/products/[id]/route.ts'
cat > 'src/app/api/admin/products/[id]/route.ts' <<'ZAMU_F12'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  sku: z.string().min(2).max(40).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.number().positive().max(1000000).optional(),
  salePrice: z.number().positive().max(1000000).nullable().optional(),
  categoryId: z.string().min(1).optional(),
  customCategory: z.string().max(80).nullable().optional(),
  stock: z.number().int().min(0).max(100000).optional(),
  sizes: z.string().min(1).max(100).optional(),
  colors: z.string().min(2).max(4000).optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  active: z.boolean().optional(),
  images: z.array(z.object({ url: z.string().min(1).max(300), alt: z.string().max(150).optional() })).max(8).optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const d = parsed.data

  const existing = await db.product.findUnique({ where: { id }, include: { images: true } })
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // SKU uniqueness on edit — a taken SKU would otherwise crash into the unique constraint
  if (d.sku && d.sku !== existing.sku) {
    const skuOwner = await db.product.findUnique({ where: { sku: d.sku } })
    if (skuOwner) {
      return NextResponse.json(
        { error: `SKU "${d.sku}" is already used by "${skuOwner.name}". Choose a different, unique SKU.` },
        { status: 409 }
      )
    }
  }

  const data: Record<string, unknown> = { ...d }
  delete data.images

  const product = await db.$transaction(async (tx) => {
    if (d.images) {
      await tx.productImage.deleteMany({ where: { productId: id } })
      if (d.images.length) {
        await tx.productImage.createMany({
          data: d.images.map((img, i) => ({ productId: id, url: img.url, alt: img.alt ?? existing.name, sortOrder: i })),
        })
      }
    }
    return tx.product.update({ where: { id }, data, include: { images: true } })
  })

  // audit notable changes
  const changes: string[] = []
  if (d.price !== undefined && d.price !== existing.price) changes.push(`price ${existing.price}→${d.price}`)
  if (d.stock !== undefined && d.stock !== existing.stock) changes.push(`stock ${existing.stock}→${d.stock}`)
  if (d.salePrice !== undefined && d.salePrice !== existing.salePrice) changes.push('sale price')
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      adminName: admin.name,
      action: changes.length ? 'PRODUCT_UPDATED' : 'PRODUCT_EDITED',
      details: `Updated ${existing.name}${changes.length ? ` (${changes.join(', ')})` : ''}`,
    },
  })
  return NextResponse.json({ product })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const orderItems = await db.orderItem.count({ where: { productId: id } })
  if (orderItems > 0) {
    // keep order history intact — deactivate instead of hard delete
    await db.product.update({ where: { id }, data: { active: false } })
    await db.auditLog.create({
      data: { adminId: admin.id, adminName: admin.name, action: 'PRODUCT_ARCHIVED', details: `${existing.name} has order history — deactivated instead of deleted` },
    })
    return NextResponse.json({ ok: true, archived: true })
  }
  await db.product.delete({ where: { id } })
  await db.auditLog.create({
    data: { adminId: admin.id, adminName: admin.name, action: 'PRODUCT_DELETED', details: `Deleted product ${existing.name} (${existing.sku})` },
  })
  return NextResponse.json({ ok: true })
}
ZAMU_F12

echo '  + src/app/api/payment-methods/route.ts'
cat > 'src/app/api/payment-methods/route.ts' <<'ZAMU_F13'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Public: active payment methods shown to customers during checkout
export async function GET() {
  const methods = await db.paymentMethod.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, accountNumber: true, accountName: true, phone: true, instructions: true },
  })
  return NextResponse.json({ methods })
}
ZAMU_F13

echo '  + src/app/api/orders/route.ts'
cat > 'src/app/api/orders/route.ts' <<'ZAMU_F14'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(20),
        size: z.string().min(1).max(10),
        color: z.string().min(1).max(40),
      })
    )
    .min(1)
    .max(30),
  customerName: z.string().min(2).max(80),
  phone: z.string().min(7).max(20).regex(/^[0-9+\s-]+$/, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().min(2).max(80),
  address: z.string().min(5).max(300),
  notes: z.string().max(500).optional().or(z.literal('')),
  telegram: z.string().max(60).optional().or(z.literal('')),
  whatsapp: z.string().max(60).optional().or(z.literal('')),
  deliveryZoneId: z.string().min(1),
  discountCode: z.string().max(40).optional().or(z.literal('')),
})

function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const digits = Math.floor(10000 + Math.random() * 90000)
  return `ORD-${year}-${digits}`
}

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid order data' }, { status: 400 })
    }
    const data = parsed.data
    const user = await getSessionUser()

    // ---- fetch products & validate ----
    const productIds = data.items.map((i) => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const item of data.items) {
      const p = productMap.get(item.productId)
      if (!p) return NextResponse.json({ error: 'One of the products is no longer available' }, { status: 400 })
      if (p.stock <= 0) return NextResponse.json({ error: `${p.name} is sold out` }, { status: 409 })
      if (item.qty > p.stock) return NextResponse.json({ error: `Only ${p.stock} left of ${p.name}` }, { status: 409 })
      // requested size/color must exist on the product
      const sizes = p.sizes.split(',').map((s) => s.trim())
      if (!sizes.includes(item.size)) return NextResponse.json({ error: `Size ${item.size} not available for ${p.name}` }, { status: 400 })
    }

    // ---- server-side price calculation (never trust the browser) ----
    let subtotal = 0
    const orderItems = data.items.map((item) => {
      const p = productMap.get(item.productId)!
      const unit = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price
      subtotal += unit * item.qty
      return {
        productId: p.id,
        name: p.name,
        image: p.images.length ? p.images[0].url : null,
        price: unit,
        qty: item.qty,
        size: item.size,
        color: item.color,
      }
    })

    // ---- delivery fee from DB zone ----
    const zone = await db.deliveryZone.findFirst({ where: { id: data.deliveryZoneId, active: true } })
    if (!zone) return NextResponse.json({ error: 'Please choose a valid delivery zone' }, { status: 400 })
    const deliveryFee = zone.fee

    // ---- discount code ----
    let discount = 0
    let usedCode: string | null = null
    if (data.discountCode) {
      const code = await db.discountCode.findUnique({ where: { code: data.discountCode.trim().toUpperCase() } })
      const now = new Date()
      const valid =
        code &&
        code.active &&
        subtotal >= code.minOrder &&
        (!code.startsAt || code.startsAt <= now) &&
        (!code.endsAt || code.endsAt >= now) &&
        (code.usageLimit === null || code.usedCount < code.usageLimit)
      if (!valid) return NextResponse.json({ error: 'Discount code is not valid for this order' }, { status: 400 })
      discount = code.type === 'PERCENT' ? Math.round(subtotal * (code.value / 100) * 100) / 100 : code.value
      discount = Math.min(discount, subtotal)
      usedCode = code.code
      await db.discountCode.update({ where: { id: code.id }, data: { usedCount: { increment: 1 } } })
    }

    const total = Math.max(0, subtotal + deliveryFee - discount)

    // ---- create order + items + decrement stock in a transaction ----
    const order = await db.$transaction(async (tx) => {
      // re-check stock inside transaction to prevent overselling
      for (const item of data.items) {
        const p = await tx.product.findUnique({ where: { id: item.productId } })
        if (!p || p.stock < item.qty) {
          throw new Error(`INSUFFICIENT_STOCK:${p?.name ?? 'Product'}`)
        }
      }
      let orderNumber = generateOrderNumber()
      // guarantee uniqueness
      for (let i = 0; i < 5; i++) {
        const exists = await tx.order.findUnique({ where: { orderNumber } })
        if (!exists) break
        orderNumber = generateOrderNumber()
      }
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: user?.id ?? null,
          customerName: data.customerName,
          phone: data.phone,
          email: data.email || null,
          city: data.city,
          address: data.address,
          notes: data.notes || null,
          telegram: data.telegram || null,
          whatsapp: data.whatsapp || null,
          subtotal,
          deliveryFee,
          discount,
          total,
          discountCode: usedCode,
          deliveryZoneId: zone.id,
          status: 'PAYMENT_PENDING',
          paymentStatus: 'PENDING',
          items: { create: orderItems },
        },
      })
      for (const item of data.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.qty } } })
      }
      return created
    })

    // ---- notifications (in-app; email/SMS hooks can be added later) ----
    await db.notification.create({
      data: {
        audience: 'ADMIN',
        title: 'New order received',
        body: `${order.orderNumber} — ${order.customerName} · ${data.items.length} item(s) · awaiting payment`,
        link: `/admin/orders/${order.id}`,
      },
    })

    return NextResponse.json({ orderNumber: order.orderNumber, total: order.total })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.startsWith('INSUFFICIENT_STOCK')) {
      return NextResponse.json({ error: `${msg.split(':')[1]} just went out of stock. Please review your cart.` }, { status: 409 })
    }
    console.error('order create error', e)
    return NextResponse.json({ error: 'Could not place the order. Please try again.' }, { status: 500 })
  }
}
ZAMU_F14

echo '  + src/app/api/orders/[orderNumber]/payment/route.ts'
cat > 'src/app/api/orders/[orderNumber]/payment/route.ts' <<'ZAMU_F15'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'payments')

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

function detectMagic(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp'
  return null
}

const schema = z.object({
  methodName: z.string().min(1).max(60),
  transactionRef: z.string().min(3).max(80),
  payerName: z.string().min(2).max(80),
  amount: z.number().positive().max(1000000),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) {
  try {
    const { orderNumber } = await ctx.params
    const order = await db.order.findUnique({ where: { orderNumber }, include: { payment: true } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.payment && order.payment.status === 'VERIFIED') {
      return NextResponse.json({ error: 'This order is already paid and verified.' }, { status: 409 })
    }
    if (order.payment && order.payment.status === 'PENDING') {
      return NextResponse.json(
        { error: 'Your payment is already submitted and waiting for verification.' },
        { status: 409 }
      )
    }

    const form = await req.formData()
    const screenshot = form.get('screenshot')
    const fields = schema.safeParse({
      methodName: form.get('methodName'),
      transactionRef: form.get('transactionRef'),
      payerName: form.get('payerName'),
      amount: Number(form.get('amount')),
    })
    if (!fields.success) {
      return NextResponse.json({ error: fields.error.issues[0]?.message ?? 'Invalid payment details' }, { status: 400 })
    }
    if (!(screenshot instanceof File) || screenshot.size === 0) {
      return NextResponse.json({ error: 'Payment screenshot is required' }, { status: 400 })
    }
    if (screenshot.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Screenshot is too large (max 5MB)' }, { status: 413 })
    }
    const buffer = Buffer.from(await screenshot.arrayBuffer())
    const magic = detectMagic(buffer)
    // magic bytes are the source of truth; if a MIME type is declared it must match
    if (!magic || (screenshot.type && screenshot.type !== magic)) {
      return NextResponse.json({ error: 'Screenshot must be a real JPG, PNG or WEBP image' }, { status: 415 })
    }

    const filename = `${orderNumber}-${crypto.randomBytes(8).toString('hex')}${ALLOWED_MIME[magic]}`

    // 1) authoritative copy: the database (works on serverless hosts — Turso)
    try {
      await db.mediaAsset.upsert({
        where: { path: `payments/${filename}` },
        update: { data: buffer, mime: magic!, size: buffer.length },
        create: { path: `payments/${filename}`, data: buffer, mime: magic!, size: buffer.length },
      })
    } catch (e) {
      console.error('payment screenshot db write failed', e)
      return NextResponse.json({ error: 'Could not save the screenshot. Please try again.' }, { status: 500 })
    }

    // 2) best-effort private disk copy (local dev convenience only — serverless
    //    filesystems are read-only; the DB copy above is what matters)
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer)
    } catch {
      /* read-only filesystem (Netlify etc.) — safe to ignore */
    }

    const payment = await db.$transaction(async (tx) => {
      if (order.payment) {
        // previous submission was rejected — replace it
        await tx.payment.delete({ where: { id: order.payment.id } })
      }
      return tx.payment.create({
        data: {
          orderId: order.id,
          methodName: fields.data.methodName,
          transactionRef: fields.data.transactionRef,
          payerName: fields.data.payerName,
          amount: fields.data.amount,
          screenshotPath: filename,
          status: 'PENDING',
        },
      })
    })

    await db.notification.create({
      data: {
        audience: 'ADMIN',
        title: 'Payment confirmation requires verification',
        body: `${order.orderNumber} — ${fields.data.methodName} · ${fields.data.amount} ETB · from ${fields.data.payerName}`,
        link: `/admin/payments`,
      },
    })
    if (order.userId) {
      await db.notification.create({
        data: {
          audience: 'CUSTOMER',
          userId: order.userId,
          title: 'Payment submitted',
          body: `We received your payment confirmation for ${order.orderNumber}. Our team will verify it shortly.`,
          link: `/track?orderNumber=${order.orderNumber}`,
        },
      })
    }

    return NextResponse.json({ ok: true, paymentId: payment.id })
  } catch (e) {
    console.error('payment upload error', e)
    return NextResponse.json({ error: 'Could not submit payment. Please try again.' }, { status: 500 })
  }
}
ZAMU_F15

echo '  + src/app/api/orders/[orderNumber]/payment-info/route.ts'
cat > 'src/app/api/orders/[orderNumber]/payment-info/route.ts' <<'ZAMU_F16'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { translateRejection } from '@/lib/translate-rejection'

// Minimal public order info for the payment page (no address / customer details)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await ctx.params
  const order = await db.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    select: {
      orderNumber: true,
      total: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
      payment: {
        select: {
          id: true,
          status: true,
          methodName: true,
          transactionRef: true,
          payerName: true,
          rejectionReason: true,
          rejectionReasonEn: true,
          rejectionReasonAm: true,
        },
      },
      items: { select: { name: true, image: true, qty: true, size: true, color: true, price: true } },
    },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // legacy rejected payments have no translations yet — backfill once and persist
  const p = order.payment
  if (p?.rejectionReason && !p.rejectionReasonEn && !p.rejectionReasonAm && p.id) {
    try {
      const tr = await translateRejection(p.rejectionReason)
      if (tr) {
        await db.payment.update({
          where: { id: p.id },
          data: { rejectionReasonEn: tr.en, rejectionReasonAm: tr.am },
        })
        await db.order.update({
          where: { orderNumber: order.orderNumber },
          data: { rejectionReasonEn: tr.en, rejectionReasonAm: tr.am },
        })
        p.rejectionReasonEn = tr.en
        p.rejectionReasonAm = tr.am
      }
    } catch (e) {
      console.error('reason translation backfill failed', e)
    }
  }

  // strip the internal id again — not part of the public payload
  if (p) delete (p as { id?: string }).id
  return NextResponse.json({ order: { ...order, payment: p } })
}
ZAMU_F16

echo '  + src/app/api/admin/payments/route.ts'
cat > 'src/app/api/admin/payments/route.ts' <<'ZAMU_F17'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const status = req.nextUrl.searchParams.get('status') // PENDING | VERIFIED | REJECTED
  const payments = await db.payment.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        select: {
          id: true, orderNumber: true, customerName: true, phone: true, total: true, createdAt: true, status: true, paymentStatus: true,
          items: { select: { name: true, qty: true, size: true, color: true } },
        },
      },
    },
    take: 200,
  })
  return NextResponse.json({ payments })
}
ZAMU_F17

echo '  + src/app/api/admin/payments/[id]/route.ts'
cat > 'src/app/api/admin/payments/[id]/route.ts' <<'ZAMU_F18'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { translateRejection } from '@/lib/translate-rejection'

const schema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const payment = await db.payment.findUnique({ where: { id }, include: { order: true } })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  if (parsed.data.action === 'APPROVE') {
    await db.$transaction([
      db.payment.update({
        where: { id },
        data: { status: 'VERIFIED', reviewedBy: admin.name, reviewedAt: new Date(), rejectionReason: null },
      }),
      db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'VERIFIED', status: 'PAYMENT_VERIFIED', rejectionReason: null } }),
      // start the customer-visible fulfillment timeline
      db.orderUpdate.create({
        data: { orderId: payment.orderId, status: 'PAYMENT_VERIFIED', informed: true },
      }),
    ])
    await db.auditLog.create({
      data: { adminId: admin.id, adminName: admin.name, action: 'PAYMENT_APPROVED', details: `${payment.order.orderNumber} · ${payment.methodName} · ${payment.amount} ETB` },
    })
    if (payment.order.userId) {
      await db.notification.create({
        data: {
          audience: 'CUSTOMER',
          userId: payment.order.userId,
          title: 'Your payment has been verified',
          body: `Payment for ${payment.order.orderNumber} was verified. Your order is moving forward!`,
          link: `/track?orderNumber=${payment.order.orderNumber}`,
        },
      })
    }
  } else {
    const reason = parsed.data.reason?.trim()
    if (!reason) return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
    // auto-translate the reason so EN and AM customers each read it in their language
    const tr = await translateRejection(reason)
    const reasonFields = { rejectionReason: reason, rejectionReasonEn: tr?.en ?? null, rejectionReasonAm: tr?.am ?? null }
    await db.$transaction([
      db.payment.update({
        where: { id },
        data: { status: 'REJECTED', reviewedBy: admin.name, reviewedAt: new Date(), ...reasonFields },
      }),
      db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'REJECTED', ...reasonFields } }),
    ])
    await db.auditLog.create({
      data: { adminId: admin.id, adminName: admin.name, action: 'PAYMENT_REJECTED', details: `${payment.order.orderNumber}: ${reason}` },
    })
    if (payment.order.userId) {
      await db.notification.create({
        data: {
          audience: 'CUSTOMER',
          userId: payment.order.userId,
          title: 'Payment rejected',
          body: `Payment for ${payment.order.orderNumber} was rejected: ${reason}`,
          link: `/track?orderNumber=${payment.order.orderNumber}`,
        },
      })
    }
  }
  return NextResponse.json({ ok: true })
}
ZAMU_F18

echo '  + src/app/api/admin/payment-methods/route.ts'
cat > 'src/app/api/admin/payment-methods/route.ts' <<'ZAMU_F19'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(60),
  accountNumber: z.string().min(1).max(80),
  accountName: z.string().min(1).max(80),
  phone: z.string().max(40).optional().or(z.literal('')),
  instructions: z.string().max(1000).optional().or(z.literal('')),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const methods = await db.paymentMethod.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ methods })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const method = await db.paymentMethod.create({ data: { ...parsed.data, phone: parsed.data.phone || null, instructions: parsed.data.instructions || null } })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Added payment method ${parsed.data.name}` } })
  return NextResponse.json({ method })
}
ZAMU_F19

echo '  + src/app/api/admin/payment-methods/[id]/route.ts'
cat > 'src/app/api/admin/payment-methods/[id]/route.ts' <<'ZAMU_F20'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  accountNumber: z.string().min(1).max(80).optional(),
  accountName: z.string().min(1).max(80).optional(),
  phone: z.string().max(40).nullable().optional(),
  instructions: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const method = await db.paymentMethod.update({ where: { id }, data: parsed.data })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Updated payment method ${method.name}` } })
  return NextResponse.json({ method })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const m = await db.paymentMethod.delete({ where: { id } }).catch(() => null)
  if (m) {
    await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Deleted payment method ${m.name}` } })
  }
  return NextResponse.json({ ok: true })
}
ZAMU_F20

step "2/5 Patching big files (dictionary + product form)"
rm -rf .zamu-tmp && mkdir -p .zamu-tmp
cat > .zamu-tmp/dict.snippet <<'ZAMU_S_DICT'
  'admin.form.skuFree': { en: 'Available — you can use this SKU', am: 'ክፍት ነው — ይህን SKU መጠቀም ይችላሉ' },
  'admin.form.skuTaken': { en: 'Already used by: {name}', am: 'ይህ SKU ቀድሞ በሚከተለው ተይዟል: {name}' },
ZAMU_S_DICT

cat > .zamu-tmp/form-state.snippet <<'ZAMU_S_FORM-STATE'
  // Live SKU availability hint — checks while typing so the owner never hits
  // the "SKU already exists" wall after filling the whole form. Best-effort:
  // any network problem just hides the hint.
  const [skuCheck, setSkuCheck] = useState<{ sku: string; takenBy: string | null } | null>(null)
  useEffect(() => {
    const sku = form.sku.trim()
    if (sku.length < 2) {
      setSkuCheck(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/products?q=${encodeURIComponent(sku)}`)
        if (!res.ok) return
        const data = await jsonOrThrow<{ products?: { id: string; sku: string; name: string }[] }>(res)
        const hit = (data.products ?? []).find(
          (p) => p.sku.toUpperCase() === sku.toUpperCase() && p.id !== product?.id
        )
        setSkuCheck({ sku, takenBy: hit ? hit.name : null })
      } catch {
        /* hint is optional */
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [form.sku])
ZAMU_S_FORM-STATE

cat > .zamu-tmp/form-hint.snippet <<'ZAMU_S_FORM-HINT'
              {skuCheck && skuCheck.sku === form.sku.trim() && (
                skuCheck.takenBy
                  ? <p className="mt-1 text-xs font-medium text-red-600">&#10007; {t('admin.form.skuTaken', { name: skuCheck.takenBy })}</p>
                  : <p className="mt-1 text-xs font-medium text-emerald-600">&#10003; {t('admin.form.skuFree')}</p>
              )}
ZAMU_S_FORM-HINT

cat > .zamu-tmp/patch.cjs <<'ZAMU_PATCH_CJS'
const fs = require('fs');
let fail = 0;
const read = (f) => fs.readFileSync(f, 'utf8');

// ---- 1) i18n dictionary: add the two SKU hint keys ----
{
  const f = 'src/lib/i18n-dict.ts';
  try {
    let s = read(f);
    if (s.includes('admin.form.skuFree')) {
      console.log('SKIP  i18n-dict.ts (SKU keys already present)');
    } else {
      const snip = fs.readFileSync('.zamu-tmp/dict.snippet', 'utf8');
      const re = /export const DICT[^\n]*\{\n/;
      if (!re.test(s)) { console.log('FAIL  i18n-dict.ts: could not find the DICT opening line'); fail++; }
      else { s = s.replace(re, (m) => m + snip); fs.writeFileSync(f, s); console.log('OK    i18n-dict.ts: SKU hint keys added'); }
    }
  } catch (e) { console.log('FAIL  i18n-dict.ts: ' + e.message); fail++; }
}

// ---- 2) product form: live SKU availability check ----
{
  const f = 'src/components/admin/product-form.tsx';
  try {
    let s = read(f);
    if (s.includes('skuCheck')) {
      console.log('SKIP  product-form.tsx (live SKU check already present)');
    } else {
      let ok = true;
      // 2a. make sure useEffect is imported
      s = s.replace(/import \{([^}]*)\} from 'react'/, (m, inner) =>
        /\beffect\b|useEffect/.test(inner) ? m : `import { useEffect, ${inner.trim()} } from 'react'`);
      // 2b. make sure jsonOrThrow is imported
      if (!s.includes('jsonOrThrow')) {
        s = s.replace(/(import \{[^}]*\} from 'react'\n)/, "$1import { jsonOrThrow } from '@/lib/http'\n");
      }
      // 2c. insert the state + effect block before upload()
      const anchorRe = /\n+  async function upload\(files: FileList \| null\) \{/;
      const block = fs.readFileSync('.zamu-tmp/form-state.snippet', 'utf8');
      if (!anchorRe.test(s)) { console.log('FAIL  product-form.tsx: could not find upload() anchor'); fail++; ok = false; }
      else s = s.replace(anchorRe, '\n\n' + block + '\n  async function upload(files: FileList | null) {');
      // 2d. insert the hint JSX right after the SKU input
      if (ok) {
        const re = /^( *<Input id="psku"[^\n]*\n)/m;
        const hint = fs.readFileSync('.zamu-tmp/form-hint.snippet', 'utf8');
        if (!re.test(s)) { console.log('FAIL  product-form.tsx: could not find the SKU input anchor'); fail++; ok = false; }
        else s = s.replace(re, (m) => m + hint);
      }
      if (ok) { fs.writeFileSync(f, s); console.log('OK    product-form.tsx: live SKU check added'); }
    }
  } catch (e) { console.log('FAIL  product-form.tsx: ' + e.message); fail++; }
}

process.exit(fail ? 1 : 0);
ZAMU_PATCH_CJS
node .zamu-tmp/patch.cjs || MISS=$((MISS+1))

step "3/5 Generating PWA icons"
cat > .zamu-tmp/icons.cjs <<'ZAMU_ICONS_CJS'
const zlib = require('zlib'), fs = require('fs');
const T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
function crc(b) { let c = 0xFFFFFFFF; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, cb]);
}
function png(w, h, px) {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ih),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const BG = [0x14, 0x14, 0x12, 0xff], FG = [0xF5, 0xF1, 0xE8, 0xff];
const G = ['#######', '.....#.', '....#..', '...#...', '..#....', '.#.....', '#######'];
function draw(size, frac) {
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) px.set(BG, i * 4);
  const box = size * frac, cell = box / 7, off = (size - box) / 2;
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (G[r][c] === '#') {
    const x0 = Math.round(off + c * cell), x1 = Math.round(off + (c + 1) * cell);
    const y0 = Math.round(off + r * cell), y1 = Math.round(off + (r + 1) * cell);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.set(FG, (y * size + x) * 4);
  }
  return png(size, size, px);
}
const targets = [
  ['public/icons/icon-192.png', 192, 0.62],
  ['public/icons/icon-512.png', 512, 0.62],
  ['public/icons/maskable-512.png', 512, 0.50],
  ['public/icons/apple-touch-icon.png', 180, 0.62],
  ['src/app/icon.png', 192, 0.62],
  ['src/app/apple-icon.png', 180, 0.62],
];
fs.mkdirSync('public/icons', { recursive: true });
for (const [f, s, fr] of targets) { fs.writeFileSync(f, draw(s, fr)); console.log('icon  ' + f + '  ' + s + 'x' + s); }
console.log('OK    icons generated (ink background, cream Z)');
ZAMU_ICONS_CJS
node .zamu-tmp/icons.cjs || MISS=$((MISS+1))
rm -rf .zamu-tmp

step "4/5 Verifying"
FILES=(
  'src/app/manifest.ts'
  'public/sw.js'
  'public/offline.html'
  'src/app/api/admin/notifications/route.ts'
  'src/components/store/pwa.tsx'
  'src/app/layout.tsx'
  'src/app/(storefront)/layout.tsx'
  'src/lib/translate-rejection.ts'
  'src/lib/http.ts'
  'src/lib/media.ts'
  'src/app/api/admin/products/route.ts'
  'src/app/api/admin/products/[id]/route.ts'
  'src/app/api/payment-methods/route.ts'
  'src/app/api/orders/route.ts'
  'src/app/api/orders/[orderNumber]/payment/route.ts'
  'src/app/api/orders/[orderNumber]/payment-info/route.ts'
  'src/app/api/admin/payments/route.ts'
  'src/app/api/admin/payments/[id]/route.ts'
  'src/app/api/admin/payment-methods/route.ts'
  'src/app/api/admin/payment-methods/[id]/route.ts'
)
for f in "${FILES[@]}"; do
  if [ -s "$f" ]; then echo "PASS  $f"; else echo "FAIL  missing or empty: $f"; MISS=$((MISS+1)); fi
done
chk() { if grep -qF "$2" "$1" 2>/dev/null; then echo "PASS  $1"; else echo "FAIL  fix-marker missing in $1"; MISS=$((MISS+1)); fi; }
chk src/app/layout.tsx "manifest.webmanifest"
chk "src/app/(storefront)/layout.tsx" "PWARegister"
chk src/components/store/pwa.tsx "beforeinstallprompt"
chk public/sw.js "zamu-v"
chk public/offline.html "ZAMU"
chk src/lib/i18n-dict.ts "admin.form.skuFree"
chk src/components/admin/product-form.tsx "skuCheck"
chk src/app/api/admin/products/route.ts "is already used by"
chk "src/app/api/admin/products/[id]/route.ts" "skuOwner"
for f in public/icons/icon-192.png public/icons/icon-512.png public/icons/maskable-512.png public/icons/apple-touch-icon.png src/app/icon.png src/app/apple-icon.png; do
  if [ -s "$f" ]; then echo "PASS  $f"; else echo "FAIL  missing icon: $f"; MISS=$((MISS+1)); fi
done

step "5/5 Result"
echo
if [ "$MISS" -eq 0 ]; then
  echo "ALL CHECKS PASSED."
  echo
  echo "Now commit and push:"
  echo "  git add -A"
  echo '  git commit -m "Restore PWA, fix SKU duplicate error, restore payment APIs"'
  echo "  git push"
  echo
  echo "Then in Netlify: Deploys -> Trigger deploy -> Clear cache and deploy site"
else
  echo "$MISS check(s) FAILED — send the full output above to the assistant."
fi
echo
[ "$MISS" -eq 0 ] || exit 1