'use client'

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'
import { isVideoUrl } from '@/lib/media'
import { cn } from '@/lib/utils'

/**
 * Branded placeholder rendered when a media URL is missing or fails to load
 * (e.g. a photo that was never uploaded yet, or a file lost to a restore).
 */
export function MediaFallback({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center gap-1 bg-secondary',
        className
      )}
    >
      <span
        className="text-5xl leading-none text-ink/20 select-none"
        style={{ fontFamily: "var(--font-anton), 'Arial Narrow', sans-serif" }}
      >
        Z
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink/30">
        ZAMU
      </span>
    </div>
  )
}

/**
 * Renders a product/hero media URL: <Image> for photos, an inline muted
 * <video> for MP4/MOV/WEBM uploads. Positioned like next/image `fill`
 * (absolute inset-0), so drop it inside any relative container.
 * Falls back to the branded MediaFallback when the URL 404s or errors.
 */
export function MediaBox({
  src,
  alt,
  sizes,
  className,
  priority = false,
  autoPlay = false,
  hoverPlay = false,
}: {
  src: string
  alt: string
  sizes?: string
  className?: string
  priority?: boolean
  autoPlay?: boolean
  hoverPlay?: boolean
}) {
  // Track WHICH src failed instead of a boolean — a new src automatically
  // gets a fresh chance to load, no reset effect needed.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc === src

  if (failed) return <MediaFallback />

  if (isVideoUrl(src)) {
    return (
      <video
        src={`${src}#t=0.1`}
        aria-label={alt}
        muted
        loop
        playsInline
        autoPlay={autoPlay}
        preload={autoPlay ? 'auto' : 'metadata'}
        onError={() => setFailedSrc(src)}
        className={cn('absolute inset-0 h-full w-full', className)}
        onMouseEnter={hoverPlay ? (e) => { e.currentTarget.play().catch(() => {}) } : undefined}
        onMouseLeave={hoverPlay ? (e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 } : undefined}
      />
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailedSrc(src)}
      className={className}
    />
  )
}

/**
 * Drop-in next/image wrapper that renders MediaFallback when the image
 * fails to load (404 / missing file). Use it anywhere a product image is
 * rendered outside of MediaBox (cart thumbs, zoom dialog, admin forms...).
 */
export function SafeImage({ src, ...props }: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = typeof src === 'string' && failedSrc === src

  if (failed || !src) return <MediaFallback className="rounded-md" />
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt arrives via props
    <Image src={src} {...props} onError={() => setFailedSrc(src)} />
  )
}
