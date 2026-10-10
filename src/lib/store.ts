'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============ CART ============

export type CartItem = {
  key: string
  productId: string
  slug: string
  name: string
  image: string | null
  price: number // effective unit price (sale price if present)
  qty: number
  size: string
  color: string
  maxStock: number
}

type CartState = {
  items: CartItem[]
  isOpen: boolean
  open: () => void
  close: () => void
  add: (item: Omit<CartItem, 'key'>) => { ok: boolean; error?: string }
  updateQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  count: () => number
  subtotal: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      add: (item) => {
        const key = `${item.productId}|${item.size}|${item.color}`
        const items = get().items
        const existing = items.find((i) => i.key === key)
        if (existing) {
          const newQty = existing.qty + item.qty
          if (item.maxStock > 0 && newQty > item.maxStock) {
            return { ok: false, error: `Only ${item.maxStock} in stock` }
          }
          set({ items: items.map((i) => (i.key === key ? { ...i, qty: newQty } : i)) })
          return { ok: true }
        }
        if (item.maxStock <= 0) return { ok: false, error: 'This item is sold out' }
        if (item.qty > item.maxStock) return { ok: false, error: `Only ${item.maxStock} in stock` }
        set({ items: [...items, { ...item, key }] })
        return { ok: true }
      },
      updateQty: (key, qty) => {
        set({
          items: get().items
            .map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(qty, i.maxStock > 0 ? i.maxStock : 99)) } : i))
            .filter((i) => i.qty > 0),
        })
      },
      remove: (key) => set({ items: get().items.filter((i) => i.key !== key) }),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.price * i.qty, 0),
    }),
    { name: 'tibeb-cart' }
  )
)

// ============ WISHLIST ============

export type WishItem = {
  productId: string
  slug: string
  name: string
  image: string | null
  price: number
  salePrice: number | null
}

type WishState = {
  items: WishItem[]
  has: (productId: string) => boolean
  toggle: (item: WishItem) => boolean // returns true if now favorited
  remove: (productId: string) => void
  setAll: (items: WishItem[]) => void
}

export const useWishlist = create<WishState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (id) => get().items.some((i) => i.productId === id),
      toggle: (item) => {
        const exists = get().has(item.productId)
        if (exists) {
          set({ items: get().items.filter((i) => i.productId !== item.productId) })
          return false
        }
        set({ items: [item, ...get().items] })
        return true
      },
      remove: (id) => set({ items: get().items.filter((i) => i.productId !== id) }),
      setAll: (items) => set({ items }),
    }),
    { name: 'tibeb-wishlist' }
  )
)

// ============ RECENTLY VIEWED (localStorage, non-persist API) ============

export type RecentItem = { slug: string; name: string; image: string | null; price: number; salePrice: number | null }

const RECENT_KEY = 'tibeb-recent'

export function pushRecent(item: RecentItem) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    let list: RecentItem[] = raw ? JSON.parse(raw) : []
    list = [item, ...list.filter((i) => i.slug !== item.slug)].slice(0, 8)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function getRecent(): RecentItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
