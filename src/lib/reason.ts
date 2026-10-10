import type { Lang } from '@/lib/i18n'

export type ReasonHolder = {
  rejectionReason: string | null
  rejectionReasonEn?: string | null
  rejectionReasonAm?: string | null
}

/**
 * Picks the rejection reason in the viewer's UI language.
 * Falls back to the admin's original note when a translation is missing.
 */
export function pickReason(holder: ReasonHolder | null | undefined, lang: Lang): string {
  if (!holder?.rejectionReason) return ''
  return (lang === 'am' ? holder.rejectionReasonAm : holder.rejectionReasonEn) ?? holder.rejectionReason
}
