import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const statics = ['', '/shop', '/track', '/wishlist', '/about', '/contact', '/size-guide', '/delivery', '/returns', '/privacy', '/terms'].map(
    (p) => ({ url: `${base}${p}`, lastModified: new Date() })
  )
  let categories: MetadataRoute.Sitemap = []
  let products: MetadataRoute.Sitemap = []
  try {
    const cats = await db.category.findMany({ where: { active: true }, select: { slug: true } })
    categories = cats.map((c) => ({ url: `${base}/shop/${c.slug}`, lastModified: new Date() }))
    const prods = await db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } })
    products = prods.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt }))
  } catch {
    // db not ready — still return static routes
  }
  return [...statics, ...categories, ...products]
}
