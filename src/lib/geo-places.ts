// Server-side place search + reverse geocoding for the ZAMU maps.
//
// Why this exists: a phone's first GPS fix can land 5-10 km off, and an
// embedded Google map cannot be dragged to set a pin (cross-origin). What a
// customer CAN do is type where they live - "Gerji", "Piassa", "Sarbet" -
// and tap the right result. That single tap is worth more than any arrow pad
// for kilometre-scale errors.
//
// Providers (both free, no API key): Photon (komoot) first - fast, no UA
// policy, supports lat/lon bias so results start near the shop - with
// Nominatim as the fallback (same OpenStreetMap data). Everything is cached
// in memory: search 1 h, area names 24 h, so a busy checkout day costs the
// upstream services almost nothing.

type Spot = { label: string; detail: string; lat: number; lng: number }

const UA = 'ZAMU-store/1.0 (store contact: hello@zamu.store)'

const searchCache = new Map<string, { at: number; spots: Spot[] }>()
const areaCache = new Map<string, { at: number; name: string | null }>()
const SEARCH_TTL = 3_600_000 // 1 hour
const AREA_TTL = 86_400_000 // 24 hours

function trimCache(map: Map<string, unknown>, max: number) {
  if (map.size <= max) return
  for (const k of [...map.keys()].slice(0, map.size - max)) map.delete(k)
}

// Photon's data has "Adis Ababa" (one d) in places - normalize so customers
// see the correct spelling of their capital.
function fixAddis(s: string) {
  return /^adis ababa$/i.test(s) ? 'Addis Ababa' : s
}

function photonParts(p: Record<string, unknown>): string[] {
  const g = (k: string) => (typeof p[k] === 'string' && p[k] ? fixAddis(p[k] as string) : '')
  return [...new Set([g('name'), g('street'), g('district'), g('city'), g('state')].filter(Boolean))]
}

async function photonSearch(q: string, lat?: number, lon?: number): Promise<Spot[]> {
  const u = new URL('https://photon.komoot.io/api/')
  u.searchParams.set('q', q)
  u.searchParams.set('limit', '6')
  u.searchParams.set('lang', 'en')
  if (typeof lat === 'number' && typeof lon === 'number') {
    u.searchParams.set('lat', lat.toFixed(4))
    u.searchParams.set('lon', lon.toFixed(4))
  }
  const res = await fetch(u, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`photon ${res.status}`)
  const data = (await res.json()) as {
    features?: { properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }[]
  }
  const out: Spot[] = []
  for (const f of data.features ?? []) {
    const c = f.geometry?.coordinates
    if (!c || c.length < 2) continue
    const parts = photonParts(f.properties ?? {})
    if (parts.length === 0) continue
    out.push({ label: parts[0], detail: parts.slice(1).join(', '), lat: c[1], lng: c[0] })
  }
  return out
}

async function nominatimSearch(q: string): Promise<Spot[]> {
  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.searchParams.set('q', `${q} Ethiopia`)
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('limit', '6')
  u.searchParams.set('accept-language', 'en')
  u.searchParams.set('countrycodes', 'et')
  const res = await fetch(u, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`nominatim ${res.status}`)
  const rows = (await res.json()) as { lat: string; lon: string; name?: string; display_name?: string }[]
  return rows
    .map((r) => ({
      label: r.name || (r.display_name ?? '').split(',')[0]?.trim() || 'Unnamed place',
      detail: (r.display_name ?? '').split(',').slice(1).join(',').trim(),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
}

export async function searchPlaces(q: string, lat?: number, lon?: number): Promise<Spot[]> {
  const key =
    q.trim().toLowerCase() +
    '|' +
    (typeof lat === 'number' ? lat.toFixed(2) : '') +
    '|' +
    (typeof lon === 'number' ? lon.toFixed(2) : '')
  const hit = searchCache.get(key)
  if (hit && Date.now() - hit.at < SEARCH_TTL) return hit.spots
  let spots: Spot[] = []
  try {
    spots = await photonSearch(q, lat, lon)
  } catch {
    try {
      spots = await nominatimSearch(q)
    } catch {
      spots = []
    }
  }
  searchCache.set(key, { at: Date.now(), spots })
  trimCache(searchCache, 400)
  return spots
}

async function photonReverse(lat: number, lng: number): Promise<string | null> {
  const u = new URL('https://photon.komoot.io/reverse')
  u.searchParams.set('lat', lat.toFixed(5))
  u.searchParams.set('lon', lng.toFixed(5))
  u.searchParams.set('lang', 'en')
  const res = await fetch(u, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`photon ${res.status}`)
  const data = (await res.json()) as { features?: { properties?: Record<string, unknown> }[] }
  const p = data.features?.[0]?.properties
  if (!p) return null
  const parts = photonParts(p)
  return parts.length > 0 ? parts.slice(0, 3).join(', ') : null
}

async function nominatimReverse(lat: number, lng: number): Promise<string | null> {
  const u = new URL('https://nominatim.openstreetmap.org/reverse')
  u.searchParams.set('lat', lat.toFixed(5))
  u.searchParams.set('lon', lng.toFixed(5))
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('zoom', '16')
  u.searchParams.set('addressdetails', '1')
  u.searchParams.set('accept-language', 'en')
  const res = await fetch(u, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`nominatim ${res.status}`)
  const data = (await res.json()) as {
    name?: string
    display_name?: string
    address?: Record<string, string>
  }
  const a = data.address ?? {}
  const parts = [
    a.suburb ?? a.neighbourhood ?? a.quarter,
    a.city ?? a.town ?? a.village ?? a.municipality,
    a.state,
  ].filter((x): x is string => typeof x === 'string' && !!x)
  const uniq = [...new Set(parts.map(fixAddis))]
  if (uniq.length > 0) return uniq.slice(0, 3).join(', ')
  return data.display_name ? data.display_name.split(',').slice(0, 3).join(',').trim() : null
}

// "≈ Bole, Addis Ababa" for a coordinate. Never throws - a missing area name
// must never break a checkout.
export async function areaName(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(3)}|${lng.toFixed(3)}`
  const hit = areaCache.get(key)
  if (hit && Date.now() - hit.at < AREA_TTL) return hit.name
  let name: string | null = null
  try {
    name = await photonReverse(lat, lng)
  } catch {
    try {
      name = await nominatimReverse(lat, lng)
    } catch {
      name = null
    }
  }
  areaCache.set(key, { at: Date.now(), name })
  trimCache(areaCache, 1200)
  return name
}
