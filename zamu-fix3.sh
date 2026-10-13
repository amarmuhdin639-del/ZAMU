#!/usr/bin/env bash
# ============================================================================
#  ZAMU FIX 3 - three fixes you reported
#
#  1. BROKEN LOGO next to "ZAMU" (header + footer): the logo image file was
#     missing from the repo. This puts the real crown logo back.
#  2. "USE MY LOCATION" NOT ACCURATE: the phone's first GPS answer is a
#     rough guess (can be 1-2 km off). Now the map keeps refining for a few
#     seconds, shows a green circle for the accuracy, and locks in once it
#     is within about 30 meters.
#  3. "CAN'T UPLOAD IMAGE": big phone photos (over ~6 MB) are rejected by
#     the hosting. Now the browser shrinks photos automatically before
#     upload - they land under 1 MB and go through every time.
#
#  PLAIN READABLE CODE - the only base64 below is the logo image file itself.
#  Safe to run again any time - finished steps are skipped.
#  HOW TO USE: from the repo root (the folder with package.json):
#        bash zamu-fix3.sh
# ============================================================================
[ -f package.json ] || { echo "Run this from the repo root (the folder that has package.json)."; exit 1; }

FAIL=0
step() { echo ""; echo "== $1 =="; }
chk() { grep -q "$2" "$1" 2>/dev/null && echo "PASS  $2" || { echo "FAIL  '$2' not found in $1"; FAIL=1; } }

step "1/5 Restore the crown logo (header + footer)"
F=public/uploads/zamu-crown-logo.webp
if [ -s "$F" ] && echo "d8fe122ce84c4cfa5b8d33522928b7e7  $F" | md5sum -c - >/dev/null 2>&1; then
  echo "SKIP  logo file already in place"
else
  mkdir -p public/uploads
  base64 -d > "$F" <<'ZAMU_LOGO_B64'
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
aPdo8AAAAAAAAA==
ZAMU_LOGO_B64
  if echo "d8fe122ce84c4cfa5b8d33522928b7e7  $F" | md5sum -c - >/dev/null 2>&1; then
    echo "OK    crown logo restored (verified byte-for-byte)"
  else
    echo "FAIL  logo file did not survive"; FAIL=1
  fi
fi

step "2/5 Accurate GPS for the checkout map (keeps refining, shows accuracy)"
cat > src/components/store/location-picker.tsx <<'ZAMU_LOCATION'
'use client'

// Location picker for checkout — customer taps the map to pin their delivery
// spot (or uses the phone's GPS). Leaflet + OpenStreetMap tiles: no API key,
// no per-load cost. The pin travels with the order as "Pin: lat, lng".
//
// GPS accuracy: the phone's FIRST location fix is usually a coarse tower/
// wifi guess (can be off by 1-2 km). Real GPS needs a few seconds to lock.
// So "Use my location" now WATCHES the position, keeps refining the pin as
// the fix gets better, draws a circle showing the current accuracy, and
// stops as soon as the fix is within ~30 m (or after 16 s). maximumAge is 0
// so a stale cached fix is never used.

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
  const circleRef = useRef<any>(null)
  const watchRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const L = (await import('leaflet')).default
      if (cancelled || !divRef.current || mapRef.current) return
      const map = L.map(divRef.current, { scrollWheelZoom: false, zoomControl: true }).setView(
        value ? [value.lat, value.lng] : ADDIS_CENTER,
        value ? 17 : 12
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
      stopWatching()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
        circleRef.current = null
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

  async function showAccuracy(lat: number, lng: number, accuracy: number) {
    const L = (await import('leaflet')).default
    if (!mapRef.current) return
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]).setRadius(accuracy)
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#5fc690',
        weight: 1,
        fillColor: '#5fc690',
        fillOpacity: 0.12,
      }).addTo(mapRef.current)
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation || !ready) return
    setLocating(true)
    stopWatching()
    let bestAcc = Infinity
    const finish = () => {
      stopWatching()
      setLocating(false)
      mapRef.current?.scrollWheelZoom.enable()
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        void showAccuracy(latitude, longitude, accuracy)
        if (accuracy < bestAcc) {
          bestAcc = accuracy
          setPin(latitude, longitude)
        }
        mapRef.current?.setView([latitude, longitude], 18, { animate: true })
        if (accuracy <= 30) finish()
      },
      () => finish(),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
    // hard stop: never spin longer than 16 s
    timerRef.current = setTimeout(finish, 16000)
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
ZAMU_LOCATION
grep -q "watchPosition" src/components/store/location-picker.tsx \
  && echo "OK    location picker now locks on like a proper GPS" \
  || { echo "FAIL  location picker update did not stick"; FAIL=1; }

step "3/5 Smart photo shrinker for uploads (new helper)"
mkdir -p src/lib
cat > src/lib/upload-client.ts <<'ZAMU_UPLOAD_CLIENT'
// Client-side image prep before upload.
//
// Why: Netlify serverless functions cap request bodies at ~6 MB, and modern
// phone photos are 3-10 MB - so big photos silently fail to upload. The
// browser resizes them here (max 1600 px on the long edge, JPEG ~82%)
// before they travel, which lands almost every photo well under 1 MB.
// Videos, animated GIFs, small images and anything that fails to decode
// pass through untouched.

const MAX_EDGE = 1600
const QUALITY = 0.82
const PASSTHROUGH_TYPES = new Set(['image/gif'])

export async function compressForUpload(file: File): Promise<File> {
  try {
    if (!file.type.startsWith('image/') || PASSTHROUGH_TYPES.has(file.type)) return file
    // small files go as-is; PNGs up to 3 MB keep their transparency untouched
    if (file.size <= 1024 * 1024) return file
    if (file.type === 'image/png' && file.size <= 3 * 1024 * 1024) return file
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY)
    )
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file // never block an upload because pre-processing failed
  }
}
ZAMU_UPLOAD_CLIENT
chk src/lib/upload-client.ts "compressForUpload"

step "4/5 Product form uploads go through the shrinker"
F=src/components/admin/product-form.tsx
if grep -q "compressForUpload" "$F"; then
  echo "SKIP  product form already patched"
else
  cat > "$F" <<'ZAMU_PRODUCT_FORM'
'use client'

import { compressForUpload } from '@/lib/upload-client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SafeImage } from '@/components/store/media-box'
import { UploadCloud, X, Loader2, ArrowLeft, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ALL_SIZES } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLang } from '@/lib/i18n'
import { jsonOrThrow } from '@/lib/http'
import { isVideoUrl } from '@/lib/media'

type Category = { id: string; name: string; slug?: string }
type ColorRow = { name: string; hex: string; image?: string }
type ImgRow = { url: string; alt?: string }

export function ProductForm({
  categories,
  product,
}: {
  categories: Category[]
  product?: {
    id: string
    name: string
    sku: string
    description: string
    price: number
    salePrice: number | null
    categoryId: string
    customCategory: string | null
    stock: number
    sizes: string
    colors: string
    featured: boolean
    isNew: boolean
    bestSeller: boolean
    active: boolean
    images: { url: string; alt: string | null }[]
  }
}) {
  const router = useRouter()
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    price: String(product?.price ?? ''),
    salePrice: product?.salePrice ? String(product.salePrice) : '',
    categoryId: product?.categoryId ?? categories[0]?.id ?? '',
    customCategory: product?.customCategory ?? '',
    stock: String(product?.stock ?? 10),
    featured: product?.featured ?? false,
    isNew: product?.isNew ?? true,
    bestSeller: product?.bestSeller ?? false,
    active: product?.active ?? true,
  })
  const [sizes, setSizes] = useState<string[]>(product ? product.sizes.split(',').map((s) => s.trim()) : ['S', 'M', 'L', 'XL'])
  const [colors, setColors] = useState<ColorRow[]>(
    product ? (() => { try { const p = JSON.parse(product.colors); return Array.isArray(p) ? p : [{ name: product.colors, hex: '#888888' }] } catch { return [{ name: product.colors, hex: '#888888' }] } })() : [{ name: 'Black', hex: '#141412' }]
  )
  const [images, setImages] = useState<ImgRow[]>(product?.images.map((i) => ({ url: i.url, alt: i.alt ?? '' })) ?? [])
  const colorFileRef = useRef<HTMLInputElement>(null)
  const [colorImgIdx, setColorImgIdx] = useState<number | null>(null)
  const [uploadingColor, setUploadingColor] = useState(false)
  const isOthers = categories.find((c) => c.id === form.categoryId)?.slug === 'others'

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

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

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files).slice(0, 8)) {
        if (file.type.startsWith('video/') && file.size > 80 * 1024 * 1024) {
          throw new Error(t('admin.form.videoTooLarge'))
        }
        const fd = new FormData()
        fd.append('file', await compressForUpload(file))
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const data = await jsonOrThrow<{ url?: string; error?: string }>(res)
        if (!res.ok) throw new Error(data.error ?? t('admin.form.uploadFailed'))
        setImages((imgs) => [...imgs, { url: data.url ?? '', alt: form.name }].slice(0, 8))
      }
      toast.success(t('admin.form.imagesUploaded'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.form.uploadFailed'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function uploadColorImage(file: File | undefined | null) {
    const idx = colorImgIdx
    if (!file || idx === null) return
    setUploadingColor(true)
    try {
      const fd = new FormData()
      fd.append('file', await compressForUpload(file))
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await jsonOrThrow<{ url?: string; error?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? t('admin.form.uploadFailed'))
      const url = data.url ?? ''
      setColors((cur) => cur.map((x, j) => (j === idx ? { ...x, image: url } : x)))
      setImages((imgs) => (imgs.some((x) => x.url === url) ? imgs : [...imgs, { url, alt: form.name }].slice(0, 8)))
      toast.success(t('admin.form.imagesUploaded'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.form.uploadFailed'))
    } finally {
      setUploadingColor(false)
      setColorImgIdx(null)
      if (colorFileRef.current) colorFileRef.current.value = ''
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (sizes.length === 0) return toast.error(t('admin.form.sizeRequired'))
    if (colors.length === 0) return toast.error(t('admin.form.colorRequired'))
    const price = Number(form.price)
    const salePrice = form.salePrice ? Number(form.salePrice) : null
    if (!price || price <= 0) return toast.error(t('admin.form.priceRequired'))
    if (salePrice && salePrice >= price) return toast.error(t('admin.form.saleLower'))

    setBusy(true)
    const body = {
      name: form.name,
      sku: form.sku,
      description: form.description,
      price,
      salePrice,
      categoryId: form.categoryId,
      stock: Number(form.stock) || 0,
      customCategory: isOthers && form.customCategory.trim() ? form.customCategory.trim() : null,
      sizes: sizes.join(','),
      colors: JSON.stringify(colors),
      featured: form.featured,
      isNew: form.isNew,
      bestSeller: form.bestSeller,
      active: form.active,
      images,
    }
    try {
      const res = await fetch(product ? `/api/admin/products/${product.id}` : '/api/admin/products', {
        method: product ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await jsonOrThrow<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? t('admin.form.saveFailed'))
      toast.success(product ? t('admin.form.productUpdated') : t('admin.form.productCreated'))
      router.push('/admin/products')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.form.saveFailed'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg uppercase">{t('admin.form.basics')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="pname">{t('admin.form.name')}</Label>
              <Input id="pname" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('admin.form.namePh')} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="psku">{t('admin.form.sku')}</Label>
              <Input id="psku" required value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} placeholder="TB-JRS-001" className="mt-1.5 font-mono" />
              {skuCheck && skuCheck.sku === form.sku.trim() && (
                skuCheck.takenBy
                  ? <p className="mt-1 text-xs font-medium text-red-600">&#10007; {t('admin.form.skuTaken', { name: skuCheck.takenBy })}</p>
                  : <p className="mt-1 text-xs font-medium text-emerald-600">&#10003; {t('admin.form.skuFree')}</p>
              )}
            </div>
            <div>
              <Label htmlFor="pcat">{t('admin.form.category')}</Label>
              <select id="pcat" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-ink">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {isOthers && (
              <div className="sm:col-span-2">
                <Label htmlFor="pcustom">{t('admin.form.specifyType')}</Label>
                <Input id="pcustom" value={form.customCategory} onChange={(e) => set('customCategory', e.target.value)} placeholder={t('admin.form.specifyTypePh')} className="mt-1.5" />
                <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.form.specifyTypeHint')}</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="pdesc">{t('admin.form.description')}</Label>
              <Textarea id="pdesc" required rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('admin.form.descPh')} className="mt-1.5" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg uppercase">{t('admin.form.pricing')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="pprice">{t('admin.form.price')}</Label>
              <Input id="pprice" required type="number" min={1} step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="psale">{t('admin.form.salePrice')}</Label>
              <Input id="psale" type="number" min={1} step="0.01" value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pstock">{t('admin.form.stock')}</Label>
              <Input id="pstock" required type="number" min={0} value={form.stock} onChange={(e) => set('stock', e.target.value)} className="mt-1.5" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg uppercase">{t('admin.form.sizesColors')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('admin.form.sizesHint')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_SIZES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                className={cn(
                  'h-9 min-w-10 rounded-md border px-2.5 text-xs font-bold transition-colors',
                  sizes.includes(s) ? 'border-ink bg-ink text-cream' : 'border-border hover:border-ink'
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">{t('admin.form.colorsHint')}</p>
          <input ref={colorFileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => uploadColorImage(e.target.files?.[0])} />
          <p className="mt-1 text-[11px] text-muted-foreground">{t('admin.form.colorImageHint')}</p>
          <div className="mt-3 space-y-2">
            {colors.map((c, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => setColors((cur) => cur.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))}
                  className="h-10 w-12 cursor-pointer rounded-md border border-input bg-card p-1"
                  aria-label={t('admin.form.colorAria', { name: c.name })}
                />
                <Input value={c.name} onChange={(e) => setColors((cur) => cur.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder={t('admin.form.colorName')} className="min-w-[120px] flex-1" />
                <button
                  type="button"
                  onClick={() => { setColorImgIdx(i); colorFileRef.current?.click() }}
                  disabled={uploadingColor && colorImgIdx === i}
                  title={t('admin.form.colorImage')}
                  aria-label={t('admin.form.colorImageAria', { name: c.name || '' })}
                  className="relative h-10 w-12 shrink-0 overflow-hidden rounded-md border border-dashed border-border bg-secondary/40 transition-colors hover:border-ink disabled:opacity-50"
                >
                  {uploadingColor && colorImgIdx === i ? (
                    <span className="flex h-full w-full items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></span>
                  ) : c.image ? (
                    <SafeImage src={c.image} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center"><ImagePlus className="h-4 w-4 text-muted-foreground" /></span>
                  )}
                </button>
                {c.image && (
                  <button type="button" onClick={() => setColors((cur) => cur.map((x, j) => (j === i ? { ...x, image: undefined } : x)))} className="p-2 text-destructive" aria-label={t('admin.form.unlinkColorImage')} title={t('admin.form.unlinkColorImage')}>
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={() => setColors((cur) => cur.filter((_, j) => j !== i))} className="p-2 text-destructive" aria-label={t('admin.form.removeColor')}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setColors((cur) => [...cur, { name: '', hex: '#888888' }])} className="rounded-full text-xs uppercase tracking-wider">
              {t('admin.form.addColor')}
            </Button>
          </div>
        </section>
      </div>

      {/* right column */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg uppercase">{t('admin.form.images')}</h2>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-3 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 px-4 py-7 transition-colors hover:border-ink disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6 text-muted-foreground" />}
            <span className="text-xs font-semibold">{uploading ? t('admin.form.uploading') : t('admin.form.upload')}</span>
          </button>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {images.map((img, i) => (
              <div key={img.url} className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-secondary">
                {isVideoUrl(img.url) ? (
                  <>
                    <video src={`${img.url}#t=0.1`} muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-ink/80 px-1 py-0.5 text-[8px] font-bold uppercase text-cream">{t('admin.form.videoBadge')}</span>
                  </>
                ) : (
                  <SafeImage src={img.url} alt="" fill sizes="80px" className="object-cover" />
                )}
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink px-1 py-0.5 text-[8px] font-bold uppercase text-cream">{t('admin.form.main')}</span>}
                <button
                  type="button"
                  onClick={() => setImages((cur) => cur.filter((x) => x.url !== img.url))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-destructive"
                  aria-label={t('admin.form.removeImage')}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t('admin.form.imagesHint')}</p>
        </section>

        <section className="space-y-3.5 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg uppercase">{t('admin.form.badges')}</h2>
          {([
            ['featured', t('admin.form.featured')],
            ['isNew', t('admin.form.newArrival')],
            ['bestSeller', t('admin.form.bestSeller')],
            ['active', t('admin.form.visible')],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`f-${key}`}>{label}</Label>
              <Switch id={`f-${key}`} checked={form[key]} onCheckedChange={(v) => set(key, v)} />
            </div>
          ))}
        </section>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1 rounded-full text-xs uppercase tracking-wider">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> {t('admin.form.cancel')}
          </Button>
          <Button type="submit" disabled={busy} className="flex-1 rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame disabled:opacity-50">
            {busy ? t('admin.form.saving') : product ? t('admin.form.saveChanges') : t('admin.form.createProduct')}
          </Button>
        </div>
      </div>
    </form>
  )
}
ZAMU_PRODUCT_FORM
  grep -q "await compressForUpload" "$F" \
    && echo "OK    product photo uploads now shrink automatically" \
    || { echo "FAIL  product form patch did not stick"; FAIL=1; }
fi

step "5/5 Admin settings uploads go through the shrinker"
F=src/components/admin/settings-editor.tsx
if grep -q "compressForUpload" "$F"; then
  echo "SKIP  settings editor already patched"
else
  cat > "$F" <<'ZAMU_SETTINGS_EDITOR'
'use client'

import { compressForUpload } from '@/lib/upload-client'
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Plus, Trash2, Save, UploadCloud, PowerOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPrice } from '@/lib/shared'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'
import { jsonOrThrow } from '@/lib/http'
import { isVideoUrl } from '@/lib/media'
import { MediaBox } from '@/components/store/media-box'

type PaymentMethod = { id: string; name: string; accountNumber: string; accountName: string; phone: string | null; instructions: string | null; active: boolean; sortOrder: number }
type DeliveryZone = { id: string; name: string; fee: number; estimatedDays: string | null; active: boolean; sortOrder: number }
type Discount = { id: string; code: string; type: string; value: number; minOrder: number; active: boolean; usedCount: number; usageLimit: number | null; endsAt: string | null }
type Banner = { id: string; title: string; subtitle: string | null; image: string | null; link: string | null; type: string; active: boolean }

const SETTING_FIELDS: { key: string; labelKey: string; hintKey?: string; long?: boolean }[] = [
  { key: 'siteName', labelKey: 'admin.settings.fields.siteName' },
  { key: 'announcement', labelKey: 'admin.settings.fields.announcement' },
  { key: 'heroTitle', labelKey: 'admin.settings.fields.heroTitle' },
  { key: 'heroSubtitle', labelKey: 'admin.settings.fields.heroSubtitle' },
  { key: 'flashSaleText', labelKey: 'admin.settings.fields.flashSaleText' },
  { key: 'flashSaleEndsAt', labelKey: 'admin.settings.fields.flashSaleEndsAt', hintKey: 'admin.settings.fields.flashSaleEndsHint' },
  { key: 'estimatedDeliveryNote', labelKey: 'admin.settings.fields.estimatedDeliveryNote' },
  { key: 'contactPhone', labelKey: 'admin.settings.fields.contactPhone' },
  { key: 'contactEmail', labelKey: 'admin.settings.fields.contactEmail' },
  { key: 'contactAddress', labelKey: 'admin.settings.fields.contactAddress' },
  { key: 'contactWhatsapp', labelKey: 'admin.settings.fields.contactWhatsapp' },
  { key: 'contactInstagram', labelKey: 'admin.settings.fields.contactInstagram' },
  { key: 'contactTiktok', labelKey: 'admin.settings.fields.contactTiktok' },
  { key: 'aboutTitle', labelKey: 'admin.settings.fields.aboutTitle' },
  { key: 'aboutText', labelKey: 'admin.settings.fields.aboutText', long: true },
  { key: 'deliveryInfo', labelKey: 'admin.settings.fields.deliveryInfo', long: true },
  { key: 'returnsPolicy', labelKey: 'admin.settings.fields.returnsPolicy', long: true },
  { key: 'privacyPolicy', labelKey: 'admin.settings.fields.privacyPolicy', long: true },
  { key: 'termsText', labelKey: 'admin.settings.fields.termsText', long: true },
]

export function AdminSettings() {
  const { t } = useLang()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [heroImageUploading, setHeroImageUploading] = useState(false)

  const load = useCallback(async () => {
    const getJson = async (url: string) => {
      // Safe loader: one broken or missing endpoint can no longer freeze the
      // whole settings page — every section loads independently.
      try {
        const r = await fetch(url)
        const text = await r.text()
        return text.trim() ? JSON.parse(text) : {}
      } catch {
        console.warn(`Could not load ${url}`)
        return {}
      }
    }
    const [s, pm, dz, dc, bn] = await Promise.all([
      getJson('/api/admin/settings'),
      getJson('/api/admin/payment-methods'),
      getJson('/api/admin/delivery-zones'),
      getJson('/api/admin/discounts'),
      getJson('/api/admin/banners'),
    ])
    setSettings(s?.settings ?? {})
    setMethods(pm?.methods ?? [])
    setZones(dz?.zones ?? [])
    setDiscounts(dc?.discounts ?? [])
    setBanners(bn?.banners ?? [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function saveSettings() {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t('admin.settings.settingsSaved'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.form.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function uploadHeroMedia(file: File | undefined) {
    if (!file) return
    setHeroImageUploading(true)
    const isVideo = file.type.startsWith('video/')
    try {
      const fd = new FormData()
      fd.append('file', await compressForUpload(file))
      fd.append('target', 'site')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await jsonOrThrow<{ url?: string; error?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? t('admin.form.uploadFailed'))
      setSettings((s) => ({ ...s, [isVideo ? 'heroVideo' : 'heroImage']: data.url ?? '' }))
      toast.success(t(isVideo ? 'admin.settings.heroVideoUploaded' : 'admin.settings.heroUploaded'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.form.uploadFailed'))
    } finally {
      setHeroImageUploading(false)
    }
  }

  if (!loaded) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight">{t('admin.settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.settings.sub')}</p>
      </div>

      <Tabs defaultValue="store">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="store">{t('admin.settings.tabStore')}</TabsTrigger>
          <TabsTrigger value="categories">{t('admin.settings.tabCategories')}</TabsTrigger>
          <TabsTrigger value="payments">{t('admin.settings.tabPayments')}</TabsTrigger>
          <TabsTrigger value="delivery">{t('admin.settings.tabDelivery')}</TabsTrigger>
          <TabsTrigger value="promotions">{t('admin.settings.tabPromos')}</TabsTrigger>
        </TabsList>

        {/* STORE & CONTENT */}
        <TabsContent value="store" className="mt-4 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {SETTING_FIELDS.map((f) => (
                <div key={f.key} className={f.long ? 'sm:col-span-2' : ''}>
                  <Label htmlFor={f.key}>{t(f.labelKey)}</Label>
                  {f.long ? (
                    <Textarea
                      id={f.key}
                      rows={5}
                      value={settings[f.key] ?? ''}
                      onChange={(e) => setSettings((s) => ({ ...s, [f.key]: e.target.value }))}
                      className="mt-1.5"
                    />
                  ) : (
                    <Input
                      id={f.key}
                      value={settings[f.key] ?? ''}
                      onChange={(e) => setSettings((s) => ({ ...s, [f.key]: e.target.value }))}
                      className="mt-1.5"
                    />
                  )}
                  {f.hintKey && <p className="mt-1 text-[11px] text-muted-foreground">{t(f.hintKey)}</p>}
                </div>
              ))}
              <div className="sm:col-span-2">
                <Label>{t('admin.settings.heroMedia')}</Label>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {settings.heroVideo && isVideoUrl(settings.heroVideo) ? (
                    <div className="relative">
                      <video src={settings.heroVideo} muted loop autoPlay playsInline className="h-24 w-40 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, heroVideo: '' }))}
                        aria-label={t('admin.settings.removeHeroVideo')}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-cream"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 rounded bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cream">{t('admin.form.videoBadge')}</span>
                    </div>
                  ) : settings.heroImage ? (
                    <img src={settings.heroImage} alt="Hero preview" className="h-24 w-40 rounded-lg object-cover" />
                  ) : null}
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:border-ink">
                    <UploadCloud className="h-4 w-4" />
                    {heroImageUploading ? t('admin.form.uploading') : t('admin.settings.changeHero')}
                    <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" hidden onChange={(e) => uploadHeroMedia(e.target.files?.[0])} />
                  </label>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{t('admin.settings.heroMediaHint')}</p>
              </div>
            </div>
            <Button onClick={saveSettings} disabled={busy} className="mt-5 rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">
              <Save className="mr-1.5 h-4 w-4" /> {busy ? t('admin.form.saving') : t('admin.settings.saveAll')}
            </Button>
          </section>
        </TabsContent>

        {/* CATEGORIES (home page tiles) */}
        <TabsContent value="categories" className="mt-4">
          <CategoriesEditor />
        </TabsContent>

        {/* PAYMENT METHODS */}
        <TabsContent value="payments" className="mt-4">
          <PaymentMethodsEditor methods={methods} reload={load} />
        </TabsContent>

        {/* DELIVERY ZONES */}
        <TabsContent value="delivery" className="mt-4">
          <DeliveryZonesEditor zones={zones} reload={load} />
        </TabsContent>

        {/* PROMOTIONS */}
        <TabsContent value="promotions" className="mt-4 space-y-6">
          <DiscountsEditor discounts={discounts} reload={load} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PaymentMethodsEditor({ methods, reload }: { methods: PaymentMethod[]; reload: () => void }) {
  const { t } = useLang()
  const [editing, setEditing] = useState<Partial<PaymentMethod> | null>(null)

  async function save() {
    if (!editing?.name || !editing?.accountNumber || !editing?.accountName) return toast.error(t('admin.pm.required'))
    const isEdit = !!editing.id
    const res = await fetch(isEdit ? `/api/admin/payment-methods/${editing.id}` : '/api/admin/payment-methods', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? t('admin.form.saveFailed'))
    toast.success(isEdit ? t('admin.pm.updated') : t('admin.pm.added'))
    setEditing(null)
    reload()
  }

  async function remove(id: string) {
    await fetch(`/api/admin/payment-methods/${id}`, { method: 'DELETE' })
    toast.success(t('admin.deleted'))
    reload()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {methods.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t('admin.pm.empty')}</p>}
        {methods.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{m.name} {!m.active && <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{t('admin.pm.off')}</span>}</p>
              <p className="truncate text-xs text-muted-foreground">{m.accountNumber} · {m.accountName}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(m)} className="rounded-full text-[11px] uppercase tracking-wider">{t('admin.pm.edit')}</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(m.id)} className="rounded-full text-destructive hover:text-destructive" aria-label={t('admin.deleteAria', { name: m.name })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-lg uppercase">{editing?.id ? t('admin.pm.editMethod') : t('admin.pm.addMethod')}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <Label>{t('admin.pm.name')}</Label>
            <Input value={editing?.name ?? ''} onChange={(e) => setEditing((m) => ({ ...m!, name: e.target.value }))} placeholder="Telebirr" className="mt-1.5" />
          </div>
          <div>
            <Label>{t('admin.pm.accountNumber')}</Label>
            <Input value={editing?.accountNumber ?? ''} onChange={(e) => setEditing((m) => ({ ...m!, accountNumber: e.target.value }))} placeholder="0712 345 6789" className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t('admin.pm.accountName')}</Label>
            <Input value={editing?.accountName ?? ''} onChange={(e) => setEditing((m) => ({ ...m!, accountName: e.target.value }))} placeholder="Family business name" className="mt-1.5" />
          </div>
          <div>
            <Label>{t('admin.pm.phone')}</Label>
            <Input value={editing?.phone ?? ''} onChange={(e) => setEditing((m) => ({ ...m!, phone: e.target.value }))} className="mt-1.5" />
          </div>
          <div>
            <Label>{t('admin.pm.instructions')}</Label>
            <Textarea rows={3} value={editing?.instructions ?? ''} onChange={(e) => setEditing((m) => ({ ...m!, instructions: e.target.value }))} placeholder={t('admin.pm.instructionsPh')} className="mt-1.5" />
          </div>
          {editing && (
            <div className="flex items-center justify-between">
              <Label>{t('admin.pm.active')}</Label>
              <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing((m) => ({ ...m!, active: v }))} />
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1 rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">{editing?.id ? t('admin.pm.save') : t('admin.pm.add')}</Button>
            {editing && <Button variant="outline" onClick={() => setEditing(null)} className="rounded-full text-xs uppercase tracking-wider">{t('admin.pm.cancel')}</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function DeliveryZonesEditor({ zones, reload }: { zones: DeliveryZone[]; reload: () => void }) {
  const { t } = useLang()
  const [editing, setEditing] = useState<Partial<DeliveryZone> | null>(null)

  async function save() {
    if (!editing?.name || editing.fee === undefined || editing.fee === null) return toast.error(t('admin.dz.required'))
    const isEdit = !!editing.id
    const res = await fetch(isEdit ? `/api/admin/delivery-zones/${editing.id}` : '/api/admin/delivery-zones', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? t('admin.form.saveFailed'))
    toast.success(isEdit ? t('admin.dz.updated') : t('admin.dz.added'))
    setEditing(null)
    reload()
  }

  async function remove(id: string) {
    await fetch(`/api/admin/delivery-zones/${id}`, { method: 'DELETE' })
    toast.success(t('admin.deleted'))
    reload()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {zones.map((z) => (
          <div key={z.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{z.name} {!z.active && <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{t('admin.pm.off')}</span>}</p>
              <p className="text-xs text-muted-foreground">{formatPrice(z.fee)} · {z.estimatedDays ?? t('admin.dz.noEta')}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(z)} className="rounded-full text-[11px] uppercase tracking-wider">{t('admin.pm.edit')}</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(z.id)} className="rounded-full text-destructive hover:text-destructive" aria-label={t('admin.deleteAria', { name: z.name })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-lg uppercase">{editing?.id ? t('admin.dz.editZone') : t('admin.dz.addZone')}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <Label>{t('admin.dz.name')}</Label>
            <Input value={editing?.name ?? ''} onChange={(e) => setEditing((z) => ({ ...z!, name: e.target.value }))} placeholder="Addis Ababa" className="mt-1.5" />
          </div>
          <div>
            <Label>{t('admin.dz.fee')}</Label>
            <Input type="number" min={0} value={editing?.fee ?? ''} onChange={(e) => setEditing((z) => ({ ...z!, fee: Number(e.target.value) }))} className="mt-1.5" />
          </div>
          <div>
            <Label>{t('admin.dz.eta')}</Label>
            <Input value={editing?.estimatedDays ?? ''} onChange={(e) => setEditing((z) => ({ ...z!, estimatedDays: e.target.value }))} placeholder={t('admin.dz.etaPh')} className="mt-1.5" />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('admin.pm.active')}</Label>
            <Switch checked={editing?.active ?? true} onCheckedChange={(v) => setEditing((z) => ({ ...z!, active: v }))} />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1 rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">{editing?.id ? t('admin.pm.save') : t('admin.pm.add')}</Button>
            {editing && <Button variant="outline" onClick={() => setEditing(null)} className="rounded-full text-xs uppercase tracking-wider">{t('admin.pm.cancel')}</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function DiscountsEditor({ discounts, reload }: { discounts: Discount[]; reload: () => void }) {
  const { t } = useLang()
  const [form, setForm] = useState({ code: '', type: 'PERCENT', value: '', minOrder: '0', endsAt: '' })

  async function create() {
    if (!form.code || !form.value) return toast.error(t('admin.dc.required'))
    const res = await fetch('/api/admin/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: form.code, type: form.type, value: Number(form.value), minOrder: Number(form.minOrder) || 0, endsAt: form.endsAt || null }),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? t('admin.failed'))
    toast.success(t('admin.dc.created'))
    setForm({ code: '', type: 'PERCENT', value: '', minOrder: '0', endsAt: '' })
    reload()
  }

  async function toggle(d: Discount) {
    await fetch(`/api/admin/discounts/${d.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !d.active }) })
    reload()
  }

  async function remove(id: string) {
    await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' })
    toast.success(t('admin.deleted'))
    reload()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <h3 className="font-display text-base uppercase">{t('admin.dc.title')}</h3>
        {discounts.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t('admin.dc.empty')}</p>}
        {discounts.map((d) => (
          <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="font-mono font-bold">{d.code} <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{d.type === 'PERCENT' ? `${d.value}%` : formatPrice(d.value)}</span></p>
              <p className="text-xs text-muted-foreground">
                {t('admin.dc.minUsed', { min: formatPrice(d.minOrder), used: d.usedCount, limit: d.usageLimit ? `/${d.usageLimit}` : '', ends: d.endsAt ? new Date(d.endsAt).toLocaleDateString() : '' })}
              </p>
            </div>
            <Switch checked={d.active} onCheckedChange={() => toggle(d)} />
            <Button size="sm" variant="ghost" onClick={() => remove(d.id)} className="rounded-full text-destructive hover:text-destructive" aria-label={t('admin.deleteAria', { name: d.code })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-lg uppercase">{t('admin.dc.createTitle')}</h3>
        <div className="mt-4 space-y-3">
          <div>
            <Label>{t('admin.dc.code')}</Label>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label>{t('admin.dc.type')}</Label>
            <div className="mt-1.5 grid grid-cols-2 rounded-full border border-border p-1">
              {(['PERCENT', 'FIXED'] as const).map((tt) => (
                <button key={tt} type="button" onClick={() => setForm((f) => ({ ...f, type: tt }))} className={cn('rounded-full py-1.5 text-[11px] font-bold uppercase tracking-wider', form.type === tt ? 'bg-ink text-cream' : 'text-muted-foreground')}>
                  {tt === 'PERCENT' ? t('admin.dc.percentOff') : t('admin.dc.etbOff')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t('admin.dc.value')} ({form.type === 'PERCENT' ? '%' : 'ETB'})</Label>
            <Input type="number" min={1} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} className="mt-1.5" />
          </div>
          <div>
            <Label>{t('admin.dc.minOrder')}</Label>
            <Input type="number" min={0} value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))} className="mt-1.5" />
          </div>
          <div>
            <Label>{t('admin.dc.endDate')}</Label>
            <Input type="date" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} className="mt-1.5" />
          </div>
          <Button onClick={create} className="w-full rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">
            <Plus className="mr-1 h-4 w-4" /> {t('admin.dc.createBtn')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------- categories (home page tiles) ----------

type CategoryRow = { id: string; name: string; slug: string; image: string | null; active: boolean; sortOrder: number; _count: { products: number } }

function CategoriesEditor() {
  const { t } = useLang()
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/categories')
    const data = await jsonOrThrow<{ categories?: CategoryRow[] }>(res)
    setCategories(data.categories ?? [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function uploadImage(id: string, file: File | undefined) {
    if (!file) return
    setBusyId(id)
    try {
      const fd = new FormData()
      fd.append('file', await compressForUpload(file))
      fd.append('target', 'categories')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await jsonOrThrow<{ url?: string; error?: string }>(res)
      if (!res.ok) throw new Error(data.error ?? t('admin.form.uploadFailed'))
      const patch = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: data.url }),
      })
      const pdata = await jsonOrThrow<{ error?: string }>(patch)
      if (!patch.ok) throw new Error(pdata.error ?? t('admin.form.saveFailed'))
      toast.success(t('admin.cat.saved'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.form.uploadFailed'))
    } finally {
      setBusyId(null)
    }
  }

  async function removeImage(id: string) {
    setBusyId(id)
    try {
      const patch = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: null }),
      })
      const pdata = await jsonOrThrow<{ error?: string }>(patch)
      if (!patch.ok) throw new Error(pdata.error ?? t('admin.form.saveFailed'))
      toast.success(t('admin.cat.removed'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.form.saveFailed'))
    } finally {
      setBusyId(null)
    }
  }

  if (!loaded) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg uppercase">{t('admin.cat.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.cat.hint')}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
          <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative aspect-[4/5] bg-secondary">
              {c.image ? (
                <MediaBox src={c.image} alt={c.name} sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" hoverPlay />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('admin.cat.noImage')}</div>
              )}
              {busyId === c.id ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="font-display text-sm uppercase leading-tight text-white">{c.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">{t('admin.cat.products', { n: c._count.products })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:border-ink">
                <UploadCloud className="h-3.5 w-3.5" />
                {c.image ? t('admin.cat.change') : t('admin.cat.upload')}
                <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" hidden onChange={(e) => { uploadImage(c.id, e.target.files?.[0]); e.target.value = '' }} />
              </label>
              {c.image ? (
                <button
                  type="button"
                  onClick={() => removeImage(c.id)}
                  disabled={busyId === c.id}
                  aria-label={t('admin.cat.removeAria', { name: c.name })}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-destructive hover:border-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{t('admin.cat.videoNote')}</p>
    </div>
  )
}
ZAMU_SETTINGS_EDITOR
  grep -q "await compressForUpload" "$F" \
    && echo "OK    settings/hero uploads now shrink automatically" \
    || { echo "FAIL  settings editor patch did not stick"; FAIL=1; }
fi

step "Checks"
[ -s public/uploads/zamu-crown-logo.webp ] && echo "PASS  logo file present" || { echo "FAIL  logo file missing"; FAIL=1; }
chk src/components/store/header.tsx "zamu-crown-logo.webp"
chk src/components/store/footer.tsx "zamu-crown-logo.webp"
chk src/components/store/location-picker.tsx "watchPosition"
chk src/components/store/location-picker.tsx "enableHighAccuracy"
chk src/lib/upload-client.ts "compressForUpload"
grep -q "await compressForUpload" src/components/admin/product-form.tsx && echo "PASS  product uploads compressed" || { echo "FAIL  product uploads not compressed"; FAIL=1; }
grep -q "await compressForUpload" src/components/admin/settings-editor.tsx && echo "PASS  settings uploads compressed" || { echo "FAIL  settings uploads not compressed"; FAIL=1; }

step "Result"
if [ "$FAIL" -ne 0 ]; then
  echo "$FAIL check(s) FAILED - copy every line above that starts with FAIL and send them back."
  exit 1
fi
echo "ALL CHECKS PASSED"

step "Publishing to GitHub (Netlify deploys automatically)"
if [ "${ZAMU_NO_PUSH:-0}" = "1" ]; then
  echo "SKIP  publish (ZAMU_NO_PUSH is set - testing mode)"
else
  git add -A
  if git diff --cached --quiet; then
    echo "...   nothing new to commit (it may already be committed from an earlier run)"
  elif git commit -m "ZAMU: restore crown logo, lock-on GPS accuracy, auto-shrink uploads" >/dev/null 2>&1; then
    echo "OK    committed"
  else
    echo "FAIL  git commit failed - git needs your name and email once. Run:"
    echo '        git config --global user.email "you@example.com"'
    echo '        git config --global user.name "Your Name"'
    echo "      then run this script again."
    exit 1
  fi
  pushout=$(git push origin main 2>&1)
  if [ $? -eq 0 ]; then
    echo "$pushout" | tail -2
    echo "OK    pushed - wait ~2 minutes for Netlify to finish deploying"
  else
    echo "$pushout" | tail -4
    echo "...   push rejected - pulling remote changes and retrying"
    git pull --rebase origin main >/dev/null 2>&1
    pushout=$(git push origin main 2>&1)
    if [ $? -eq 0 ]; then
      echo "$pushout" | tail -2
      echo "OK    pushed after rebase - wait ~2 minutes for Netlify"
    else
      echo "$pushout" | tail -4
      echo "FAIL  automatic push did not go through. Run these two commands:"
      echo "        git pull --no-rebase -X ours origin main"
      echo "        git push origin main"
      exit 1
    fi
  fi
fi

echo ""
echo "Done. After Netlify deploys (~2 min): the crown logo is back in the"
echo "header and footer, Use-my-location locks on within ~30 m, and photo"
echo "uploads shrink automatically so they always go through."
