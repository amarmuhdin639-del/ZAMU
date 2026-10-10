'use client'

import { useState } from 'react'
import { Star, BadgeCheck, MessageSquarePlus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateTime } from '@/lib/shared'
import { toast } from 'sonner'

export type ReviewItem = {
  id: string
  name: string
  rating: number
  comment: string
  verified: boolean
  createdAt: string | Date
  user?: { name: string } | null
}

export function ReviewsSection({ productId, reviews }: { productId: string; reviews: ReviewItem[] }) {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <p className="font-display text-lg uppercase">No reviews yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Be the first to rate this piece — your review helps the family improve and helps other customers choose right.
            </p>
          </div>
        ) : (
          reviews.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{r.name}</span>
                {r.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#4a7c59]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4a7c59]">
                    <BadgeCheck className="h-3 w-3" /> Verified purchase
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
              </div>
              <div className="mt-1.5 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-[#b8a038] text-[#b8a038]' : 'text-border'}`} />
                ))}
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-foreground/80">{r.comment}</p>
            </article>
          ))
        )}
      </div>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <WriteReview productId={productId} />
        <div className="mt-4 rounded-xl bg-secondary/70 p-4 text-xs leading-relaxed text-muted-foreground">
          Only customers whose payment was verified can earn the “Verified Purchase” badge. All reviews are moderated by the family.
        </div>
      </div>
    </div>
  )
}

function WriteReview({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, name: name || 'Anonymous', rating, comment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      toast.success('Thanks for the review! It will appear after moderation.')
      setOpen(false)
      setName('')
      setComment('')
      setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit review')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">
          <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Write a review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase">Rate this product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setRating(i + 1)} aria-label={`${i + 1} stars`}>
                <Star className={`h-7 w-7 ${i < rating ? 'fill-[#b8a038] text-[#b8a038]' : 'text-border'}`} />
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="rev-name">Your name</Label>
            <Input id="rev-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anonymous" />
          </div>
          <div>
            <Label htmlFor="rev-comment">Your review</Label>
            <Textarea id="rev-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="How is the fit, fabric, feel?" />
          </div>
          <Button onClick={submit} disabled={busy || comment.length < 4} className="w-full rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame disabled:opacity-40">
            {busy ? 'Submitting…' : 'Submit review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
