import type { Metadata, Viewport } from 'next'
import { Anton, Archivo } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'ZAMU — Jerseys, Baggy Fits & Streetwear',
    template: '%s · ZAMU',
  },
  description:
    'ZAMU is a family-owned streetwear store: football jerseys, baggy pants, oversized tees, hoodies and tracksuits. Wear your style.',
  openGraph: {
    title: 'ZAMU — Wear Your Style',
    description: 'Jerseys, baggy fits & streetwear made for your everyday.',
    type: 'website',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ZAMU',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#141412',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster position="top-center" richColors toastOptions={{ style: { fontFamily: 'var(--font-archivo)' } }} />
      </body>
    </html>
  )
}
