'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Pencil, Trash2, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/shared'
import { toast } from 'sonner'
import { useLang } from '@/lib/i18n'
import { MediaBox } from '@/components/store/media-box'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type AdminProduct = {
  id: string
  name: string
  slug: string
  sku: string
  price: number
  salePrice: number | null
  stock: number
  active: boolean
  featured: boolean
  isNew: boolean
  bestSeller: boolean
  customCategory: string | null
  category: { name: string }
  images: { url: string }[]
}

export function AdminProducts() {
  const { t } = useLang()
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [q, setQ] = useState('')

  const load = useCallback(() => {
    fetch(`/api/admin/products?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
  }, [q])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  async function remove(id: string) {
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? t('admin.prod.deleteFailed'))
    toast[data.archived ? 'info' : 'success'](data.archived ? t('admin.prod.archivedToast') : t('admin.prod.deletedToast'))
    load()
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error ?? t('admin.prod.updateFailed'))
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-tight">{t('admin.prod.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('admin.prod.sub')}</p>
        </div>
        <Link href="/admin/products/new">
          <Button className="rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">
            <Plus className="mr-1 h-4 w-4" /> {t('admin.prod.add')}
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.prod.search')} className="pl-10" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {products === null ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="font-display text-lg uppercase">{t('admin.prod.none')}</p>
            <p className="text-sm text-muted-foreground">{t('admin.prod.noneSub')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">{t('admin.prod.h.product')}</th>
                  <th className="px-4 py-3">{t('admin.prod.h.sku')}</th>
                  <th className="px-4 py-3">{t('admin.prod.h.price')}</th>
                  <th className="px-4 py-3">{t('admin.prod.h.stock')}</th>
                  <th className="px-4 py-3">{t('admin.prod.h.flags')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.prod.h.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-secondary">
                          {p.images[0] ? <MediaBox src={p.images[0].url} alt={p.name} sizes="44px" className="object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold leading-tight">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.customCategory || p.category?.name}{!p.active ? ' · ' + t('admin.prod.inactive') : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3">
                      {p.salePrice ? (
                        <>
                          <span className="font-bold text-flame">{formatPrice(p.salePrice)}</span>
                          <span className="block text-xs text-muted-foreground line-through">{formatPrice(p.price)}</span>
                        </>
                      ) : (
                        <span className="font-bold">{formatPrice(p.price)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={p.stock === 0 ? 'font-bold text-destructive' : p.stock <= 3 ? 'font-bold text-[#b8a038]' : ''}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.featured && <Flag label={t('admin.prod.flagFeatured')} tone="bg-ink text-cream" />}
                        {p.isNew && <Flag label={t('admin.prod.flagNew')} tone="bg-flame text-white" />}
                        {p.bestSeller && <Flag label={t('admin.prod.flagBest')} tone="bg-[#b8a038] text-white" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => patch(p.id, { active: !p.active })}
                          className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hover:border-ink"
                        >
                          {p.active ? t('admin.prod.hide') : t('admin.prod.show')}
                        </button>
                        <Link href={`/admin/products/${p.id}`} className="rounded-full border border-border p-1.5 hover:border-ink" aria-label={t('admin.prod.editAria', { name: p.name })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="rounded-full border border-border p-1.5 text-destructive hover:border-destructive" aria-label={t('admin.deleteAria', { name: p.name })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('admin.prod.deleteTitle', { name: p.name })}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('admin.prod.deleteInfo')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('admin.prod.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(p.id)} className="bg-destructive text-white hover:bg-destructive/90">{t('admin.prod.delete')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Flag({ label, tone }: { label: string; tone: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tone}`}>{label}</span>
}
