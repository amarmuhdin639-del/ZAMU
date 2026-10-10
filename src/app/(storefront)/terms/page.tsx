import type { Metadata } from 'next'
import { getSettings, SETTING_DEFAULTS } from '@/lib/queries'

export const metadata: Metadata = { title: 'Terms & Conditions' }
export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  const settings = await getSettings()
  const map = { ...SETTING_DEFAULTS, ...settings }
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Legal</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-tight">Terms & Conditions</h1>
      <div className="mt-4 whitespace-pre-line rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-foreground/80 sm:p-8">
        {map.termsText}
      </div>
    </div>
  )
}
