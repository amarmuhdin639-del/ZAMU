'use client'

// Location picker for checkout — customer taps the map to pin their delivery
// spot (or uses the phone's GPS). Leaflet + OpenStreetMap tiles: no API key,
// no per-load cost. The pin travels with the order as "Pin: lat, lng".

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { useLang } from '@/lib/i18n'
import { Crosshair, MapPin, Loader2 } from 'lucide-react'

export type PinValue = { lat: number; lng: number } | null

const ADDIS_CENTER: [number, number] = [9.0192, 38.7525]

function pinIcon() {
  // silver-themed HTML pin — avoids Leaflet's default marker image assets
  const L = (window as unknown as { L: typeof import('leaflet') }).L
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-100%)">
      <div style="width:26px;height:26px;border-radius:9999px;background:linear-gradient(135deg,#f4f4f6,#a9a9b3);border:2px solid #0a0a0b;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center">
        <div style="width:8px;height:8px;border-radius:9999px;background:#0a0a0b"></div>
      </div>
      <div style="width:2px;height:9px;background:linear-gradient(#a9a9b3,#0a0a0b);margin:0 auto"></div>
    </div>`,
    iconSize: [0, 0],
  })
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: PinValue
  onChange: (v: NonNullable<PinValue>) => void
}) {
  const { t } = useLang()
  const divRef = useRef<HTMLDivElement | null>(null)
   
  const mapRef = useRef<any>(null)
   
  const markerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const L = (await import('leaflet')).default
      if (cancelled || !divRef.current || mapRef.current) return
      const map = L.map(divRef.current, { scrollWheelZoom: false, zoomControl: true }).setView(
        value ? [value.lat, value.lng] : ADDIS_CENTER,
        value ? 16 : 11
      )
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map)
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        setPin(e.latlng.lat, e.latlng.lng)
      })
      if (value) dropMarker(value.lat, value.lng)
      mapRef.current = map
      setReady(true)
    }
    init()
    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
     
  }, [])

   
  async function dropMarker(lat: number, lng: number) {
    const L = (await import('leaflet')).default
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else if (mapRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(mapRef.current)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng()
        onChange({ lat: p.lat, lng: p.lng })
      })
    }
  }

  function setPin(lat: number, lng: number) {
    onChange({ lat, lng })
    dropMarker(lat, lng)
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const { latitude, longitude } = pos.coords
        setPin(latitude, longitude)
        mapRef.current?.setView([latitude, longitude], 16)
        mapRef.current?.scrollWheelZoom.enable()
      },
      () => {
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <MapPin className="h-4 w-4 text-flame" /> {t('checkout.pinTitle')} *
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating || !ready}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:border-flame disabled:opacity-50"
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
          {locating ? t('checkout.locating') : t('checkout.useMyLocation')}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t('checkout.pinHint')}</p>
      <div
        ref={divRef}
        className="mt-2 h-64 w-full overflow-hidden rounded-xl border border-border sm:h-72"
        style={{ background: '#1a1a1e' }}
      />
      {value ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#5fc690]">
          <MapPin className="h-3.5 w-3.5" /> {t('checkout.pinSet')} — {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      ) : (
        <p className="mt-2 text-xs font-semibold text-[#e2a13f]">{t('checkout.pinRequired')}</p>
      )}
    </div>
  )
}
