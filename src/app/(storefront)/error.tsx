'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useLang } from '@/lib/i18n'

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLang()

  useEffect(() => {
    console.error('[zamu] page error:', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-flame">{t('error.tag')}</p>
      <h1 className="mt-4 font-display text-4xl uppercase tracking-tight sm:text-5xl">{t('error.title')}</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{t('error.text')}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-11 items-center rounded-full bg-ink px-7 text-[12px] font-bold uppercase tracking-widest text-cream transition-transform hover:scale-[1.03]"
        >
          {t('error.retry')}
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-border px-7 text-[12px] font-bold uppercase tracking-widest transition-colors hover:border-ink"
        >
          {t('error.home')}
        </Link>
      </div>
    </div>
  )
}
