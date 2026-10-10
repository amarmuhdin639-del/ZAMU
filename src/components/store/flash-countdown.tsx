'use client'

import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function FlashCountdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const raf = requestAnimationFrame(tick)
    const t = setInterval(tick, 1000)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(t)
    }
  }, [])

  if (!now) {
    return (
      <div className="flex items-center gap-2 font-display text-xl">
        <span className="inline-block h-6 w-14 animate-pulse rounded bg-white/20" />
        <span className="inline-block h-6 w-14 animate-pulse rounded bg-white/20" />
        <span className="inline-block h-6 w-14 animate-pulse rounded bg-white/20" />
      </div>
    )
  }

  const diff = new Date(endsAt).getTime() - now
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  return (
    <div className="flex items-center gap-2" aria-label="Sale countdown">
      <Timer className="h-5 w-5 animate-pulse" />
      <div className="flex items-center gap-1.5 font-display text-xl sm:text-2xl">
        {d > 0 && <span>{d}d</span>}
        <span className="rounded-md bg-white/15 px-2 py-0.5 tabular-nums">{pad(h)}</span>:
        <span className="rounded-md bg-white/15 px-2 py-0.5 tabular-nums">{pad(m)}</span>:
        <span className="rounded-md bg-white/15 px-2 py-0.5 tabular-nums">{pad(s)}</span>
      </div>
    </div>
  )
}
