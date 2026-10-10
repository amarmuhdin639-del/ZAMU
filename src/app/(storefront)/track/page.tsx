import type { Metadata } from 'next'
import { TrackPageClient } from '@/components/store/track-client'

export const metadata: Metadata = {
  title: 'Track Order',
  description: 'Track your ZAMU order with your order number and phone number.',
}

export default function TrackPage() {
  return <TrackPageClient />
}
