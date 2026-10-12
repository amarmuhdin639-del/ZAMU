#!/usr/bin/env bash
# ===============================================================
# ZAMU admin API + media restore (companion to zamu-setup.sh)
#   Restores the admin API routes that are missing from the GitHub
#   deploy (settings, discounts, banners, categories, delivery
#   zones, payment methods id-routes, upload, media serving,
#   payment file serving) + the persist helper they need.
#   Fixes: admin settings page loading forever, image upload
#   failing with 409, payment screenshots not displaying.
#   Also: guards prisma/schema.prisma (MediaAsset model) and makes
#   the settings page resilient (one broken endpoint can't freeze it).
#
# Safe: contains NO secrets, touches NO env vars, NO database.
# Usage: save next to package.json in your repo root, then:
#        bash zamu-admin-api.sh
# After it passes, ALSO open /api/admin/ensure-media-table once in
# the browser while logged in as admin (creates the media table in
# the production DB if it is missing).
# ===============================================================
set -u
cd "$(dirname "$0")"
[ -f package.json ] || { echo "ERROR: put zamu-admin-api.sh in your repo root (next to package.json) and run it there"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: node not found (run inside a Codespace)"; exit 1; }
MISS=0
step() { echo; echo "===== $1 ====="; }

step "1/4 Writing 17 project files"
mkdir -p \
  src/app/api/admin/settings \
  src/app/api/admin/upload \
  "src/app/api/admin/discounts/[id]" \
  "src/app/api/admin/banners/[id]" \
  "src/app/api/admin/categories/[id]" \
  "src/app/api/admin/delivery-zones/[id]" \
  "src/app/api/admin/payment-methods/[id]" \
  src/app/api/admin/ensure-media-table \
  "src/app/api/media/[...path]" \
  "src/app/api/files/payments/[file]" \
  src/lib

echo '  + src/app/api/admin/settings/route.ts'
cat > 'src/app/api/admin/settings/route.ts' <<'ZAMU_A01'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { SETTING_DEFAULTS } from '@/lib/queries'

const schema = z.record(z.string(), z.string().max(5000))

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const rows = await db.storeSetting.findMany()
  const settings: Record<string, string> = { ...SETTING_DEFAULTS }
  for (const r of rows) settings[r.key] = r.value
  return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const entries = Object.entries(parsed.data)
  for (const [key, value] of entries) {
    await db.storeSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
  }
  await db.auditLog.create({
    data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Updated store settings: ${entries.map(([k]) => k).join(', ').slice(0, 200)}` },
  })
  return NextResponse.json({ ok: true })
}
ZAMU_A01

echo '  + src/app/api/admin/discounts/route.ts'
cat > 'src/app/api/admin/discounts/route.ts' <<'ZAMU_A02'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().min(1).max(1000000),
  minOrder: z.number().min(0).max(1000000).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  usageLimit: z.number().int().min(1).max(100000).nullable().optional(),
  active: z.boolean().optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const discounts = await db.discountCode.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ discounts })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const d = parsed.data
  const code = await db.discountCode.create({
    data: {
      code: d.code.toUpperCase(),
      type: d.type,
      value: d.value,
      minOrder: d.minOrder ?? 0,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
      usageLimit: d.usageLimit ?? null,
      active: d.active ?? true,
    },
  })
  return NextResponse.json({ discount: code })
}
ZAMU_A02

echo '  + src/app/api/admin/discounts/[id]/route.ts'
cat > 'src/app/api/admin/discounts/[id]/route.ts' <<'ZAMU_A03'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  active: z.boolean().optional(),
  code: z.string().min(2).max(40).optional(),
  type: z.enum(['PERCENT', 'FIXED']).optional(),
  value: z.number().min(1).max(1000000).optional(),
  minOrder: z.number().min(0).max(1000000).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  usageLimit: z.number().int().min(1).max(100000).nullable().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const d = { ...parsed.data }
  const data: Record<string, unknown> = { ...d }
  delete (data as { startsAt?: unknown }).startsAt
  if (d.startsAt !== undefined) data.startsAt = d.startsAt ? new Date(d.startsAt) : null
  delete (data as { endsAt?: unknown }).endsAt
  if (d.endsAt !== undefined) data.endsAt = d.endsAt ? new Date(d.endsAt) : null
  const discount = await db.discountCode.update({ where: { id }, data })
  return NextResponse.json({ discount })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  await db.discountCode.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
ZAMU_A03

echo '  + src/app/api/admin/banners/route.ts'
cat > 'src/app/api/admin/banners/route.ts' <<'ZAMU_A04'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional().or(z.literal('')),
  image: z.string().max(300).optional().or(z.literal('')),
  link: z.string().max(200).optional().or(z.literal('')),
  type: z.enum(['PROMO', 'NEW_DROP', 'FLASH']).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const banners = await db.banner.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ banners })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const banner = await db.banner.create({ data: { ...parsed.data, subtitle: parsed.data.subtitle || null, image: parsed.data.image || null, link: parsed.data.link || null } })
  return NextResponse.json({ banner })
}
ZAMU_A04

echo '  + src/app/api/admin/banners/[id]/route.ts'
cat > 'src/app/api/admin/banners/[id]/route.ts' <<'ZAMU_A05'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  title: z.string().min(1).max(120).optional(),
  subtitle: z.string().max(200).nullable().optional(),
  image: z.string().max(300).nullable().optional(),
  link: z.string().max(200).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const banner = await db.banner.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ banner })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  await db.banner.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
ZAMU_A05

echo '  + src/app/api/admin/categories/route.ts'
cat > 'src/app/api/admin/categories/route.ts' <<'ZAMU_A06'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      active: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
  })
  return NextResponse.json({ categories })
}
ZAMU_A06

echo '  + src/app/api/admin/categories/[id]/route.ts'
cat > 'src/app/api/admin/categories/[id]/route.ts' <<'ZAMU_A07'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  image: z.string().max(300).nullable().optional(),
  name: z.string().min(1).max(60).optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const data: { image?: string | null; name?: string } = {}
  if (parsed.data.image !== undefined) data.image = parsed.data.image
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim()
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const category = await db.category.update({ where: { id }, data })
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      adminName: admin.name,
      action: 'CATEGORY_UPDATED',
      details: `${category.name}: ${parsed.data.image !== undefined ? 'image updated' : 'renamed'}`,
    },
  })
  return NextResponse.json({ category })
}
ZAMU_A07

echo '  + src/app/api/admin/delivery-zones/route.ts'
cat > 'src/app/api/admin/delivery-zones/route.ts' <<'ZAMU_A08'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(80),
  fee: z.number().min(0).max(100000),
  estimatedDays: z.string().max(80).optional().or(z.literal('')),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const zones = await db.deliveryZone.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ zones })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const zone = await db.deliveryZone.create({ data: { ...parsed.data, estimatedDays: parsed.data.estimatedDays || null } })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Added delivery zone ${parsed.data.name} (fee ${parsed.data.fee})` } })
  return NextResponse.json({ zone })
}
ZAMU_A08

echo '  + src/app/api/admin/delivery-zones/[id]/route.ts'
cat > 'src/app/api/admin/delivery-zones/[id]/route.ts' <<'ZAMU_A09'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  fee: z.number().min(0).max(100000).optional(),
  estimatedDays: z.string().max(80).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const zone = await db.deliveryZone.update({ where: { id }, data: parsed.data })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Updated delivery zone ${zone.name} (fee ${zone.fee})` } })
  return NextResponse.json({ zone })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const z1 = await db.deliveryZone.delete({ where: { id } }).catch(() => null)
  if (z1) {
    await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Deleted delivery zone ${z1.name}` } })
  }
  return NextResponse.json({ ok: true })
}
ZAMU_A09
echo '  + src/app/api/admin/payment-methods/route.ts'
cat > 'src/app/api/admin/payment-methods/route.ts' <<'ZAMU_A10'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(60),
  accountNumber: z.string().min(1).max(80),
  accountName: z.string().min(1).max(80),
  phone: z.string().max(40).optional().or(z.literal('')),
  instructions: z.string().max(1000).optional().or(z.literal('')),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const methods = await db.paymentMethod.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ methods })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const method = await db.paymentMethod.create({ data: { ...parsed.data, phone: parsed.data.phone || null, instructions: parsed.data.instructions || null } })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Added payment method ${parsed.data.name}` } })
  return NextResponse.json({ method })
}
ZAMU_A10

echo '  + src/app/api/admin/payment-methods/[id]/route.ts'
cat > 'src/app/api/admin/payment-methods/[id]/route.ts' <<'ZAMU_A11'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  accountNumber: z.string().min(1).max(80).optional(),
  accountName: z.string().min(1).max(80).optional(),
  phone: z.string().max(40).nullable().optional(),
  instructions: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const method = await db.paymentMethod.update({ where: { id }, data: parsed.data })
  await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Updated payment method ${method.name}` } })
  return NextResponse.json({ method })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const m = await db.paymentMethod.delete({ where: { id } }).catch(() => null)
  if (m) {
    await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action: 'SETTINGS_CHANGED', details: `Deleted payment method ${m.name}` } })
  }
  return NextResponse.json({ ok: true })
}
ZAMU_A11

echo '  + src/app/api/admin/upload/route.ts'
cat > 'src/app/api/admin/upload/route.ts' <<'ZAMU_A12'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { persistData } from '@/lib/persist'
import { db } from '@/lib/db'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Admin media uploads (product photos/videos + site/category media).
// Durable by design: the bytes are stored in the MediaAsset table (the same
// git-committed sqlite that carries orders) and served via /api/media/*, so
// they survive restarts, sandbox restores and fresh deployments. A best-effort
// disk copy under public/uploads/<folder>/ is kept for the legacy backfill path.

const IMAGE_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const VIDEO_MIME: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
}

const MAX_IMAGE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO = 80 * 1024 * 1024 // 80MB — generous for phone-shot product clips

function detectMagic(b: Uint8Array): string | null {
  // JPEG / PNG / WEBP
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp'
  // ISO BMFF container — MP4 (isom/mp42/…) or MOV (qt)
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    if (b[8] === 0x71 && b[9] === 0x74 && b[10] === 0x20 && b[11] === 0x20) return 'video/quicktime'
    return 'video/mp4'
  }
  // Matroska/WEBM (EBML)
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm'
  return null
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const form = await req.formData()
    const file = form.get('file')
    const target = form.get('target')
    const folder = target === 'site' ? 'site' : target === 'categories' ? 'categories' : 'products'

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const magic = detectMagic(buffer)
    const isImage = !!magic && magic in IMAGE_MIME
    const isVideo = !!magic && magic in VIDEO_MIME

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only real JPG, PNG, WEBP, MP4, MOV or WEBM files are allowed' },
        { status: 415 }
      )
    }
    if (isImage && file.size > MAX_IMAGE) {
      return NextResponse.json({ error: 'Image is too large (max 10MB)' }, { status: 413 })
    }
    if (isVideo && file.size > MAX_VIDEO) {
      return NextResponse.json({ error: 'Video is too large (max 80MB)' }, { status: 413 })
    }

    const ext = isImage ? IMAGE_MIME[magic!] : VIDEO_MIME[magic!]
    const filename = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`
    const rel = `${folder}/${filename}`

    // 1) authoritative copy: the database (rides the git-committed sqlite)
    await db.mediaAsset.upsert({
      where: { path: rel },
      update: { data: new Uint8Array(buffer), mime: magic!, size: buffer.length },
      create: { path: rel, data: new Uint8Array(buffer), mime: magic!, size: buffer.length },
    })

    // 2) best-effort disk copy (lets /api/media backfill and keeps tooling simple)
    try {
      const dir = path.join(process.cwd(), 'public', 'uploads', folder)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, filename), buffer)
    } catch (e) {
      console.error('upload disk copy failed (DB copy still good)', e)
    }

    // Snapshot into git right away so a sandbox restore can never lose the upload.
    persistData()

    return NextResponse.json({ url: `/api/media/${rel}`, type: isVideo ? 'video' : 'image' })
  } catch (e) {
    console.error('admin upload error', e)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
ZAMU_A12

echo '  + src/app/api/media/[...path]/route.ts'
cat > 'src/app/api/media/[...path]/route.ts' <<'ZAMU_A13'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

// Serves uploaded media from the DATABASE (MediaAsset.data) so photos and
// videos survive restarts / restores / instance changes. Falls back to the
// legacy disk copy under public/uploads/<path> and backfills the DB when a
// file only exists on disk. Replaces static /uploads/* serving for new files.

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params
  const rel = parts.join('/')

  // 1) authoritative copy: the database
  try {
    const asset = await db.mediaAsset.findUnique({ where: { path: rel } })
    if (asset) {
      const bytes = Buffer.from(asset.data)
      return new Response(new Uint8Array(bytes), {
        headers: {
          'Content-Type': asset.mime,
          'Content-Length': String(bytes.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }
  } catch (e) {
    console.error('media db lookup failed', e)
  }

  // 2) legacy disk copy under public/uploads/<rel>
  const diskPath = path.join(process.cwd(), 'public', 'uploads', rel)
  try {
    if (fs.existsSync(diskPath)) {
      const stat = fs.statSync(diskPath)
      const stream = Readable.toWeb(fs.createReadStream(diskPath)) as ReadableStream
      // backfill the DB so this file becomes durable too (best-effort, off the critical path)
      void db.mediaAsset
        .upsert({
          where: { path: rel },
          update: {},
          create: {
            path: rel,
            data: new Uint8Array(fs.readFileSync(diskPath)),
            mime: guessMime(rel),
            size: stat.size,
          },
        })
        .catch(() => {})
      return new Response(stream, {
        headers: {
          'Content-Type': guessMime(rel),
          'Content-Length': String(stat.size),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }
  } catch (e) {
    console.error('media disk fallback failed', e)
  }

  return NextResponse.json({ error: 'Media not found' }, { status: 404 })
}

function guessMime(rel: string): string {
  const ext = rel.slice(rel.lastIndexOf('.') + 1).toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
  }
  return map[ext] ?? 'application/octet-stream'
}
ZAMU_A13

echo '  + src/app/api/files/payments/[file]/route.ts'
cat > 'src/app/api/files/payments/[file]/route.ts' <<'ZAMU_A14'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

// Serves customer payment screenshots for the ADMIN payment queue/order detail.
// Source of truth is the database (MediaAsset, path "payments/<file>"); falls
// back to the private on-disk copy under uploads/payments/ and backfills the DB.
// Payment proof is sensitive: admin session required, never cached publicly.

export async function GET(_req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { file } = await ctx.params
  if (!/^[A-Za-z0-9._-]+$/.test(file)) {
    return NextResponse.json({ error: 'Bad filename' }, { status: 400 })
  }

  // 1) authoritative copy: the database
  try {
    const asset = await db.mediaAsset.findUnique({ where: { path: `payments/${file}` } })
    if (asset) {
      const bytes = Buffer.from(asset.data)
      return new Response(new Uint8Array(bytes), {
        headers: {
          'Content-Type': asset.mime,
          'Content-Length': String(bytes.length),
          'Cache-Control': 'private, no-store',
        },
      })
    }
  } catch (e) {
    console.error('payment file db lookup failed', e)
  }

  // 2) legacy private disk copy under uploads/payments/<file>
  const diskPath = path.join(process.cwd(), 'uploads', 'payments', file)
  try {
    if (fs.existsSync(diskPath)) {
      const stream = Readable.toWeb(fs.createReadStream(diskPath)) as ReadableStream
      // backfill into the DB so it becomes durable (best-effort)
      void db.mediaAsset
        .upsert({
          where: { path: `payments/${file}` },
          update: {},
          create: {
            path: `payments/${file}`,
            data: new Uint8Array(fs.readFileSync(diskPath)),
            mime: guessMime(file),
            size: fs.statSync(diskPath).size,
          },
        })
        .catch(() => {})
      return new Response(stream, {
        headers: {
          'Content-Type': guessMime(file),
          'Cache-Control': 'private, no-store',
        },
      })
    }
  } catch (e) {
    console.error('payment file disk fallback failed', e)
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

function guessMime(file: string): string {
  const ext = file.slice(file.lastIndexOf('.') + 1).toLowerCase()
  const map: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  return map[ext] ?? 'application/octet-stream'
}
ZAMU_A14

echo '  + src/app/api/admin/ensure-media-table/route.ts'
cat > 'src/app/api/admin/ensure-media-table/route.ts' <<'ZAMU_A15'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// One-time maintenance endpoint: makes sure the MediaAsset table exists in the
// active database (Turso in production). Idempotent — safe to visit any time.
// Admin-only. While logged in as admin, open /api/admin/ensure-media-table.
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const rows = await db.$queryRaw<{ name: string }[]>`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'MediaAsset'`
    if (rows.length > 0) {
      return NextResponse.json({ ok: true, table: 'MediaAsset', status: 'already exists' })
    }
    await db.$executeRaw`
      CREATE TABLE "MediaAsset" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "path" TEXT NOT NULL,
        "mime" TEXT NOT NULL,
        "size" INTEGER NOT NULL,
        "data" BLOB NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    await db.$executeRaw`
      CREATE UNIQUE INDEX "MediaAsset_path_key" ON "MediaAsset"("path")`
    return NextResponse.json({ ok: true, table: 'MediaAsset', status: 'created' })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'setup failed' },
      { status: 500 }
    )
  }
}
ZAMU_A15

echo '  + src/lib/persist.ts'
cat > 'src/lib/persist.ts' <<'ZAMU_A16'
/*
 * Data-persistence guard.
 *
 * The hosting sandbox periodically restores an old snapshot; anything not yet
 * committed to git (uploaded files, new DB rows) is silently destroyed.
 * This module schedules a best-effort `git commit` of the SQLite database and
 * the uploaded media shortly after every data change, so a restore always
 * brings back the LATEST store data, never an old snapshot.
 *
 * Design constraints:
 *  - fire-and-forget: never throws, never blocks a request, never crashes
 *  - debounced + rate-limited: bursts of writes collapse into few commits
 *  - serialized: one git operation chain, no index.lock pile-ups
 */
import { spawn } from 'child_process'
import path from 'path'

const ROOT = process.cwd()
const TRACKED_PATHS = ['db/custom.db', 'public/uploads', 'uploads']
const DEBOUNCE_MS = 2_500 // wait for the burst to settle
const MIN_GAP_MS = 30_000 // at most one commit per 30s under constant writes
const GIT_TIMEOUT_MS = 15_000

let timer: ReturnType<typeof setTimeout> | null = null
let lastRun = 0
let chain: Promise<void> = Promise.resolve()
let warned = false

function git(args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const done = (ok: boolean) => {
      if (!settled) {
        settled = true
        clearTimeout(killer)
        resolve(ok)
      }
    }
    let child
    try {
      child = spawn('git', args, { cwd: ROOT, stdio: 'ignore' })
    } catch {
      resolve(false)
      return
    }
    const killer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch { /* already gone */ }
      done(false)
    }, GIT_TIMEOUT_MS)
    child.on('error', () => done(false))
    child.on('exit', (code) => done(code === 0))
  })
}

async function runCommit() {
  lastRun = Date.now()
  try {
    const added = await git(['add', '--', ...TRACKED_PATHS])
    if (!added) {
      if (!warned) {
        warned = true
        console.warn('[persist] git add failed — store data is saved in the DB but not snapshot-protected')
      }
      return
    }
    // Non-zero exit is normal when nothing changed — ignore it.
    await git(['commit', '-q', '--no-verify', '-m', 'persist: data guard'])
    warned = false
  } catch {
    /* never surface — persistence is best-effort */
  }
}

/**
 * Schedule a snapshot commit of DB + uploads. Call after any data mutation.
 * Safe to call as often as you like — calls collapse into one commit.
 */
export function persistData(): void {
  // Cloud mode (Turso database / Netlify): the data lives outside this
  // filesystem, so there is nothing to snapshot — and spawning `git` inside
  // a serverless function would just burn time. No-op.
  if (process.env.NETLIFY === 'true' || process.env.TURSO_DATABASE_URL) return
  try {
    if (timer) clearTimeout(timer)
    const since = Date.now() - lastRun
    const wait = since < MIN_GAP_MS ? MIN_GAP_MS - since : DEBOUNCE_MS
    timer = setTimeout(() => {
      timer = null
      chain = chain.then(runCommit).catch(() => {})
    }, wait)
  } catch {
    /* never surface */
  }
}
ZAMU_A16
echo '  + src/lib/http.ts'
cat > 'src/lib/http.ts' <<'ZAMU_A17'
// Fetch helper — always turns any error response into a clear, human message.
// Never crashes on a non-JSON error page (proxy 502 HTML, truncated reply, etc.).
const STATUS_HINTS: Record<number, string> = {
  400: 'the form data was not accepted',
  401: 'please log in again',
  403: 'you do not have permission for this action',
  404: 'the server route is missing — the site deploy may be outdated',
  409: 'conflict — the item may already exist or just went out of stock',
  413: 'the file is too large',
  429: 'too many requests — wait a moment and try again',
  500: 'server error — please try again',
  502: 'server temporarily unavailable — please try again',
  503: 'server temporarily unavailable — please try again',
}

export async function jsonOrThrow<T = Record<string, unknown>>(res: Response): Promise<T> {
  let text = ''
  try {
    text = await res.text()
  } catch {
    throw new Error(
      `The response did not arrive fully — check your connection and try again (${res.status})`
    )
  }

  let body: unknown = null
  let parsed = false
  if (text.trim()) {
    try {
      body = JSON.parse(text)
      parsed = true
    } catch {
      parsed = false
    }
  }

  if (!res.ok) {
    const serverMsg =
      parsed && body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : null
    throw new Error(
      serverMsg ??
        `Request failed (${res.status} — ${STATUS_HINTS[res.status] ?? 'unexpected server response'})`
    )
  }

  if (!parsed && text.trim()) {
    throw new Error(`The server sent an unexpected reply (${res.status})`)
  }
  return (parsed ? body : {}) as T
}
ZAMU_A17

# ---- prisma schema guard: MediaAsset model must exist for the build ----
if grep -q "model MediaAsset" prisma/schema.prisma 2>/dev/null; then
  echo "OK    prisma/schema.prisma: MediaAsset model already present"
else
  echo "" >> prisma/schema.prisma
  cat >> prisma/schema.prisma <<'ZAMU_SCHEMA'
model MediaAsset {
  id        String   @id @default(cuid())
  path      String   @unique // e.g. "products/abc123.png" (no /uploads/ prefix)
  mime      String
  size      Int
  data      Bytes
  createdAt DateTime @default(now())
}
ZAMU_SCHEMA
  echo "OK    prisma/schema.prisma: MediaAsset model appended"
fi

step "2/4 Hardening settings page loader"
cat > .zamu-patch.cjs <<'ZAMU_PATCH_CJS'
const fs = require('fs');
let fail = 0;
const read = (f) => fs.readFileSync(f, 'utf8');

// settings-editor: one broken endpoint must not freeze the whole page
{
  const f = 'src/components/admin/settings-editor.tsx';
  try {
    let s = read(f);
    if (s.includes('getJson')) {
      console.log('SKIP  settings-editor.tsx (safe loader already present)');
    } else {
      const re = /const \[s, pm, dz, dc, bn\] = await Promise\.all\(\[[\s\S]*?setLoaded\(true\)\n  \}, \[\]\)/;
      if (!re.test(s)) { console.log('FAIL  settings-editor.tsx: load() block not found'); fail++; }
      else {
        const next = `const getJson = async (url: string) => {
      // Safe loader: one broken or missing endpoint can no longer freeze the
      // whole settings page — every section loads independently.
      try {
        const r = await fetch(url)
        const text = await r.text()
        return text.trim() ? JSON.parse(text) : {}
      } catch {
        console.warn(\`Could not load \${url}\`)
        return {}
      }
    }
    const [s, pm, dz, dc, bn] = await Promise.all([
      getJson('/api/admin/settings'),
      getJson('/api/admin/payment-methods'),
      getJson('/api/admin/delivery-zones'),
      getJson('/api/admin/discounts'),
      getJson('/api/admin/banners'),
    ])
    setSettings(s?.settings ?? {})
    setMethods(pm?.methods ?? [])
    setZones(dz?.zones ?? [])
    setDiscounts(dc?.discounts ?? [])
    setBanners(bn?.banners ?? [])
    setLoaded(true)
  }, [])`;
        s = s.replace(re, next);
        fs.writeFileSync(f, s);
        console.log('OK    settings-editor.tsx: safe per-endpoint loader installed');
      }
    }
  } catch (e) { console.log('FAIL  settings-editor.tsx: ' + e.message); fail++; }
}
process.exit(fail ? 1 : 0);
ZAMU_PATCH_CJS
node .zamu-patch.cjs || MISS=$((MISS+1))
rm -f .zamu-patch.cjs

step "3/4 Verifying"
FILES=(
  'src/app/api/admin/settings/route.ts'
  'src/app/api/admin/discounts/route.ts'
  'src/app/api/admin/discounts/[id]/route.ts'
  'src/app/api/admin/banners/route.ts'
  'src/app/api/admin/banners/[id]/route.ts'
  'src/app/api/admin/categories/route.ts'
  'src/app/api/admin/categories/[id]/route.ts'
  'src/app/api/admin/delivery-zones/route.ts'
  'src/app/api/admin/delivery-zones/[id]/route.ts'
  'src/app/api/admin/payment-methods/route.ts'
  'src/app/api/admin/payment-methods/[id]/route.ts'
  'src/app/api/admin/upload/route.ts'
  'src/app/api/media/[...path]/route.ts'
  'src/app/api/files/payments/[file]/route.ts'
  'src/app/api/admin/ensure-media-table/route.ts'
  'src/lib/persist.ts'
  'src/lib/http.ts'
)
for f in "${FILES[@]}"; do
  if [ -s "$f" ]; then echo "PASS  $f"; else echo "FAIL  missing or empty: $f"; MISS=$((MISS+1)); fi
done
chk() { if grep -qF "$2" "$1" 2>/dev/null; then echo "PASS  $1"; else echo "FAIL  fix-marker missing in $1"; MISS=$((MISS+1)); fi; }
chk prisma/schema.prisma "model MediaAsset"
chk src/components/admin/settings-editor.tsx "getJson"
chk src/app/api/admin/upload/route.ts "persistData"
chk "src/app/api/media/[...path]/route.ts" "mediaAsset"
chk src/lib/http.ts "STATUS_HINTS"

step "4/4 Result"
echo
if [ "$MISS" -eq 0 ]; then
  echo "ALL CHECKS PASSED."
  echo
  echo "Now commit and push:"
  echo "  git add -A"
  echo '  git commit -m "Restore admin APIs, media serving, resilient settings loader"'
  echo "  git pull --rebase origin main"
  echo "  git push"
  echo
  echo "After Netlify deploys (~2-3 min), while logged in as admin open:"
  echo "  https://zzamu.netlify.app/api/admin/ensure-media-table"
  echo "Then test: Admin > Settings loads, and product image upload works."
else
  echo "$MISS check(s) FAILED — send the full output above to the assistant."
fi
echo
[ "$MISS" -eq 0 ] || exit 1