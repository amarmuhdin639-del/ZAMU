'use client'

// Delivery-pin picker, powered by real Google Maps.
//
// Why an embedded Google Map (no API key needed): customers in Ethiopia
// already know Google Maps - OpenStreetMap tiles looked foreign. The iframe
// below IS maps.google.com, pinned to the chosen coordinates, zoomable and
// pannable by the customer.
//
// Why the paste field: a phone's first GPS fix is often a coarse network
// guess that lands several km off (indoors, on a desktop, or with weak GPS
// reception). The one exact source everyone carries is the Google Maps app:
// long-press your door, copy the coordinates or share the place link, and
// paste it here. We read @lat,lng / !3d..!4d.. / q=lat,lng / bare "lat, lng"
// - and short links (maps.app.goo.gl/...) are resolved server-side by
// /api/geo/resolve because browsers cannot follow them cross-origin.
//
// Why the "walk the pin" pad: an embedded Google map cannot report where the
// customer panned it (cross-origin), so panning alone can not set the pin.
// Instead the arrows physically MOVE the pin - with a step size the customer
// picks (100 m / 500 m / 1 km). A 5 km GPS error becomes ~5 taps at the 1 km
// step, then a couple at 100 m. The map also auto-zooms OUT when the GPS fix
// is coarse, so the customer can SEE the pin is wrong before correcting it.

import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/i18n'
import { Crosshair, MapPin, Loader2, Footprints, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

export type PinValue = { lat: number; lng: number } | null

const ADDIS = { lat: 9.0192, lng: 38.7525 }

// Nudge steps in degrees of latitude (~metres at Addis Ababa's latitude).
// Longitude uses the same figure - Addis sits at 9 deg N where the cos
// factor (0.988) is irrelevant at walking scale.
const STEPS = [
  { key: 'checkout.step100', deg: 0.0009 },
  { key: 'checkout.step500', deg: 0.0045 },
  { key: 'checkout.step1k', deg: 0.009 },
] as const

function embedUrl(lat: number, lng: number, zoom: number) {
  return `https://maps.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}&z=${zoom}&output=embed&hl=en`
}

// Map zoom that makes the CURRENT error visible: an exact fix gets street
// level, a 5 km network guess gets a city view where the mistake is obvious.
function zoomFor(accuracy: number) {
  if (accuracy <= 100) return 17
  if (accuracy <= 500) return 15
  if (accuracy <= 2000) return 13
  return 11
}

function stepFor(accuracy: number) {
  if (accuracy > 700) return 2 // 1 km
  if (accuracy > 250) return 1 // 500 m
  return 0 // 100 m
}

// Reads coordinates out of anything Google Maps hands you: full URLs with
// @lat,lng or !3d!4d, search links with q=lat,lng, or a bare "lat, lng" pair.
export function parseSpot(raw: string): { lat: number; lng: number } | null {
  // Tolerate the shapes phones actually produce: "(9.0054, 38.7636)" from the
  // app's copy button and "+"-encoded spaces from browser address bars.
  const s = raw.trim().replace(/[()]/g, '').replace(/\+/g, ' ')
  if (!s) return null
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // place pin coordinates
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // .../@9.0054,38.7636,17z
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // ...?q=9.0054,38.7636
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/, // bare "9.0054, 38.7636"
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

function fmtAcc(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: PinValue
  onChange: (v: NonNullable<PinValue>) => void
}) {
  const { t } = useLang()
  const watchRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [locating, setLocating] = useState(false)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [paste, setPaste] = useState('')
  const [pasteErr, setPasteErr] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)

  // The iframe is a heavy Google page: reload it at most once per 900 ms of
  // quiet, and only when the pin actually moved more than a couple of metres.
  // zoomRef carries the chosen zoom so a coarse GPS fix can open zoomed out.
  const zoomRef = useRef(12)
  const frameRef = useRef<{ lat: number; lng: number }>({ lat: value?.lat ?? ADDIS.lat, lng: value?.lng ?? ADDIS.lng })
  const [frameSrc, setFrameSrc] = useState(() =>
    value ? embedUrl(value.lat, value.lng, 17) : embedUrl(ADDIS.lat, ADDIS.lng, 12)
  )

  useEffect(() => {
    if (!value) return
    const last = frameRef.current
    const moved = Math.abs(value.lat - last.lat) + Math.abs(value.lng - last.lng)
    if (moved < 0.00002) return
    const timer = setTimeout(() => {
      frameRef.current = { lat: value.lat, lng: value.lng }
      setFrameSrc(embedUrl(value.lat, value.lng, zoomRef.current))
    }, 900)
    return () => clearTimeout(timer)
  }, [value?.lat, value?.lng])

  useEffect(() => {
    return () => stopWatching()
  }, [])

  function stopWatching() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    stopWatching()
    let bestAcc = Infinity
    const finish = () => {
      stopWatching()
      setLocating(false)
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords
        if (acc < bestAcc) {
          bestAcc = acc
          setAccuracy(acc)
          // zoom out for a coarse fix so the error is visible, and pre-pick
          // a matching step size so the customer can start correcting fast
          zoomRef.current = zoomFor(acc)
          setStepIdx(stepFor(acc))
          onChange({ lat: latitude, lng: longitude })
        }
        if (acc <= 30) finish()
      },
      () => finish(),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
    // hard stop: never spin longer than 16 s
    timerRef.current = setTimeout(finish, 16000)
  }

  async function applyPaste() {
    const local = parseSpot(paste)
    if (local) {
      setAccuracy(null)
      setPasteErr(false)
      setPaste('')
      zoomRef.current = 17 // pasted coordinates are exact - street level
      onChange(local)
      return
    }
    // Not literal coordinates - if it is a (short) Google Maps link, let the
    // server follow the redirect and pull the coordinates out of it.
    if (/https?:\/\//i.test(paste)) {
      try {
        const r = await fetch('/api/geo/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: paste.trim() }),
        })
        const d = (await r.json().catch(() => ({}))) as { lat?: number; lng?: number }
        if (r.ok && typeof d.lat === 'number' && typeof d.lng === 'number') {
          setAccuracy(null)
          setPasteErr(false)
          setPaste('')
          zoomRef.current = 17
          onChange({ lat: d.lat, lng: d.lng })
          return
        }
      } catch {
        /* fall through to the error message */
      }
    }
    setPasteErr(true)
  }

  function nudge(dLat: number, dLng: number) {
    if (!value) return
    const s = STEPS[stepIdx].deg
    onChange({ lat: value.lat + dLat * s, lng: value.lng + dLng * s })
  }

  const nudgeBtn =
    'flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:border-flame active:bg-secondary'

  const stepChip = (selected: boolean) =>
    'rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ' +
    (selected ? 'bg-ink text-cream' : 'border border-border bg-card text-foreground hover:border-flame')

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <MapPin className="h-4 w-4 text-flame" /> {t('checkout.pinTitle')} *
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:border-flame disabled:opacity-50"
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
          {locating ? t('checkout.locating') : t('checkout.useMyLocation')}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t('checkout.pinHint')}</p>
      <div
        className="mt-2 h-64 w-full overflow-hidden rounded-xl border border-border sm:h-72"
        style={{ background: '#1a1a1e' }}
      >
        <iframe
          title="Google Maps"
          src={frameSrc}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      {value ? (
        <>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#5fc690]">
            <MapPin className="h-3.5 w-3.5" /> {t('checkout.pinSet')} — {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            {accuracy !== null && (
              <span className="text-muted-foreground">
                · {t('checkout.accLabel')}: ±{fmtAcc(accuracy)} —{' '}
                {t(accuracy <= 150 ? 'checkout.accGood' : 'checkout.accPoor')}
              </span>
            )}
          </p>

          <div className="mt-2 rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Footprints className="h-3.5 w-3.5 text-flame" /> {t('checkout.stepTitle')}
              </p>
              <div className="flex gap-1">
                {STEPS.map((s, i) => (
                  <button key={s.key} type="button" onClick={() => setStepIdx(i)} className={stepChip(stepIdx === i)}>
                    {t(s.key)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="grid w-max grid-cols-3 gap-1">
                <span />
                <button type="button" aria-label="move pin north" onClick={() => nudge(1, 0)} className={nudgeBtn}>
                  <ArrowUp className="h-4 w-4" />
                </button>
                <span />
                <button type="button" aria-label="move pin west" onClick={() => nudge(0, -1)} className={nudgeBtn}>
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="flex h-9 w-9 items-center justify-center text-[10px] font-bold uppercase text-muted-foreground">
                  {t(STEPS[stepIdx].key)}
                </span>
                <button type="button" aria-label="move pin east" onClick={() => nudge(0, 1)} className={nudgeBtn}>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <span />
                <button type="button" aria-label="move pin south" onClick={() => nudge(-1, 0)} className={nudgeBtn}>
                  <ArrowDown className="h-4 w-4" />
                </button>
                <span />
              </div>
              <p className="text-xs text-muted-foreground">{t('checkout.nudgeHint')}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs font-semibold text-[#e2a13f]">{t('checkout.pinRequired')}</p>
      )}

      <div className="mt-3 rounded-xl border border-border bg-card p-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {t('checkout.pasteLabel')}
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            value={paste}
            onChange={(e) => {
              setPaste(e.target.value)
              setPasteErr(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void applyPaste()
              }
            }}
            placeholder={t('checkout.pastePlaceholder')}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-flame"
          />
          <button
            type="button"
            onClick={() => void applyPaste()}
            className="rounded-lg bg-flame px-4 py-2 text-xs font-bold uppercase tracking-wider text-cream transition-opacity hover:opacity-90"
          >
            {t('checkout.pasteSet')}
          </button>
        </div>
        {pasteErr && <p className="mt-1.5 text-xs font-semibold text-[#e05252]">{t('checkout.pasteInvalid')}</p>}
      </div>
    </div>
  )
}

