import type { Metadata } from 'next'
import { WishlistClient } from '@/components/store/wishlist-client'

export const metadata: Metadata = { title: 'My Wishlist' }

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Saved for later</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-tight">My Wishlist</h1>
      <WishlistClient />
    </div>
  )
}
