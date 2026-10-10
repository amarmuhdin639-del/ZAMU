import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { getProductBySlug, getSettings, SETTING_DEFAULTS, productCardSelect } from '@/lib/queries'
import { ProductView } from '@/components/store/product-view'
import { ProductCard } from '@/components/store/product-card'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = await db.product.findUnique({ where: { slug }, include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } })
  if (!p) return { title: 'Product not found' }
  return {
    title: p.name,
    description: p.description.slice(0, 160),
    openGraph: {
      title: `${p.name} · ZAMU`,
      description: p.description.slice(0, 160),
      images: p.images[0]?.url ? [p.images[0].url] : undefined,
    },
    alternates: { canonical: `/product/${p.slug}` },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
  ])
  if (!product || !product.active) notFound()

  // Complete the Fit: complementary categories
  const COMPLEMENTS: Record<string, string[]> = {
    jerseys: ['baggy-pants', 'shorts', 'accessories'],
    'baggy-pants': ['jerseys', 'oversized-tees', 'accessories'],
    hoodies: ['baggy-pants', 'accessories'],
    'oversized-tees': ['baggy-pants', 'shorts'],
    tracksuits: ['accessories'],
    shorts: ['jerseys', 'accessories'],
    jackets: ['jerseys', 'accessories'],
    accessories: ['jerseys', 'hoodies'],
  }
  const complementSlugs = COMPLEMENTS[product.category.slug] ?? ['hoodies', 'accessories']
  const completeTheFit = await db.product.findMany({
    where: { active: true, stock: { gt: 0 }, category: { slug: { in: complementSlugs } }, id: { not: product.id } },
    orderBy: [{ bestSeller: 'desc' }, { createdAt: 'desc' }],
    take: 4,
    select: productCardSelect,
  })

  const map = { ...SETTING_DEFAULTS, ...settings }

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images.map((i) => i.url),
    description: product.description.slice(0, 300),
    sku: product.sku,
    brand: { '@type': 'Brand', name: map.siteName },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ETB',
      price: product.salePrice && product.salePrice < product.price ? product.salePrice : product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.reviews.length
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (product.reviews.reduce((n, r) => n + r.rating, 0) / product.reviews.length).toFixed(1),
            reviewCount: product.reviews.length,
          },
        }
      : {}),
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductView
        product={{
          ...product,
          createdAt: product.createdAt.toISOString(),
          reviews: product.reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        }}
        deliveryNote={map.estimatedDeliveryNote}
      />

      {completeTheFit.length > 0 && (
        <section className="mt-16 border-t border-border pt-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Complete the fit</p>
              <h2 className="mt-1 font-display text-2xl uppercase tracking-tight sm:text-3xl">Jersey + Baggy Pants = Clean</h2>
            </div>
            <Link href="/shop" className="hidden text-xs font-bold uppercase tracking-wider hover:text-flame sm:block">
              Shop all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {completeTheFit.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
