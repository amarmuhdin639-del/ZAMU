'use client'

import { Star } from 'lucide-react'
import { ratingSummary } from '@/lib/shared'
import { cn } from '@/lib/utils'

// Compact star rating used on product cards & quick view.
// Renders nothing when the product has no approved reviews yet.
export function RatingStars({
  reviews,
  size = 'sm',
  showCount = true,
  className,
}: {
  reviews?: { rating: number }[] | null
  size?: 'sm' | 'md'
  showCount?: boolean
  className?: string
}) {
  const { avg, count } = ratingSummary(reviews)
  if (count === 0) return null
  const px = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  return (
    <span className={cn('flex items-center gap-1', className)} aria-label={`Rated ${avg} out of 5 by ${count} customers`}>
      <span className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              px,
              i <= Math.round(avg) ? 'fill-[#b8a038] text-[#b8a038]' : 'fill-none text-[#b8a038]/40'
            )}
          />
        ))}
      </span>
      <span className={cn('font-bold text-foreground/80', size === 'sm' ? 'text-[11px]' : 'text-xs')}>{avg.toFixed(1)}</span>
      {showCount ? <span className={cn('text-muted-foreground', size === 'sm' ? 'text-[10px]' : 'text-xs')}>({count})</span> : null}
    </span>
  )
}
