// Mid-run self-heal: the sandbox snapshot system wipes recently-created files
// while the server is running (routes then 404 until the next restart).
// This runs the same heal logic as scripts/selfheal.ts every 60 seconds so
// damage is repaired within a minute, without anyone restarting anything.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const { runSelfHeal } = await import('./lib/selfheal-core')
    const heal = () => {
      try {
        const actions = runSelfHeal()
        if (actions.length > 0) console.log('[selfheal] auto-fixed:', actions.join('; '))
      } catch {
        /* never crash the server from here */
      }
    }
    heal()
    const timer = setInterval(heal, 60_000)
    // don't hold the process open on shutdown
    if (typeof timer.unref === 'function') timer.unref()
  } catch {
    /* never crash the server from here */
  }
}
