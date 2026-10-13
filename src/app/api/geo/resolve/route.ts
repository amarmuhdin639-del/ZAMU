import { NextRequest, NextResponse } from 'next/server'

// Resolves a pasted Google Maps link (often a short one like
// https://maps.app.goo.gl/xyz) into coordinates. Browsers cannot follow those
// redirects cross-origin, so the server does it: fetch the link and pull
// "!3dlat!4dlng", "@lat,lng" or "q=lat,lng" out of the final URL / page.

const ALLOWED = /(^|\.)(goo\.gl|maps\.google\.[a-z.]+|google\.[a-z.]+)$/i

function extract(text: string): { lat: number; lng: number } | null {
  const s = text.replace(/\+/g, ' ') // address-bar URLs encode spaces as +
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
  ]
  for (const re of patterns) {
    const m = re.exec(s)
    if (m) {
      const lat = parseFloat(m[1])
      const lng = parseFloat(m[2])
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const raw = String(body.url ?? '').trim()
    let parsed: URL
    try {
      parsed = new URL(raw)
    } catch {
      return NextResponse.json({ error: 'Not a link' }, { status: 400 })
    }
    if (!/^https?:$/.test(parsed.protocol) || !ALLOWED.test(parsed.hostname)) {
      return NextResponse.json({ error: 'Only Google Maps links are supported' }, { status: 400 })
    }

    const res = await fetch(parsed.toString(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZAMU/1.0)' },
    })
    let spot = extract(res.url)
    if (!spot) {
      const text = await res.text().catch(() => '')
      spot = extract(text.slice(0, 400000))
    }
    if (!spot) return NextResponse.json({ error: 'No coordinates found in that link' }, { status: 422 })
    return NextResponse.json(spot)
  } catch (e) {
    console.error('geo resolve error', e)
    return NextResponse.json({ error: 'Could not resolve that link' }, { status: 502 })
  }
}
