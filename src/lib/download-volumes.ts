import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

// Splits the committed tree into a few SMALL, SELF-CONTAINED zip volumes.
// Each volume is a valid zip on its own (built with `git archive`), so the
// owner can extract every part into the SAME folder — the zamu-store/ folder
// merges automatically. No command line needed, unlike byte-sliced parts.
//
// Why: the preview proxy drops large single responses (the 14 MB zip caused
// the owner's 404 loop), so the package must also be available in pieces of
// roughly a megabyte.

export const VOLUME_TARGET_BYTES = 1.2 * 1024 * 1024 // uncompressed budget per volume

// QA artifacts and generated files that must never ship inside a volume.
const EXCLUDE: RegExp[] = [
  /^public\/tibeb-store\.zip$/,
  /^public\/download\//,
  /^db\/.+\.(db-journal|db-wal|db-shm)$/,
  /^scripts\/[^/]+\.png$/, // assistant QA screenshots — not needed to run the store
]

export interface Volume {
  n: number
  files: number
  bytes: number // uncompressed total (zip will be <= this)
  label: string
  paths: string[]
}

export interface VolumePlan {
  volumes: Volume[]
  totalFiles: number
  totalBytes: number
}

function kindOf(p: string): string {
  if (/^(src|prisma)\//.test(p) || !p.includes('/')) return 'code & docs'
  if (p.startsWith('db/')) return 'database'
  if (p.startsWith('public/uploads/')) return 'product photos'
  if (p.startsWith('uploads/')) return 'payment proofs'
  if (p.startsWith('public/fonts/')) return 'fonts'
  if (p.startsWith('public/')) return 'site images'
  if (p.startsWith('scripts/')) return 'tools'
  return 'project files'
}

function labelFor(paths: string[]): string {
  const kinds: string[] = []
  for (const p of paths) {
    const k = kindOf(p)
    if (!kinds.includes(k)) kinds.push(k)
  }
  return kinds.slice(0, 3).join(' + ')
}

interface TreeEntry {
  path: string
  size: number
}

function readTree(): TreeEntry[] | null {
  try {
    const out = execSync('git ls-tree -r -l HEAD', {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 32 * 1024 * 1024,
    })
    const entries: TreeEntry[] = []
    for (const line of out.split('\n')) {
      // 100644 blob <hash>   <size>\t<path>
      const m = line.match(/^\d+ blob [0-9a-f]+\s+(\d+)\t(.+)$/)
      if (!m) continue
      const p = m[2]
      if (EXCLUDE.some((re) => re.test(p))) continue
      entries.push({ path: p, size: Number(m[1]) || 0 })
    }
    return entries.length > 0 ? entries : null
  } catch {
    return null
  }
}

// Deterministic sequential bin-packing in git's stable path order.
export function computeVolumes(): VolumePlan | null {
  const entries = readTree()
  if (!entries) return null

  const volumes: Volume[] = []
  let cur: Volume = { n: 1, files: 0, bytes: 0, label: '', paths: [] }
  const flush = () => {
    if (cur.files === 0) return
    cur.label = labelFor(cur.paths)
    volumes.push(cur)
    cur = { n: volumes.length + 1, files: 0, bytes: 0, label: '', paths: [] }
  }
  for (const e of entries) {
    if (cur.files > 0 && cur.bytes + e.size > VOLUME_TARGET_BYTES) flush()
    cur.paths.push(e.path)
    cur.files += 1
    cur.bytes += e.size
  }
  flush()

  return {
    volumes,
    totalFiles: entries.length,
    totalBytes: entries.reduce((s, e) => s + e.size, 0),
  }
}

// Builds volume N as a standalone zip (cached in the OS temp dir per HEAD).
export function buildVolumeZip(vol: Volume): string | null {
  try {
    const head = execSync('git rev-parse --short HEAD', {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 15_000,
    }).trim()
    const file = path.join(os.tmpdir(), `zamu-vol-${vol.n}-${head}.zip`)
    if (fs.existsSync(file) && fs.statSync(file).size > 500) return file
    // drop stale caches from older HEADs (best effort)
    try {
      for (const f of fs.readdirSync(os.tmpdir())) {
        if (f.startsWith('zamu-vol-') && !f.endsWith(`-${head}.zip`)) {
          try {
            fs.unlinkSync(path.join(os.tmpdir(), f))
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
    const quoted = vol.paths.map((p) => `"${p}"`).join(' ')
    execSync(`git archive --prefix="zamu-store/" --format=zip -o "${file}" HEAD -- ${quoted}`, {
      cwd: process.cwd(),
      timeout: 60_000,
      stdio: 'pipe',
    })
    return fs.existsSync(file) ? file : null
  } catch (e) {
    console.error('buildVolumeZip failed', e)
    return null
  }
}
