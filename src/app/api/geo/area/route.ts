import { NextRequest, NextResponse } from 'next/server'
import { areaName } from '@/lib/geo-places'

// GET /api/geo/area?lat=9.0054&lng=38.7636
// Human-readable neighbourhood for a coordinate ("≈ Bole, Addis Ababa").
// Shown under the checkout pin, the track-order map and the admin order card
// so a wrong 10 km pin is instantly obvious to everyone. Cached 24 h per
// ~100 m grid cell; returns { area: null } rather than failing.

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') ?? '')
  const lng = parseFloat(
    req.nextUrl.searchParams.get('lng') ?? req.nextUrl.searchParams.get('lon') ?? ''
  )
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ area: null })
  }
  const area = await areaName(lat, lng)
  return NextResponse.json({ area })
}
