import type { MetadataRoute } from 'next'

// PWA manifest — ZAMU is installable: home screen icon, standalone window,
// offline-capable shell via /sw.js (low-bandwidth friendly).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ZAMU — Wear Your Style',
    short_name: 'ZAMU',
    description:
      'Family-owned streetwear store: football jerseys, baggy pants, oversized tees, hoodies and tracksuits. Pay with Telebirr, CBE Birr or bank transfer.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#141412',
    theme_color: '#141412',
    lang: 'en',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icons/crown-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/crown-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/crown-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Shop', url: '/shop', icons: [{ src: '/icons/crown-192.png', sizes: '192x192' }] },
      { name: 'Track Order', url: '/track', icons: [{ src: '/icons/crown-192.png', sizes: '192x192' }] },
      { name: 'Wishlist', url: '/wishlist', icons: [{ src: '/icons/crown-192.png', sizes: '192x192' }] },
    ],
  }
}
