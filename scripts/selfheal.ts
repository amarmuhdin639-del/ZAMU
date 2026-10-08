// Self-heal CLI — runs before every `bun run dev` / `bun run start`.
// Heavy lifting lives in src/lib/selfheal-core.ts (also used by the
// 60s instrumentation interval while the server is running).
import { runSelfHeal } from '../src/lib/selfheal-core'

try {
  const actions = runSelfHeal()
  if (actions.length > 0) {
    for (const a of actions) console.log(`[selfheal] ${a}`)
  } else {
    console.log('[selfheal] tree healthy')
  }
} catch (e) {
  console.error('[selfheal] failed:', e)
}
