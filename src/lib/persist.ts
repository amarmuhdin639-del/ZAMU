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
