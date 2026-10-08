// One-time migration: make uploaded media durable.
// 1) Import every file under public/uploads/** into the MediaAsset table.
// 2) Rewrite DB-stored URLs from /uploads/<path> to /api/media/<path>
//    (product images, category/banner images, key-value settings).
// Idempotent: safe to run repeatedly.
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const db = new PrismaClient()
const ROOT = process.cwd()
const UPLOADS = path.join(ROOT, 'public', 'uploads')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
}

async function importDiskFiles() {
  let added = 0
  if (!fs.existsSync(UPLOADS)) return
  const files: { rel: string; abs: string }[] = []
  const collect = (dir: string, rel: string) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name)
      const r = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) collect(abs, r)
      else files.push({ rel: r, abs })
    }
  }
  collect(UPLOADS, '')
  for (const { rel, abs } of files) {
    const exists = await db.mediaAsset.findUnique({ where: { path: rel } })
    if (exists) continue
    const buf = fs.readFileSync(abs)
    const mime = MIME[path.extname(rel).toLowerCase()] ?? 'application/octet-stream'
    await db.mediaAsset.upsert({
      where: { path: rel },
      update: {},
      create: { path: rel, data: new Uint8Array(buf), mime, size: buf.length },
    })
    added++
  }
  console.log(`imported ${added} disk file(s) into MediaAsset`)
}

function toApiMedia(u: string): string {
  return u.replace(/^\/uploads\//, '/api/media/')
}

async function rewriteUrls() {
  // product images
  const imgs = await db.productImage.findMany({ where: { url: { startsWith: '/uploads/' } } })
  for (const i of imgs) {
    await db.productImage.update({ where: { id: i.id }, data: { url: toApiMedia(i.url) } })
  }
  console.log(`rewrote ${imgs.length} product image url(s)`)

  // categories
  const cats = await db.category.findMany({ where: { image: { startsWith: '/uploads/' } } })
  for (const c of cats) {
    await db.category.update({ where: { id: c.id }, data: { image: toApiMedia(c.image!) } })
  }
  if (cats.length) console.log(`rewrote ${cats.length} category image url(s)`)

  // banners
  const banners = await db.banner.findMany({ where: { image: { startsWith: '/uploads/' } } })
  for (const b of banners) {
    await db.banner.update({ where: { id: b.id }, data: { image: toApiMedia(b.image!) } })
  }
  if (banners.length) console.log(`rewrote ${banners.length} banner image url(s)`)

  // payment methods (logo)
  const pms = await db.paymentMethod.findMany({ where: { logo: { startsWith: '/uploads/' } } })
  for (const m of pms) {
    await db.paymentMethod.update({ where: { id: m.id }, data: { logo: toApiMedia(m.logo!) } })
  }
  if (pms.length) console.log(`rewrote ${pms.length} payment method logo url(s)`)

  // key-value settings (hero media etc.)
  const settings = await db.storeSetting.findMany()
  let n = 0
  for (const s of settings) {
    if (s.value.includes('/uploads/')) {
      await db.storeSetting.update({ where: { key: s.key }, data: { value: toApiMedia(s.value) } })
      n++
    }
  }
  if (n) console.log(`rewrote ${n} setting value(s)`)
}

async function main() {
  await importDiskFiles()
  await rewriteUrls()
  const total = await db.mediaAsset.count()
  console.log(`MediaAsset total: ${total}`)
}

main().finally(() => db.$disconnect())
