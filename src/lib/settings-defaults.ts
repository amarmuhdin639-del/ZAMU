// Default store settings — shared by server queries, admin UI and the seed script.
// Keep this file free of server-only imports.
export const SETTING_DEFAULTS: Record<string, string> = {
  siteName: 'ZAMU',
  tagline: 'Wants, needs & everything between.',
  announcement: 'FREE DELIVERY IN ADDIS ON ORDERS OVER 2,000 ETB · PAY WITH TELEBIRR, CBE BIRR OR BANK TRANSFER',
  heroTitle: 'WANTS &\nNEEDS.',
  heroSubtitle: 'Essential jerseys, baggy fits & streetwear — limited runs, packed and shipped by the family.',
  heroImage: '', // optional photo; homepage shows the Z poster when empty
  heroVideo: '', // optional MP4/MOV/WEBM hero clip; overrides heroImage when set
  aboutTitle: 'A family thing.',
  aboutText:
    'We are a family-owned clothing business. What started around the living room table — folding jerseys, arguing about which kit looks cleanest — grew into a small store built on trust. We sell jerseys, baggy pants, oversized tees, hoodies and tracksuits for people who care how they show up. Every order is checked, packed and shipped by the family. When you call, you talk to us — not a call center.',
  contactPhone: '+251 900 000 000',
  contactEmail: 'hello@zamu.store',
  contactAddress: 'Addis Ababa, Ethiopia',
  contactWhatsapp: '+251900000000',
  contactTelegram: 'zamustore',
  contactInstagram: 'zamustore',
  contactFacebook: 'zamustore',
  deliveryInfo:
    'Orders are delivered after payment is verified by our team. Addis Ababa orders are usually delivered within 1–2 days after verification. Other cities may take 3–5 working days. You can track your order anytime using your order number and phone number.',
  returnsPolicy:
    'Exchanges are accepted for unworn items with tags attached. If you received a damaged or wrong item, contact us within 48 hours of delivery with a photo and your order number. Because every order is handled personally by the family, message us on WhatsApp or Telegram first — we always make it right. Custom or sale items may be final sale. Replace this text in your store settings with your real policy.',
  privacyPolicy:
    'We collect only the information needed to deliver your order: your name, phone number and delivery address. Payment screenshots are stored privately and are only visible to store administrators. We never sell or share your data with third parties. Replace this text in your store settings with your real policy.',
  termsText:
    'By placing an order you agree that payment must be verified by our team before the order is processed. Prices are listed in Ethiopian Birr and may change without notice. Product availability is not guaranteed until payment is verified. Replace this text in your store settings with your real terms.',
  flashSaleEndsAt: '', // ISO date string; empty = no active flash sale
  flashSaleText: 'FLASH SALE — UP TO 30% OFF SELECTED JERSEYS',
  estimatedDeliveryNote: 'Delivered in 1–2 days after payment verification (Addis Ababa)',
}
