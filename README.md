# TIBEB — Family Streetwear Store

A complete, production-ready e-commerce website for a family-owned clothing business selling **jerseys, baggy pants, oversized tees, hoodies, tracksuits, shorts, jackets and streetwear accessories**.

Built with **Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma + SQLite · Zustand**.

---

## Features

### Storefront
- **Homepage** — hero (image/text editable from admin), category strip, NEW DROP section, flash-sale banner with live countdown, featured products, promo banners, best sellers, recently-viewed carousel
- **Shop** — real search (name/description/SKU/category), filters (category, max price, size, color, in-stock, on-sale, new, best sellers), sorting (newest / popular / featured / price), pagination, clean URLs (`/shop/jerseys`)
- **Product pages** — image gallery with zoom + thumbnails, size & color selection, size guide, stock states ("Only 2 left" / "SOLD OUT"), quantity, add-to-cart, buy-now, wishlist, SKU, reviews with average rating, "Verified Purchase" badges, **Complete the Fit** cross-category recommendations, sticky mobile add-to-cart bar
- **Quick view** modal from any product card, hover image swap, recently-viewed tracking
- **Cart** — persistent (localStorage via Zustand), quantity limits against real stock, drawer + full page
- **Checkout** — guest checkout (no forced account), Telegram/WhatsApp capture, delivery zones with admin-configured fees, discount codes, live totals
- **Payment flow** (manual verification — no gateway needed):
  1. Choose method (Telebirr / CBE Birr / Bank transfer — whatever the admin configures)
  2. Account number + account name + exact amount displayed, with **COPY** button
  3. Upload payment screenshot (JPG/PNG/WEBP, ≤5 MB, magic-byte validated) + transaction ref + payer name
  4. Unique order number generated (`ORD-2026-XXXXX`)
  5. Status stays **PENDING VERIFICATION** until an admin approves — *screenshots never auto-verify*
- **Order tracking** — order number + phone number, visual status timeline, payment status, rejection reasons shown to the customer
- **Amharic & English** — full language switcher (EN / አማ) in the header, mobile menu and footer; the whole customer journey (home, shop, product, cart, checkout, payment, tracking, account, empty states, order-status names) works in both languages; the choice is remembered on the device
- **Ratings everywhere** — average star rating + review count on product cards (shop grid, homepage sections, quick view) and on the product page
- **PWA (installable app)** — install banner + footer "Install App" button, home-screen icon, splash background, offline fallback page and a service worker tuned for weak networks (cached pages & images load even when the connection drops)
- **Accounts (optional)** — register/login, order history, saved delivery info, wishlist sync (guests keep a local wishlist)
- **Reviews** — star rating + text; "Verified Purchase" only for signed-in buyers with a verified order containing the product; admin moderated
- **Content pages** — About (editable story), Contact (WhatsApp/Telegram/Call/Email/Instagram/Facebook buttons), Size Guide, Delivery Info (zones table), Returns & Exchange, Privacy, Terms — all texts editable from admin

### Admin dashboard (`/admin`)
- Secure login (bcrypt-strength scrypt hashing, httpOnly session cookies, protected layout + API routes)
- **Dashboard** — total/pending/verified payments, today's orders, revenue (14-day chart), low-stock & out-of-stock alerts, recent orders, stage breakdown
- **Products** — CRUD, multi-image upload with preview, prices & sale prices, sizes, color swatches, stock, flags (featured/new/best seller), hide/show; products with order history are archived instead of deleted
- **Orders** — search & filters, full detail view (customer, items, totals, payment), status machine (8 stages), admin notes, estimated delivery note, cancel-with-restock
- **Payments** — pending queue with screenshot viewer (private URL), **APPROVE** / **REJECT** (rejection reason is shown to the customer)
- **Settings** — payment methods CRUD (name/account/account holder/instructions/active), delivery zones CRUD (fee/ETA), discount codes (% or fixed, min order, end date, usage), store content (site name, announcement, hero image+text, about story, contact info, delivery/returns/privacy/terms texts, flash-sale config)
- **Audit log** — payment approvals/rejections, status changes, product/price/stock changes, settings edits — with admin name and timestamp
- **Notifications** — in-app bell for new orders & payments needing verification; customer notifications on payment verified / status changed / rejected (email/SMS/WhatsApp hooks can be added later without changing the design)

### Security
- Server-side price calculation — prices from the browser are never trusted
- Stock re-validated inside a DB transaction (no overselling), restock on cancel
- Payment screenshots stored **outside** `public/`, served only to authenticated admins via `/api/files/payments/[file]`
- Upload validation: MIME + magic-byte check, size limits, random filenames
- Order access control: tracking requires order number + phone match; account orders are scoped to the session user
- Admin APIs reject non-admin sessions (403); admin layout redirects non-admins

### Admin accounts & publishing model
- **The admin is the only publisher.** Nothing can be posted, edited or removed by visitors — every catalogue, order, payment, promo and content change happens through the admin dashboard, and every admin API route rejects non-admin sessions. Customers only browse, order and review.
- **One sign-in for everyone.** There is no separate admin login URL. Admins sign in on the normal **/account** page like any customer — and because their account has the ADMIN role they are taken **straight to the dashboard** (customers stay in the customer area). Visiting `/admin` without an admin session bounces to the sign-in page, and the old `/admin/login` address redirects there too.

---

## Getting started

```bash
bun install            # install dependencies
bun run db:push        # create/sync the SQLite database (db/custom.db)
bun run scripts/seed.ts  # seed demo data (products, categories, admin…)
bun run dev            # start dev server on :3000
```

### Demo logins (seeded)

| Role | Login | Password |
|------|-------|----------|
| Admin | `admin@tibeb.store` | `Admin@12345` |
| Customer | `customer@demo.com` | `Customer@123` |

> **Change these immediately before real use** (admin → Settings; or edit `scripts/seed.ts` and re-seed).

### Demo data notice
All 16 products, review texts, payment accounts (`090-000-0000 (DEMO…)`), contact details and policy texts are **clearly-labelled placeholders** so the family can replace them. Payment account numbers, contact info and policies are edited in **Admin → Settings** — nothing is hard-coded.

---

## Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | SQLite file location | `file:/…/db/custom.db` |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO/sitemap | `http://localhost:3000` |

Copy `.env.example` to `.env` and adjust. No secrets live in frontend code; sessions use a random 32-byte token stored in the DB.

---

## Push to GitHub & deploy on your own server

### 1. Push the project to GitHub

```bash
cd tibeb-store
git init
git add .
git commit -m "TIBEB store — initial release"
# create an empty repo on github.com first (Private is recommended), then:
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `.next`, `.env*` (secrets) and `db/*.db` (your live database) — only code ships to GitHub.

### 2. Prepare a server (any Ubuntu VPS, e.g. 1 vCPU / 1 GB is enough)

```bash
# install Bun (Node 20+ also works: use npm/npx instead of bun/bunx)
curl -fsSL https://bun.sh/install | bash

# get the code
git clone https://github.com/<your-username>/<your-repo>.git tibeb-store
cd tibeb-store

# configure
cp .env.example .env
nano .env   # set DATABASE_URL=file:/abs/path/to/db/custom.db and NEXT_PUBLIC_SITE_URL=https://your-domain.com

# install + database
bun install
bun run db:push          # creates the SQLite file & tables
bun run scripts/seed.ts  # optional: demo catalogue (replace via admin afterwards)
```

### 3. Run in production

```bash
bun run build
bun run start        # serves on PORT (default 3000)
```

Keep it alive with **pm2** (`npm i -g pm2` once):

```bash
pm2 start "bun run start" --name tibeb
pm2 startup && pm2 save
```

### 4. HTTPS + domain (required for the PWA & payments trust)

Point your domain A-record to the server IP, then put Caddy (auto-HTTPS) in front:

```
your-domain.com {
    reverse_proxy 127.0.0.1:3000
}
```

`sudo systemctl reload caddy` — done. The **PWA install prompt only appears on HTTPS**, so this step also unlocks the "Install App" banner for customers.

### 5. Backups & updates

- **Backup:** the whole store is the SQLite file — copy `db/custom.db` (and `public/uploads/`) anywhere safe. A nightly `cp db/custom.db backups/$(date +%F).db` cron is enough to start.
- **Update:** `git pull && bun install && bun run db:push && bun run build && pm2 restart tibeb`.

---

## Going live — family checklist

1. **Admin → Settings → Payment methods** — replace the DEMO Telebirr/CBE/Bank accounts with the real ones (name, number, holder, phone, instructions). Customers always see whatever is saved here — changing an account number or phone instantly changes what buyers copy and pay to.
2. **Admin → Settings → Store & content** — set real phone/WhatsApp/Telegram/Instagram/Facebook, address, about story, delivery info, returns, privacy and terms texts, hero image and headline.
3. **Admin → Products** — delete or hide the demo products (delete = archived if they have orders), upload real photos (first image = main, second = hover), set real prices/stock. Only the admin can publish — new products appear in **New Drop** automatically when "New" is ticked, and in **Featured** when "Featured" is ticked.
4. **Admin → Settings → Delivery zones** — set the real zones and fees.
5. Create real admin accounts, delete the seeded `admin@tibeb.store`.
6. Set `NEXT_PUBLIC_SITE_URL` to the real domain before deploying.

## Daily operations (the family)

- A **notification bell** appears when a new order or payment arrives → open **Payments**, compare the screenshot and transaction ref with your Telebirr/CBE/bank statement → **Approve** or **Reject with a reason**.
- After approval, move the order through **Preparing → Ready → Out for delivery → Delivered** in **Orders** (the customer sees the progress live on the tracking page).
- Adjust stock anytime from **Products**; create discount codes for promotions from **Settings → Promotions**.
- Everything important is recorded in the **Audit Log**.
