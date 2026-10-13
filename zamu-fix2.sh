#!/usr/bin/env bash
# ============================================================================
#  ZAMU FIX 2 - repairs the build that Netlify could not finish
#
#  What went wrong on your last deploy:
#    - src/components/store/pwa.tsx got corrupted (bad bytes inside), so the
#      compiler refused to read it
#    - the map files were in the repo but the 'leaflet' library was missing
#      from package.json
#  What this script does:
#    1. Puts back the last-good pwa.tsx (the exact file that was live before)
#    2. Adds leaflet (+ its type definitions) to package.json
#    3. Finishes the ADMIN side of the map: the order page in /admin shows a
#       mini map of the customer's pinned delivery spot
#    4. Adds any missing translation words (English + Amharic)
#  Then it commits and pushes - Netlify deploys by itself.
#
#  PLAIN READABLE CODE - no base64, nothing hidden. Safe to run again.
#  HOW TO USE: from the repo root (the folder with package.json):
#        bash zamu-fix2.sh
# ============================================================================
[ -f package.json ] || { echo "Run this from the repo root (the folder that has package.json)."; exit 1; }

FAIL=0
step() { echo ""; echo "== $1 =="; }
chk() { grep -q "$2" "$1" 2>/dev/null && echo "PASS  $2" || { echo "FAIL  '$2' not found in $1"; FAIL=1; } }

step "1/4 Repair the corrupted pwa.tsx (restore the exact file that was live before)"
F=src/components/store/pwa.tsx
if [ -s "$F" ] && iconv -f utf-8 -t utf-8 "$F" >/dev/null 2>&1 && grep -q "export function PWARegister" "$F"; then
  echo "SKIP  pwa.tsx already healthy"
else
  mkdir -p src/components/store
  cat > "$F" <<'ZAMU_PWA'
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
ZAMU_PWA
  if iconv -f utf-8 -t utf-8 "$F" >/dev/null 2>&1 && grep -q "export function PWARegister" "$F"; then
    echo "OK    pwa.tsx repaired (clean, readable file restored)"
  else
    echo "FAIL  pwa.tsx still not healthy after repair"; FAIL=1
  fi
fi

step "2/4 Add the missing leaflet library to package.json"
if grep -q '"leaflet"' package.json; then
  echo "SKIP  leaflet already in package.json"
else
  if command -v bun >/dev/null 2>&1; then
    bun add leaflet@1.9.4 >/dev/null 2>&1; bun add -d @types/leaflet@1.9.20 >/dev/null 2>&1
  fi
  if ! grep -q '"leaflet"' package.json && command -v npm >/dev/null 2>&1; then
    npm install --save leaflet@1.9.4 >/dev/null 2>&1; npm install --save-dev @types/leaflet@1.9.20 >/dev/null 2>&1
  fi
  if ! grep -q '"leaflet"' package.json && command -v node >/dev/null 2>&1; then
    node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.dependencies=p.dependencies||{};p.dependencies.leaflet='^1.9.4';p.devDependencies=p.devDependencies||{};p.devDependencies['@types/leaflet']='^1.9.20';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
  fi
  grep -q '"leaflet"' package.json && echo "OK    leaflet added to package.json"     || { echo "FAIL  could not add leaflet to package.json"; FAIL=1; }
fi
[ -d node_modules/leaflet ] && echo "PASS  leaflet installed locally"   || echo "...   not installed locally yet (Netlify installs it during deploy - that is fine)"

step "3/4 ADMIN side - delivery map on the order page (finishes the map feature)"
mkdir -p src/components/admin
F=src/components/admin/order-detail.tsx
if [ ! -s "$F" ]; then
  echo "FAIL  $F not found - this repo is not the expected version"; FAIL=1
elif grep -q "function PinnedLocation" "$F"; then
  echo "SKIP  admin map already added"
else
  cat >> "$F" <<'ZAMU_FILE_3'

/** Extract "Pin: 9.012345, 38.760000" from a checkout address (map pin flow). */
function parsePin(address: string): { lat: number; lng: number } | null {
  const m = /Pin:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(address || '')
  if (!m) return null
  const lat = parseFloat(m[1])
  const lng = parseFloat(m[2])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lat, lng }
}

/** Mini OpenStreetMap embed + open-in-maps links for the customer's pinned spot. */
function PinnedLocation({ address }: { address: string }) {
  const { t } = useLang()
  const pin = parsePin(address)
  if (!pin) return null
  const { lat, lng } = pin
  const d = 0.004
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`
  return (
    <div className="mt-3">
      <iframe
        title="Customer delivery pin"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}
        className="h-44 w-full rounded-xl border border-border"
        loading="lazy"
      />
      <div className="mt-2 flex gap-2">
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-full border border-border py-2 text-center text-[11px] font-bold uppercase tracking-wider hover:border-flame"
        >
          {t('admin.ord.openMap')}
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(`${lat}, ${lng}`)
            toast.success(t('admin.ord.coordsCopied'))
          }}
          className="flex-1 rounded-full border border-border py-2 text-center text-[11px] font-bold uppercase tracking-wider hover:border-flame"
        >
          {t('admin.ord.copyCoords')}
        </button>
      </div>
    </div>
  )
}
ZAMU_FILE_3
  awk '
    !done && index($0, "{order.city}") > 0 && index($0, "{order.address}") > 0 {
      print
      print "              <PinnedLocation address={order.address} />"
      done = 1
      next
    }
    { print }
  ' "$F" > .zamu-od.tmp && mv .zamu-od.tmp "$F"
  grep -q "PinnedLocation address" "$F"     && echo "OK    admin order page now shows the customer's pin on a map"     || { echo "FAIL  could not insert the map into order-detail.tsx"; FAIL=1; }
fi

step "4/4 Missing map words in both languages (only the ones actually missing)"
add_key() {
  if ! grep -qF "$1" src/lib/i18n-dict.ts; then
    printf '%s\n' "$2" >> .zamu-dict-add.tmp
  fi
}
[ -f .zamu-dict-add.tmp ] && rm -f .zamu-dict-add.tmp
add_key 'checkout.pinTitle' "  'checkout.pinTitle': { en: 'Pin your location on the map', am: 'አድራሻዎን በካርታው ላይ ይምረጡ' },"
add_key 'checkout.pinHint' "  'checkout.pinHint': { en: 'Tap the map where the rider should deliver - or use your current location. No need to type your address.', am: 'መኪናው እንዲያቆምበት የሚፈልጉበትን ቦታ በካርታው ላይ ይንኩ - ወይም የአሁኑን ቦታዎን ይጠቀሙ። አድራሻ መጻፍ አያስፈልግም።' },"
add_key 'checkout.useMyLocation' "  'checkout.useMyLocation': { en: 'Use my location', am: 'የአሁኑን ቦታዎን ይጠቀሙ' },"
add_key 'checkout.locating' "  'checkout.locating': { en: 'Finding you...', am: 'በመፈለግ ላይ…' },"
add_key 'checkout.pinSet' "  'checkout.pinSet': { en: 'Location pinned', am: 'ቦታው ተምርጫል' },"
add_key 'checkout.pinRequired' "  'checkout.pinRequired': { en: 'Please pin your delivery location on the map', am: 'እባክዎ የማድረስ ቦታዎን በካርታው ላይ ይምረጡ' },"
add_key 'checkout.addressNote' "  'checkout.addressNote': { en: 'House / landmark note (optional)', am: 'የቤት ቁጥር / ምልክት ማስታወሻ (አማራጭ)' },"
add_key 'admin.ord.openMap' "  'admin.ord.openMap': { en: 'Open in Google Maps', am: 'በGoogle Maps ክፈት' },"
add_key 'admin.ord.copyCoords' "  'admin.ord.copyCoords': { en: 'Copy coordinates', am: 'ኮርዲኔቶች ቅዳ' },"
add_key 'admin.ord.coordsCopied' "  'admin.ord.coordsCopied': { en: 'Coordinates copied', am: 'ኮርዲኔቶች ተቀድተዋል' }"
if [ -s .zamu-dict-add.tmp ]; then
  N=$(grep -n '^}$' src/lib/i18n-dict.ts | head -1 | cut -d: -f1)
  if [ -n "$N" ]; then
    head -n $((N - 1)) src/lib/i18n-dict.ts > .zamu-dict.tmp
    cat .zamu-dict-add.tmp >> .zamu-dict.tmp
    tail -n "+$N" src/lib/i18n-dict.ts >> .zamu-dict.tmp
    mv .zamu-dict.tmp src/lib/i18n-dict.ts
    echo "OK    $(grep -c . .zamu-dict-add.tmp) missing phrase(s) added"
  else
    echo "FAIL  could not find the end of the dictionary"; FAIL=1
  fi
else
  echo "SKIP  all map words already present"
fi
rm -f .zamu-dict-add.tmp

step "Checks"
iconv -f utf-8 -t utf-8 src/components/store/pwa.tsx >/dev/null 2>&1 && echo "PASS  pwa.tsx is a clean readable file" || { echo "FAIL  pwa.tsx still contains bad bytes"; FAIL=1; }
chk src/components/store/pwa.tsx "export function PWARegister"
chk package.json "leaflet"
chk src/components/store/location-picker.tsx "openstreetmap.org"
chk src/components/store/checkout-form.tsx "LocationPicker"
grep -Fq "Pin: " src/components/store/checkout-form.tsx && echo "PASS  checkout saves the pin coordinates" || { echo "FAIL  pin coordinates missing from checkout"; FAIL=1; }
chk src/components/admin/order-detail.tsx "PinnedLocation"
chk src/components/admin/order-detail.tsx "parsePin"
for K in 'checkout.pinTitle' 'checkout.pinHint' 'checkout.useMyLocation' 'checkout.locating' 'checkout.pinSet' 'checkout.pinRequired' 'checkout.addressNote' 'admin.ord.openMap' 'admin.ord.copyCoords' 'admin.ord.coordsCopied'; do
  grep -qF "$K" src/lib/i18n-dict.ts && echo "PASS  $K" || { echo "FAIL  $K missing from dictionary"; FAIL=1; }
done

step "Result"
if [ "$FAIL" -ne 0 ]; then
  echo "$FAIL check(s) FAILED - copy every line above that starts with FAIL and send them back."
  exit 1
fi
echo "ALL CHECKS PASSED"

step "Publishing to GitHub (Netlify deploys automatically)"
if [ "${ZAMU_NO_PUSH:-0}" = "1" ]; then
  echo "SKIP  publish (ZAMU_NO_PUSH is set - testing mode)"
else
  git add -A
  if git diff --cached --quiet; then
    echo "...   nothing new to commit (it may already be committed from an earlier run)"
  elif git commit -m "ZAMU: repair corrupted pwa.tsx, add leaflet, finish admin delivery map" >/dev/null 2>&1; then
    echo "OK    committed"
  else
    echo "FAIL  git commit failed - git needs your name and email once. Run:"
    echo '        git config --global user.email "you@example.com"'
    echo '        git config --global user.name "Your Name"'
    echo "      then run this script again."
    exit 1
  fi
  pushout=$(git push origin main 2>&1)
  if [ $? -eq 0 ]; then
    echo "$pushout" | tail -2
    echo "OK    pushed - wait ~2 minutes for Netlify to finish deploying"
  else
    echo "$pushout" | tail -4
    echo "...   push rejected - pulling remote changes and retrying"
    git pull --rebase origin main >/dev/null 2>&1
    pushout=$(git push origin main 2>&1)
    if [ $? -eq 0 ]; then
      echo "$pushout" | tail -2
      echo "OK    pushed after rebase - wait ~2 minutes for Netlify"
    else
      echo "$pushout" | tail -4
      echo "FAIL  automatic push did not go through. Run these two commands:"
      echo "        git pull --no-rebase -X ours origin main"
      echo "        git push origin main"
      exit 1
    fi
  fi
fi

echo ""
echo "Done. After Netlify deploys (~2 min) the build error is gone, homepage"
echo "images keep working, the checkout map is live, and the order page in"
echo "/admin/orders shows the customer's delivery pin on a mini map."
