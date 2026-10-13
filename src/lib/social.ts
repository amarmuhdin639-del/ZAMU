// Social links — stored as a JSON setting key ("socialLinks") so the owner can
// add / remove / reorder channels (with a type) from the admin settings page.
// Falls back to the legacy per-field settings when the JSON key is missing.

export type SocialType =
  | 'tiktok'
  | 'instagram'
  | 'whatsapp'
  | 'telegram'
  | 'facebook'
  | 'youtube'
  | 'x'
  | 'other'

export type SocialLink = { type: SocialType; url: string }

export const SOCIAL_TYPES: { type: SocialType; label: string; placeholder: string }[] = [
  { type: 'tiktok', label: 'TikTok', placeholder: '@zamustore or full URL' },
  { type: 'instagram', label: 'Instagram', placeholder: '@zamustore or full URL' },
  { type: 'whatsapp', label: 'WhatsApp', placeholder: '+251 9XX XXX XXX' },
  { type: 'telegram', label: 'Telegram', placeholder: '@zamustore or full URL' },
  { type: 'facebook', label: 'Facebook', placeholder: 'page name or full URL' },
  { type: 'youtube', label: 'YouTube', placeholder: '@channel or full URL' },
  { type: 'x', label: 'X (Twitter)', placeholder: '@handle or full URL' },
  { type: 'other', label: 'Other link', placeholder: 'https://…' },
]

export function socialLabel(type: string): string {
  return SOCIAL_TYPES.find((t) => t.type === type)?.label ?? 'Link'
}

/** Turn a handle / phone / partial URL into a full https link for the given type. */
export function socialHref(type: string, raw: string): string {
  const v = (raw || '').trim()
  if (!v) return '#'
  if (/^https?:\/\//i.test(v)) return v
  const handle = v.replace(/^@/, '').replace(/\s+/g, '')
  switch (type) {
    case 'tiktok':
      return `https://www.tiktok.com/@${handle}`
    case 'instagram':
      return `https://www.instagram.com/${handle}`
    case 'whatsapp': {
      const digits = v.replace(/[^0-9]/g, '')
      return `https://wa.me/${digits}`
    }
    case 'telegram':
      return `https://t.me/${handle}`
    case 'facebook':
      return `https://www.facebook.com/${handle}`
    case 'youtube':
      return `https://www.youtube.com/@${handle}`
    case 'x':
      return `https://x.com/${handle}`
    default:
      return `https://${v}`
  }
}

/** Short display value for a card (handle or the raw value). */
export function socialDisplay(type: string, raw: string): string {
  const v = (raw || '').trim()
  if (!v) return ''
  if (type === 'whatsapp') return v
  if (/^https?:\/\//i.test(v)) return v.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  return v.startsWith('@') ? v : `@${v.replace(/\s+/g, '')}`
}

const DEFAULT_LINKS: SocialLink[] = [
  { type: 'whatsapp', url: '+251900000000' },
  { type: 'tiktok', url: 'zamustore' },
  { type: 'instagram', url: 'zamustore' },
]

/**
 * Parse the "socialLinks" setting (JSON array of {type,url}).
 * Falls back to legacy contact fields, then to the defaults.
 */
export function parseSocialLinks(
  raw: string | undefined,
  legacy?: { whatsapp?: string; tiktok?: string; instagram?: string }
): SocialLink[] {
  if (raw && raw.trim()) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        const clean = arr
          .filter((l) => l && typeof l === 'object' && typeof l.url === 'string' && l.url.trim())
          .map((l) => ({ type: (SOCIAL_TYPES.find((t) => t.type === l.type)?.type ?? 'other') as SocialType, url: l.url.trim() }))
        if (clean.length) return clean
      }
    } catch {
      // fall through to legacy
    }
  }
  if (legacy) {
    const out: SocialLink[] = []
    if (legacy.whatsapp?.trim()) out.push({ type: 'whatsapp', url: legacy.whatsapp.trim() })
    if (legacy.tiktok?.trim()) out.push({ type: 'tiktok', url: legacy.tiktok.trim() })
    if (legacy.instagram?.trim()) out.push({ type: 'instagram', url: legacy.instagram.trim() })
    if (out.length) return out
  }
  return DEFAULT_LINKS
}

export function stringifySocialLinks(links: SocialLink[]): string {
  return JSON.stringify(links.filter((l) => l.url.trim()))
}
