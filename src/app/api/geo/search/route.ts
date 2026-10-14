import { NextRequest, NextResponse } from 'next/server'
import { searchPlaces } from '@/lib/geo-places'

// GET /api/geo/search?q=Gerji&lat=9.0&lon=38.75
// Area-name search for the checkout pin picker. lat/lon are optional bias -
// when present, results near the shop come first. Cached server-side, so
// repeat searches are instant and free.

export const runtime = 'nodejs'

// Tiny per-IP rate guard: the upstream geocoders are free services, keep ZAMU
// polite even if a bot finds the endpoint.
const hits = new Map<string, { n: number; win: number }>()
function limited(ip: string) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || now - h.win > 60_000) {
    if (hits.size > 500) hits.clear()
    hits.set(ip, { n: 1, win: now })
    return false
  }
  h.n += 1
  return h.n > 40
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 3 || q.length > 80) return NextResponse.json({ results: [] })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (limited(ip)) {
    return NextResponse.json({ results: [], error: 'Slow down a moment' }, { status: 429 })
  }
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? '')
  const lon = parseFloat(req.nextUrl.searchParams.get('lon') ?? '')
  const results = await searchPlaces(
    q,
    Number.isFinite(lat) ? lat : undefined,
    Number.isFinite(lon) ? lon : undefined
  )
  return NextResponse.json({ results })
}
