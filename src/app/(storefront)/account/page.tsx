import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AccountClient } from '@/components/store/account-client'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = { title: 'My Account' }
export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const user = await getSessionUser()
  // Admins sign in on the same page as customers, but land straight in the
  // dashboard — keeps the admin area invisible to normal visitors.
  if (user?.role === 'ADMIN') redirect('/admin')
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">Customer area</p>
      <h1 className="mb-6 mt-1 font-display text-4xl uppercase tracking-tight">
        {user ? `Hey, ${user.name.split(' ')[0]}` : 'My Account'}
      </h1>
      <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
        <AccountClient user={user} />
      </Suspense>
    </div>
  )
}
