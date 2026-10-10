'use client'

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
  { key: 'contactTelegram', labelKey: 'admin.settings.fields.contactTelegram' },
  { key: 'contactInstagram', labelKey: 'admin.settings.fields.contactInstagram' },
  { key: 'contactFacebook', labelKey: 'admin.settings.fields.contactFacebook' },
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
    const [s, pm, dz, dc, bn] = await Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
      fetch('/api/admin/payment-methods').then((r) => r.json()),
      fetch('/api/admin/delivery-zones').then((r) => r.json()),
      fetch('/api/admin/discounts').then((r) => r.json()),
      fetch('/api/admin/banners').then((r) => r.json()),
    ])
    setSettings(s.settings ?? {})
    setMethods(pm.methods ?? [])
    setZones(dz.zones ?? [])
    setDiscounts(dc.discounts ?? [])
    setBanners(bn.banners ?? [])
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
      fd.append('file', file)
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
      fd.append('file', file)
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
