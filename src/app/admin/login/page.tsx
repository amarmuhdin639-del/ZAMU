import { redirect } from 'next/navigation'

// DEPRECATED: there is no separate admin login anymore.
// Admins sign in on the normal /account sign-in page —
// when the account has the ADMIN role they are taken straight to the dashboard.
export default function AdminLoginPage() {
  redirect('/account?tab=login')
}
