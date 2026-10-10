import type { Metadata } from 'next'
import { SizeGuideTable } from '@/components/store/size-guide-table'

export const metadata: Metadata = {
  title: 'Size Guide',
  description: 'Find your size — chest, waist and hip measurements for ZAMU jerseys, tees and hoodies.',
}

export default function SizeGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Fit help</p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-tight">Size Guide</h1>
      <div className="mt-6">
        <SizeGuideTable />
      </div>
    </div>
  )
}
