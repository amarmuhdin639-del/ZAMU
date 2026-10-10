import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-[28vw] leading-none tracking-tight text-secondary sm:text-[180px]">404</p>
      <h1 className="mt-2 font-display text-3xl uppercase tracking-tight">This page dropped off</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        The page you are looking for does not exist or was moved. The shop is still right where you left it.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button className="rounded-full bg-ink px-7 text-xs uppercase tracking-wider hover:bg-flame">Back home</Button>
        </Link>
        <Link href="/shop">
          <Button variant="outline" className="rounded-full px-7 text-xs uppercase tracking-wider">Browse the shop</Button>
        </Link>
      </div>
    </div>
  )
}
