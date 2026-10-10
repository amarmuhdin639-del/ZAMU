'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useLang } from '@/lib/i18n'
import { toast } from 'sonner'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'tibeb.pwa.dismissed'
const INSTALLED_KEY = 'tibeb.pwa.installed'

let deferredPrompt: InstallPromptEvent | null = null
const listeners = new Set<(v: InstallPromptEvent | null) => void>()

function setPrompt(e: InstallPromptEvent | null) {
  deferredPrompt = e
  listeners.forEach((fn) => fn(e))
}

/**
 * Registers the service worker (offline shell for weak networks) and
 * captures the browser install prompt for the banner / footer button.
 */
export function PWARegister({ siteName }: { siteName: string }) {
  const [installable, setInstallable] = useState<InstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // service worker — register immediately if the page already finished loading
    if ('serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register, { once: true })
    }
    // install prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
    }
    const onInstalled = () => {
      setPrompt(null)
      try {
        window.localStorage.setItem(INSTALLED_KEY, '1')
      } catch {}
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    const listener = (e: InstallPromptEvent | null) => setInstallable(e)
    listeners.add(listener)
    Promise.resolve().then(() => {
      if (deferredPrompt) setInstallable(deferredPrompt)
    })

    let dismissed = false
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === '1' || window.localStorage.getItem(INSTALLED_KEY) === '1'
    } catch {}
    if (deferredPrompt && !dismissed) {
      const timer = setTimeout(() => setShowBanner(true), 4000)
      return () => {
        clearTimeout(timer)
        listeners.delete(listener)
      }
    }
    return () => listeners.delete(listener)
  }, [])

  async function install() {
    if (!installable) return
    await installable.prompt()
    const choice = await installable.userChoice
    if (choice.outcome === 'accepted') toast.success(`${siteName} app installed`)
    setPrompt(null)
    setShowBanner(false)
  }

  function dismiss() {
    setShowBanner(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
  }

  if (!showBanner || !installable) return null

  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-2xl md:bottom-6 md:left-6 md:translate-x-0">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <p className="flex items-center gap-2 text-sm font-bold">
        <Download className="h-4 w-4 text-flame" /> <PWAInstallTitle siteName={siteName} />
      </p>
      <p className="mt-1 pr-4 text-xs leading-relaxed text-muted-foreground"><PWAInstallText /></p>
      <div className="mt-3 flex gap-2">
        <button onClick={install} className="flex-1 rounded-full bg-ink py-2.5 text-[11px] font-bold uppercase tracking-wider text-cream hover:bg-flame">
          <PWAInstallBtn />
        </button>
        <button onClick={dismiss} className="flex-1 rounded-full border border-border py-2.5 text-[11px] font-bold uppercase tracking-wider">
          <PWALaterBtn />
        </button>
      </div>
    </div>
  )
}

function PWAInstallTitle({ siteName }: { siteName: string }) {
  const { t } = useLang()
  return <>{t('pwa.installTitle', { site: siteName })}</>
}
function PWAInstallText() {
  const { t } = useLang()
  return <>{t('pwa.installText')}</>
}
function PWAInstallBtn() {
  const { t } = useLang()
  return <>{t('pwa.install')}</>
}
function PWALaterBtn() {
  const { t } = useLang()
  return <>{t('pwa.later')}</>
}

/** Footer "Install App" button — hidden until the browser allows install. */
export function PWAInstallButton() {
  const { t } = useLang()
  const [installable, setInstallable] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const listener = (e: InstallPromptEvent | null) => setInstallable(e)
    listeners.add(listener)
    Promise.resolve().then(() => {
      if (deferredPrompt) setInstallable(deferredPrompt)
    })
    let installed = false
    try {
      installed = window.localStorage.getItem(INSTALLED_KEY) === '1'
    } catch {}
    if (installed) return
    if (!('serviceWorker' in navigator)) return
    return () => listeners.delete(listener)
  }, [])

  if (!installable) return null

  async function install() {
    if (!installable) return
    await installable.prompt()
    await installable.userChoice
    setPrompt(null)
  }

  return (
    <button
      onClick={install}
      className="mt-5 inline-flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-cream/80 transition-colors hover:border-flame hover:text-flame"
    >
      <Download className="h-3.5 w-3.5" /> {t('footer.installApp')}
    </button>
  )
}
