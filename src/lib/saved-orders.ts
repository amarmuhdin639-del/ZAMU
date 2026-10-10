// Orders remembered on the customer's device (localStorage) so guests can
// track without retyping their order number + phone every visit.
// Everything is best-effort: private mode / quota errors must never crash UI.

const KEY = 'zamu.savedOrders.v1'
const MAX = 20

export type SavedOrder = {
  orderNumber: string
  phone: string
  total?: number
  savedAt: string
  status?: string
}

export function getSavedOrders(): SavedOrder[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as SavedOrder[]
    if (!Array.isArray(list)) return []
    return list
      .filter((o) => o && typeof o.orderNumber === 'string' && typeof o.phone === 'string')
      .slice(0, MAX)
  } catch {
    return []
  }
}

export function saveOrder(order: { orderNumber: string; phone: string; total?: number; status?: string }): SavedOrder[] {
  try {
    const prev = getSavedOrders().filter((o) => o.orderNumber !== order.orderNumber)
    const next: SavedOrder[] = [
      { ...order, savedAt: new Date().toISOString() },
      ...prev,
    ].slice(0, MAX)
    window.localStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch {
    return getSavedOrders()
  }
}

export function removeSavedOrder(orderNumber: string): SavedOrder[] {
  try {
    const next = getSavedOrders().filter((o) => o.orderNumber !== orderNumber)
    window.localStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch {
    return getSavedOrders()
  }
}

// Refresh a stored order's fulfillment status in place (keeps list order).
export function updateSavedStatus(orderNumber: string, status: string): SavedOrder[] {
  try {
    const list = getSavedOrders()
    const i = list.findIndex((o) => o.orderNumber.toUpperCase() === orderNumber.toUpperCase())
    if (i === -1) return list
    list[i] = { ...list[i], status }
    window.localStorage.setItem(KEY, JSON.stringify(list))
    return list
  } catch {
    return getSavedOrders()
  }
}

export function findSavedOrder(orderNumber: string): SavedOrder | undefined {
  const n = orderNumber.trim().toUpperCase()
  return getSavedOrders().find((o) => o.orderNumber.toUpperCase() === n)
}
