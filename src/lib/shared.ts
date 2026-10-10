// Shared constants, labels and formatting helpers (safe on client + server)

export const CURRENCY = 'ETB'

export function formatPrice(n: number | null | undefined): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0
  return `${CURRENCY} ${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function discountPercent(price: number, salePrice?: number | null): number | null {
  if (!salePrice || salePrice >= price) return null
  return Math.round(((price - salePrice) / price) * 100)
}

// ---------- ratings ----------

export type RatingSummary = { avg: number; count: number }

export function ratingSummary(reviews?: { rating: number }[] | null): RatingSummary {
  if (!reviews || reviews.length === 0) return { avg: 0, count: 0 }
  const avg = reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
  return { avg: Math.round(avg * 10) / 10, count: reviews.length }
}

// ---------- order status machine ----------

export const ORDER_STATUSES = [
  'ORDER_PLACED',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'PREPARING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABELS: Record<string, string> = {
  ORDER_PLACED: 'Order Placed',
  PAYMENT_PENDING: 'Payment Pending',
  PAYMENT_VERIFIED: 'Payment Verified',
  PREPARING: 'Preparing Order',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export const PAYMENT_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Verification',
  VERIFIED: 'Paid / Verified',
  REJECTED: 'Payment Rejected',
}

// Timeline stages shown to customers (CANCELLED handled separately)
export const ORDER_TIMELINE: { key: string; label: string }[] = [
  { key: 'ORDER_PLACED', label: 'Order Placed' },
  { key: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'OUT_FOR_DELIVERY', label: 'Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
]

export function timelineIndex(status: string): number {
  const idx = ORDER_TIMELINE.findIndex((s) => s.key === status)
  if (status === 'READY_FOR_DELIVERY') return 2.5 // between preparing & delivery
  if (status === 'PAYMENT_PENDING') return 0
  return idx
}

// ---------- sizes / colors ----------

export const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

export type ProductColor = { name: string; hex: string; image?: string }

export function parseColors(json: string): ProductColor[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // legacy comma-separated format
    return json.split(',').map((c) => c.trim()).filter(Boolean).map((name) => ({ name, hex: '#888888' }))
  }
  return []
}

export function parseSizes(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean)
}

// ---------- misc ----------

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
