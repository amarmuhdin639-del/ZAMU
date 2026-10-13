import { Instagram, Facebook, Youtube, Send, MessageCircle, Twitter, Link2, Phone, Mail } from 'lucide-react'
import { socialHref, socialLabel } from '@/lib/social'

/** TikTok has no lucide glyph — brand path drawn inline. */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

export function SocialIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? 'h-4 w-4'
  switch (type) {
    case 'tiktok':
      return <TikTokIcon className={cls} />
    case 'instagram':
      return <Instagram className={cls} />
    case 'whatsapp':
      return <MessageCircle className={cls} />
    case 'telegram':
      return <Send className={cls} />
    case 'facebook':
      return <Facebook className={cls} />
    case 'youtube':
      return <Youtube className={cls} />
    case 'x':
      return <Twitter className={cls} />
    case 'phone':
      return <Phone className={cls} />
    case 'email':
      return <Mail className={cls} />
    default:
      return <Link2 className={cls} />
  }
}

/** Footer / bottom-bar row of social icon links, driven by the socialLinks setting. */
export function SocialRow({
  links,
  dark = true,
}: {
  links: { type: string; url: string }[]
  dark?: boolean
}) {
  if (!links.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((l, i) => (
        <a
          key={`${l.type}-${i}`}
          href={socialHref(l.type, l.url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={socialLabel(l.type)}
          title={socialLabel(l.type)}
          className={
            dark
              ? 'flex h-8 w-8 items-center justify-center rounded-[9999px] border border-cream/25 text-cream/75 transition-colors hover:border-flame hover:text-flame'
              : 'flex h-8 w-8 items-center justify-center rounded-[9999px] border border-border text-foreground/70 transition-colors hover:border-foreground hover:text-foreground'
          }
        >
          <SocialIcon type={l.type} className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  )
}
