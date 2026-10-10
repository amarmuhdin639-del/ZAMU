'use client'

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

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files).slice(0, 8)) {
        if (file.type.startsWith('video/') && file.size > 80 * 1024 * 1024) {
          throw new Error(t('admin.form.videoTooLarge'))
        }
        const fd = new FormData()
        fd.append('file', file)
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
      fd.append('file', file)
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
