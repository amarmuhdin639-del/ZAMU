import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// Wipe-proof self-heal core. The sandbox snapshot system has repeatedly (5+ times)
// deleted recently-created files mid-session: the admin upload route (3x), the
// download route + page, and reverted .env to a machine-specific absolute path.
//
// Strategy: every critical file also lives as a flat .txt backup under scripts/
// (backups have survived every wipe so far), and this module restores anything
// missing, fixes .env, and regenerates the download package. Runs:
//   - once before every dev/start (scripts/selfheal.ts CLI)
//   - every 60s while the server is alive (src/instrumentation.ts)
// All checks are cheap fs stats; heavy work only happens on actual damage.

const ROOT = process.cwd()

const PORTABLE_ENV = 'DATABASE_URL=file:../db/custom.db\n'

interface HealTarget {
  target: string
  backup: string
  label: string
}

const FILES: HealTarget[] = [
  {
    target: 'src/app/api/admin/upload/route.ts',
    backup: 'scripts/backup-upload-route.ts.txt',
    label: 'admin upload route',
  },
  {
    target: 'src/app/api/download/store/route.ts',
    backup: 'scripts/backups/download-route.ts.txt',
    label: 'download route',
  },
  {
    target: 'src/app/(storefront)/download/page.tsx',
    backup: 'scripts/backups/download-page.tsx.txt',
    label: 'download page',
  },
  {
    target: 'src/lib/download-volumes.ts',
    backup: 'scripts/backups/download-volumes.ts.txt',
    label: 'volume splitter lib',
  },
]

export function runSelfHeal(): string[] {
  const actions: string[] = []

  // 1. restore missing critical files from flat backups
  for (const f of FILES) {
    try {
      const t = path.join(ROOT, f.target)
      const b = path.join(ROOT, f.backup)
      if (!fs.existsSync(t) && fs.existsSync(b)) {
        fs.mkdirSync(path.dirname(t), { recursive: true })
        fs.copyFileSync(b, t)
        actions.push(`restored ${f.label}`)
      }
    } catch {
      /* next check will retry */
    }
  }

  // 2. .env must exist and stay portable (absolute sandbox path breaks PC installs)
  try {
    const envPath = path.join(ROOT, '.env')
    const needsFix =
      !fs.existsSync(envPath) ||
      !fs.readFileSync(envPath, 'utf8').includes('file:../db/custom.db')
    if (needsFix) {
      fs.writeFileSync(envPath, PORTABLE_ENV)
      actions.push('rewrote .env to portable DATABASE_URL')
    }
  } catch {
    /* ignore */
  }

  // 3. regenerate the download package if it vanished
  try {
    const zip = path.join(ROOT, 'public', 'tibeb-store.zip')
    if (!fs.existsSync(zip) || fs.statSync(zip).size < 1_000_000) {
      fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true })
      execSync('git archive --prefix="zamu-store/" --format=zip -o public/tibeb-store.zip HEAD', {
        cwd: ROOT,
        stdio: 'pipe',
        timeout: 60_000,
      })
      if (fs.existsSync(zip)) actions.push('regenerated public/tibeb-store.zip from git HEAD')
    }
  } catch {
    /* ignore */
  }

  return actions
}
