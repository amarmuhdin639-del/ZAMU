'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { translate, type Lang } from './i18n-dict'

const STORAGE_KEY = 'tibeb.lang'

type LangContextValue = {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  toggle: () => {},
  t: (k, vars) => translate('en', k, vars),
})

/**
 * Provides the active UI language for the storefront.
 * Starts as English (matches the server-rendered output to avoid hydration
 * mismatches), then swaps to the stored preference after mount.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    // read the stored preference in a microtask (avoids sync setState in effect)
    let alive = true
    Promise.resolve().then(() => {
      if (!alive) return
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved === 'am' || saved === 'en') {
          setLangState(saved)
          document.documentElement.lang = saved
        }
      } catch {
        // private mode — keep default
      }
    })
    return () => {
      alive = false
    }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // ignore
    }
    document.documentElement.lang = l === 'am' ? 'am' : 'en'
  }, [])

  const toggle = useCallback(() => {
    setLang(lang === 'en' ? 'am' : 'en')
  }, [lang, setLang])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  )

  return <LangContext.Provider value={{ lang, setLang, toggle, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

/**
 * Translation element usable inside server components — renders the
 * translated string for the current language.
 */
export function T({
  k,
  vars,
  as: Tag = 'span',
  className,
}: {
  k: string
  vars?: Record<string, string | number>
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'strong'
  className?: string
}) {
  const { t } = useLang()
  return <Tag className={className}>{t(k, vars)}</Tag>
}

/** Compact EN / አማ switcher pill used in the header. */
export function LangSwitch({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLang()
  return (
    <div
      className={`flex items-center overflow-hidden rounded-full border ${
        dark ? 'border-cream/30' : 'border-border'
      }`}
      role="group"
      aria-label="Language"
    >
      {(['en', 'am'] as const).map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            lang === code
              ? dark
                ? 'bg-cream text-ink'
                : 'bg-ink text-cream'
              : dark
                ? 'text-cream/60 hover:text-cream'
                : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {code === 'en' ? 'EN' : 'አማ'}
        </button>
      ))}
    </div>
  )
}
