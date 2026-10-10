import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, Truck, Clock3, BadgeCheck } from 'lucide-react'
import { db } from '@/lib/db'
import { getSettings, SETTING_DEFAULTS, listProducts, productCardSelect } from '@/lib/queries'
import { ProductCard } from '@/components/store/product-card'
import { MediaBox } from '@/components/store/media-box'
import { FlashCountdown } from '@/components/store/flash-countdown'
import { RecentlyViewed } from '@/components/store/recently-viewed'
import { T } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [settings, categories, newDrop, featured, bestSellers, onSale] = await Promise.all([
    getSettings(),
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, take: 8 }),
    listProducts({ isNew: true, perPage: 4, sort: 'newest' }),
    listProducts({ featured: true, perPage: 8, sort: 'popular' }),
    listProducts({ bestSeller: true, perPage: 4, sort: 'popular' }),
    listProducts({ onSale: true, perPage: 4, sort: 'price-asc' }),
  ])
  const map = { ...SETTING_DEFAULTS, ...settings }
  const flashEnds = map.flashSaleEndsAt
  const flashActive = flashEnds && new Date(flashEnds) > new Date()
  const hasProducts = newDrop.items.length > 0 || featured.items.length > 0 || bestSellers.items.length > 0 || onSale.items.length > 0

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-ink text-cream">
        <div className="relative mx-auto grid min-h-[78svh] max-w-7xl items-center gap-8 px-4 pb-16 pt-14 sm:px-6 md:min-h-[82svh] lg:grid-cols-2 lg:gap-4 lg:px-8">
          <div className="relative z-10 order-2 lg:order-1">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cream/20 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cream/80">
              <span className="h-1.5 w-1.5 rounded-full bg-cream" />
              <T k="home.familyBadge" />
            </p>
            <h1 className="font-display text-[13.5vw] leading-[0.95] tracking-tight uppercase whitespace-pre-line sm:text-7xl lg:text-[86px]">
              {map.heroTitle}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-cream/70 sm:text-lg">{map.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop">
                <Button className="h-12 rounded-full bg-cream px-8 text-xs font-bold uppercase tracking-[0.14em] text-ink hover:bg-white">
                  <T k="home.shopNow" /> <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/shop?isNew=1">
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-cream/30 bg-transparent px-8 text-xs font-bold uppercase tracking-[0.14em] text-cream hover:bg-cream hover:text-ink"
                >
                  <T k="nav.newArrivals" />
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-semibold uppercase tracking-wider text-cream/50">
              <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-flame" /> <T k="home.trustDelivery" /></span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-flame" /> <T k="home.trustPayment" /></span>
              <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-flame" /> <T k="home.trustFamily" /></span>
            </div>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl sm:aspect-[16/11] lg:aspect-[4/4.6]">
              {map.heroVideo ? (
                <video
                  src={map.heroVideo}
                  poster={map.heroImage || undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-label="ZAMU drop video"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream p-8 text-center" aria-hidden>
                  <p className="wordmark text-[42vw] leading-none text-ink sm:text-[170px] lg:text-[190px]">Z</p>
                  <p className="mt-3 font-display text-[11px] uppercase tracking-[0.34em] text-ink/80 sm:text-xs">Addis Ababa · Family Run</p>
                  <p className="mt-1.5 font-display text-[11px] uppercase tracking-[0.34em] text-ink/50 sm:text-xs">Limited Runs · No Restocks</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent lg:hidden" />
            </div>
            <div className="absolute -bottom-5 left-4 hidden rounded-2xl bg-cream px-5 py-4 text-ink shadow-xl sm:block lg:-left-6">
              <p className="font-display text-2xl uppercase leading-none"><T k="home.newDropBadge" /></p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-80"><T k="home.newDropSub" /></p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CATEGORY STRIP ============ */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame"><T k="home.shopByCategory" /></p>
            <h2 className="mt-1 font-display text-2xl uppercase tracking-tight sm:text-3xl"><T k="home.pickYourLane" /></h2>
          </div>
          <Link href="/shop" className="hidden items-center gap-1 text-xs font-bold uppercase tracking-wider hover:text-flame sm:flex">
            <T k="home.allProducts" /> <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-8">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.slug}`}
              className="group relative aspect-[4/5] w-[46%] shrink-0 snap-start overflow-hidden rounded-xl bg-secondary sm:aspect-auto sm:w-auto sm:h-40 lg:h-44"
            >
              {c.image ? (
                <MediaBox
                  src={c.image}
                  alt={c.name}
                  hoverPlay
                  sizes="(max-width: 640px) 46vw, 180px"
                  className="img-zoom object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-display text-sm uppercase leading-tight text-white sm:text-base">{c.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ NEW DROP ============ */}
      {newDrop.items.length > 0 ? (
      <section className="bg-ink py-14 text-cream lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cream/60"><T k="home.justLanded" /></p>
              <h2 className="mt-1 font-display text-4xl uppercase tracking-tight sm:text-5xl"><T k="home.newDrop" /></h2>
              <p className="mt-2 max-w-md text-sm text-cream/60"><T k="home.newDropText" /></p>
            </div>
            <Link href="/shop?isNew=1">
              <Button className="rounded-full bg-cream px-6 text-xs font-bold uppercase tracking-wider text-ink hover:bg-flame hover:text-white">
                <T k="home.viewAllNew" /> <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {newDrop.items.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 2} />
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {/* ============ FIRST DROP COMING ============ */}
      {!hasProducts ? (
        <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
          <p className="font-display text-[11vw] uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            <T k="home.dropComingTitle" />
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground"><T k="home.dropComingText" /></p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flame" /> ZAMU
          </span>
        </section>
      ) : null}

      {/* ============ FLASH SALE ============ */}
      {flashActive && onSale.items.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="relative overflow-hidden rounded-2xl bg-[#2a0a00] text-white">
            <div className="relative grid gap-6 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80"><T k="home.limitedTime" /></p>
                <h2 className="mt-1 font-display text-3xl uppercase sm:text-4xl">{map.flashSaleText}</h2>
                <div className="mt-4"><FlashCountdown endsAt={flashEnds} /></div>
              </div>
              <Link href="/shop?onSale=1">
                <Button className="rounded-full bg-flame px-7 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-ink">
                  <T k="home.shopTheSale" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {onSale.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ============ FEATURED ============ */}
      {featured.items.length > 0 ? (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame"><T k="home.curated" /></p>
            <h2 className="mt-1 font-display text-2xl uppercase tracking-tight sm:text-3xl"><T k="home.featuredFits" /></h2>
          </div>
          <Link href="/shop?featured=1" className="hidden items-center gap-1 text-xs font-bold uppercase tracking-wider hover:text-flame sm:flex">
            <T k="common.viewAll" /> <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {featured.items.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      ) : null}

      {/* ============ PROMO BANNERS ============ */}
      {hasProducts ? (
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        <Link href="/shop/jerseys" className="group flex flex-col justify-end overflow-hidden rounded-2xl bg-ink p-8 text-cream transition-colors hover:bg-[#1d1d1b] sm:aspect-[16/9] sm:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cream/60"><T k="home.matchDay" /></p>
          <p className="mt-1 font-display text-2xl uppercase sm:text-3xl"><T k="home.jerseySeason" /></p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider underline underline-offset-4"><T k="home.shopJerseys" /> <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></p>
        </Link>
        <Link href="/shop/baggy-pants" className="group flex flex-col justify-end overflow-hidden rounded-2xl bg-cream p-8 text-ink transition-colors hover:bg-white sm:aspect-[16/9] sm:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink/60"><T k="home.wideLoad" /></p>
          <p className="mt-1 font-display text-2xl uppercase sm:text-3xl"><T k="home.baggyEverything" /></p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider underline underline-offset-4"><T k="home.shopBaggy" /> <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></p>
        </Link>
      </section>
      ) : null}

      {/* ============ BEST SELLERS ============ */}
      {bestSellers.items.length > 0 ? (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame"><T k="home.communityFavorites" /></p>
            <h2 className="mt-1 font-display text-2xl uppercase tracking-tight sm:text-3xl"><T k="home.bestSellers" /></h2>
          </div>
          <Link href="/shop?bestSeller=1" className="hidden items-center gap-1 text-xs font-bold uppercase tracking-wider hover:text-flame sm:flex">
            <T k="common.viewAll" /> <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {bestSellers.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      ) : null}

      <RecentlyViewed />

      {/* ============ VALUES STRIP ============ */}
      <section className="border-t border-border bg-secondary/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { icon: Truck, titleKey: 'home.valueDeliveryTitle', textKey: 'home.valueDeliveryText' },
            { icon: ShieldCheck, titleKey: 'home.valueVerifiedTitle', textKey: 'home.valueVerifiedText' },
            { icon: Clock3, titleKey: 'home.valueFamilyTitle', textKey: 'home.valueFamilyText' },
          ].map((v) => (
            <div key={v.titleKey} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-cream">
                <v.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base uppercase tracking-wide"><T k={v.titleKey} /></p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground"><T k={v.textKey} /></p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
