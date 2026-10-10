import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AdminShell } from '@/components/admin/admin-shell'
import { LanguageProvider } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

// Server-side guard: every /admin/* page requires an ADMIN session.
// Non-admins (including customers) are bounced to the normal sign-in page —
// there is no separate admin login URL.
// The panel shares the storefront language provider, so the EN / አማ
// preference carries over to the admin side too.
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    redirect('/account?tab=login')
  }
  return (
    <LanguageProvider>
      <AdminShell adminName={user.name}>{children}</AdminShell>
    </LanguageProvider>
  )
}
