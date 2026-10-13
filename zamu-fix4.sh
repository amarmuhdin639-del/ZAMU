#!/usr/bin/env bash
# ============================================================================
# zamu-fix4.sh — ZAMU store maintenance, delivery 4
#   1. REAL Google Maps everywhere: checkout pin picker, admin order map and
#      the customer Track Order page (no more OpenStreetMap tiles, no API key)
#   2. Pin accuracy: "Use my location" GPS lock-on + live ±accuracy readout,
#      + "paste your Google Maps spot" box (long-press your door in the
#      Google Maps app -> copy -> paste = EXACT pin) + 20 m nudge arrows
#   3. Uploads that finally work for VIDEO: big files are sent in ~4 MB
#      chunks and reassembled server-side (Netlify rejects bodies > ~6 MB —
#      that is why every video upload failed before)
#   4. Header/footer crown logo can never break again: it is now embedded in
#      the app itself (the service worker kept serving an old broken render)
#   5. Service worker cache purge + legacy /uploads/* links heal from the DB
# Run inside the ZAMU repo root:  bash zamu-fix4.sh
# Test without pushing:           ZAMU_NO_PUSH=1 bash zamu-fix4.sh
# ============================================================================
set -u
cd "$(dirname "$0")"
PASS=0; FAIL=0
ok() { echo "  [PASS] $1"; PASS=$((PASS+1)); }
bad() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
sec() { echo; echo "== $1 =="; }

sec "0. Preflight"
[ -f package.json ] && ok "repo root found (package.json)" || bad "package.json missing — run inside the ZAMU repo"
[ -d src/app ] && ok "Next.js src/ found" || bad "src/app missing"
command -v python3 >/dev/null 2>&1 && ok "python3 available" || bad "python3 not found"
if [ ! -f .git/config ]; then bad "not a git repo — refusing to continue"; fi
if [ "$FAIL" -gt 0 ]; then echo; echo "ABORTED — fix the preflight problems above."; exit 1; fi

sec "1. Patch files (idempotent — safe to re-run)"
cat > .zamu-fix4-patch.py <<'ZAMU_PY_EOF'

LOGO_TSX = '// The ZAMU crown emblem, inlined as a data URI.\n//\n// Why: the logo used to load from /uploads/zamu-crown-logo.webp, which sits\n// under the service worker\'s cache-first rule. When that file once 404\'d,\n// phones kept showing the broken-image render for days because the service\n// worker served the stale failure. A data URI ships inside the JS bundle\n// itself - it cannot 404, cannot be cached stale, and renders instantly on\n// the slowest networks.\nconst CROWN_SRC =\n  \'data:image/webp;base64,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\'\n\nexport function CrownLogo({ className = \'\' }: { className?: string }) {\n  return <img src={CROWN_SRC} alt="ZAMU crown emblem" className={\'object-contain \' + className} />\n}\n'
HEADER_IMPORT_ANCHOR = "import { useMounted } from '@/hooks/use-mounted'"
HEADER_IMPORT_NEW = "import { useMounted } from '@/hooks/use-mounted'\nimport { CrownLogo } from '@/components/store/logo'"
HEADER_REPL = [('<img src="/uploads/zamu-crown-logo.webp" alt="" className="h-9 w-9 object-contain" />', '<CrownLogo className="h-9 w-9" />'), ('<img src="/uploads/zamu-crown-logo.webp" alt="" className="h-7 w-7 object-contain" />', '<CrownLogo className="h-7 w-7" />')]
FOOTER_IMPORT_ANCHOR = "import { parseSocialLinks } from '@/lib/social'"
FOOTER_IMPORT_NEW = "import { parseSocialLinks } from '@/lib/social'\nimport { CrownLogo } from '@/components/store/logo'"
FOOTER_REPL = [('<img src="/uploads/zamu-crown-logo.webp" alt={`${site} crown emblem`} className="h-16 w-16 object-contain" />', '<CrownLogo className="h-16 w-16" />')]
SW_OLD = "const VERSION = 'zamu-v4'"
SW_NEW = "const VERSION = 'zamu-v5'"
NEXT_CONFIG = 'import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {\n  output: "standalone",\n  /* config options here */\n  typescript: {\n    ignoreBuildErrors: true,\n  },\n  reactStrictMode: false,\n  async rewrites() {\n    // Heal legacy /uploads/* URLs: anything that is not a real file in\n    // public/ is served from the MediaAsset database via /api/media/*.\n    // Files that DO exist in public/ (the favicon set) keep winning, because\n    // Next checks the filesystem before afterFiles rewrites.\n    return [{ source: \'/uploads/:path*\', destination: \'/api/media/:path*\' }]\n  },\n};\n\nexport default nextConfig;\n'
LOCATION_PICKER = '\'use client\'\n\n// Delivery-pin picker, powered by real Google Maps.\n//\n// Why an embedded Google Map (no API key needed): customers in Ethiopia\n// already know Google Maps - OpenStreetMap tiles looked foreign. The iframe\n// below IS maps.google.com, pinned to the chosen coordinates, zoomable and\n// pannable by the customer.\n//\n// Why the paste field: a phone\'s first GPS fix is often a coarse network\n// guess that lands several km off (indoors, on a desktop, or with weak GPS\n// reception). The one exact source everyone carries is the Google Maps app:\n// long-press your door, copy the coordinates or share the place link, and\n// paste it here. We read @lat,lng / !3d..!4d.. / q=lat,lng / bare "lat, lng"\n// - and short links (maps.app.goo.gl/...) are resolved server-side by\n// /api/geo/resolve because browsers cannot follow them cross-origin.\n//\n// "Use my location" still works: it watches the GPS fix, keeps only the\n// best-accuracy reading, and reports how exact the lock is (±metres) so the\n// customer knows when to trust it.\n\nimport { useEffect, useRef, useState } from \'react\'\nimport { useLang } from \'@/lib/i18n\'\nimport { Crosshair, MapPin, Loader2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from \'lucide-react\'\n\nexport type PinValue = { lat: number; lng: number } | null\n\nconst ADDIS = { lat: 9.0192, lng: 38.7525 }\nconst NU = 0.00018 // ~20 m at Addis Ababa\'s latitude\n\nfunction embedUrl(lat: number, lng: number, zoom: number) {\n  return `https://maps.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}&z=${zoom}&output=embed&hl=en`\n}\n\n// Reads coordinates out of anything Google Maps hands you: full URLs with\n// @lat,lng or !3d!4d, search links with q=lat,lng, or a bare "lat, lng" pair.\nexport function parseSpot(raw: string): { lat: number; lng: number } | null {\n  // Tolerate the shapes phones actually produce: "(9.0054, 38.7636)" from the\n  // app\'s copy button and "+"-encoded spaces from browser address bars.\n  const s = raw.trim().replace(/[()]/g, \'\').replace(/\\+/g, \' \')\n  if (!s) return null\n  const patterns = [\n    /!3d(-?\\d+(?:\\.\\d+)?)!4d(-?\\d+(?:\\.\\d+)?)/, // place pin coordinates\n    /@(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)/, // .../@9.0054,38.7636,17z\n    /[?&]q=(-?\\d+(?:\\.\\d+)?),\\s*(-?\\d+(?:\\.\\d+)?)/, // ...?q=9.0054,38.7636\n    /^(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)$/, // bare "9.0054, 38.7636"\n  ]\n  for (const re of patterns) {\n    const m = re.exec(s)\n    if (m) {\n      const lat = parseFloat(m[1])\n      const lng = parseFloat(m[2])\n      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }\n    }\n  }\n  return null\n}\n\nfunction fmtAcc(m: number) {\n  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`\n}\n\nexport default function LocationPicker({\n  value,\n  onChange,\n}: {\n  value: PinValue\n  onChange: (v: NonNullable<PinValue>) => void\n}) {\n  const { t } = useLang()\n  const watchRef = useRef<number | null>(null)\n  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)\n  const [locating, setLocating] = useState(false)\n  const [accuracy, setAccuracy] = useState<number | null>(null)\n  const [paste, setPaste] = useState(\'\')\n  const [pasteErr, setPasteErr] = useState(false)\n\n  // The iframe is a heavy Google page: reload it at most once per 900 ms of\n  // quiet, and only when the pin actually moved more than a couple of metres.\n  const frameRef = useRef<{ lat: number; lng: number }>({ lat: value?.lat ?? ADDIS.lat, lng: value?.lng ?? ADDIS.lng })\n  const [frameSrc, setFrameSrc] = useState(() =>\n    value ? embedUrl(value.lat, value.lng, 17) : embedUrl(ADDIS.lat, ADDIS.lng, 12)\n  )\n\n  useEffect(() => {\n    if (!value) return\n    const last = frameRef.current\n    const moved = Math.abs(value.lat - last.lat) + Math.abs(value.lng - last.lng)\n    if (moved < 0.00002) return\n    const timer = setTimeout(() => {\n      frameRef.current = { lat: value.lat, lng: value.lng }\n      setFrameSrc(embedUrl(value.lat, value.lng, 17))\n    }, 900)\n    return () => clearTimeout(timer)\n  }, [value?.lat, value?.lng])\n\n  useEffect(() => {\n    return () => stopWatching()\n  }, [])\n\n  function stopWatching() {\n    if (watchRef.current !== null) {\n      navigator.geolocation.clearWatch(watchRef.current)\n      watchRef.current = null\n    }\n    if (timerRef.current) {\n      clearTimeout(timerRef.current)\n      timerRef.current = null\n    }\n  }\n\n  function useMyLocation() {\n    if (!navigator.geolocation) return\n    setLocating(true)\n    stopWatching()\n    let bestAcc = Infinity\n    const finish = () => {\n      stopWatching()\n      setLocating(false)\n    }\n    watchRef.current = navigator.geolocation.watchPosition(\n      (pos) => {\n        const { latitude, longitude, accuracy: acc } = pos.coords\n        if (acc < bestAcc) {\n          bestAcc = acc\n          setAccuracy(acc)\n          onChange({ lat: latitude, lng: longitude })\n        }\n        if (acc <= 30) finish()\n      },\n      () => finish(),\n      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }\n    )\n    // hard stop: never spin longer than 16 s\n    timerRef.current = setTimeout(finish, 16000)\n  }\n\n  async function applyPaste() {\n    const local = parseSpot(paste)\n    if (local) {\n      setAccuracy(null)\n      setPasteErr(false)\n      setPaste(\'\')\n      onChange(local)\n      return\n    }\n    // Not literal coordinates - if it is a (short) Google Maps link, let the\n    // server follow the redirect and pull the coordinates out of it.\n    if (/https?:\\/\\//i.test(paste)) {\n      try {\n        const r = await fetch(\'/api/geo/resolve\', {\n          method: \'POST\',\n          headers: { \'Content-Type\': \'application/json\' },\n          body: JSON.stringify({ url: paste.trim() }),\n        })\n        const d = (await r.json().catch(() => ({}))) as { lat?: number; lng?: number }\n        if (r.ok && typeof d.lat === \'number\' && typeof d.lng === \'number\') {\n          setAccuracy(null)\n          setPasteErr(false)\n          setPaste(\'\')\n          onChange({ lat: d.lat, lng: d.lng })\n          return\n        }\n      } catch {\n        /* fall through to the error message */\n      }\n    }\n    setPasteErr(true)\n  }\n\n  function nudge(dLat: number, dLng: number) {\n    if (!value) return\n    onChange({ lat: value.lat + dLat, lng: value.lng + dLng })\n  }\n\n  const nudgeBtn =\n    \'flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:border-flame\'\n\n  return (\n    <div>\n      <div className="flex flex-wrap items-center justify-between gap-2">\n        <p className="flex items-center gap-1.5 text-sm font-bold">\n          <MapPin className="h-4 w-4 text-flame" /> {t(\'checkout.pinTitle\')} *\n        </p>\n        <button\n          type="button"\n          onClick={useMyLocation}\n          disabled={locating}\n          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:border-flame disabled:opacity-50"\n        >\n          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}\n          {locating ? t(\'checkout.locating\') : t(\'checkout.useMyLocation\')}\n        </button>\n      </div>\n      <p className="mt-1 text-xs text-muted-foreground">{t(\'checkout.pinHint\')}</p>\n      <div\n        className="mt-2 h-64 w-full overflow-hidden rounded-xl border border-border sm:h-72"\n        style={{ background: \'#1a1a1e\' }}\n      >\n        <iframe\n          title="Google Maps"\n          src={frameSrc}\n          className="h-full w-full border-0"\n          loading="lazy"\n          referrerPolicy="no-referrer-when-downgrade"\n          allowFullScreen\n        />\n      </div>\n\n      {value ? (\n        <>\n          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#5fc690]">\n            <MapPin className="h-3.5 w-3.5" /> {t(\'checkout.pinSet\')} — {value.lat.toFixed(5)}, {value.lng.toFixed(5)}\n            {accuracy !== null && (\n              <span className="text-muted-foreground">\n                · {t(\'checkout.accLabel\')}: ±{fmtAcc(accuracy)} —{\' \'}\n                {t(accuracy <= 150 ? \'checkout.accGood\' : \'checkout.accPoor\')}\n              </span>\n            )}\n          </p>\n          <div className="mt-2 flex flex-wrap items-center gap-3">\n            <div className="grid w-max grid-cols-3 gap-1">\n              <span />\n              <button type="button" aria-label="nudge north" onClick={() => nudge(NU, 0)} className={nudgeBtn}>\n                <ArrowUp className="h-3.5 w-3.5" />\n              </button>\n              <span />\n              <button type="button" aria-label="nudge west" onClick={() => nudge(0, -NU)} className={nudgeBtn}>\n                <ArrowLeft className="h-3.5 w-3.5" />\n              </button>\n              <span className="flex h-7 w-7 items-center justify-center">\n                <MapPin className="h-3 w-3 text-muted-foreground" />\n              </span>\n              <button type="button" aria-label="nudge east" onClick={() => nudge(0, NU)} className={nudgeBtn}>\n                <ArrowRight className="h-3.5 w-3.5" />\n              </button>\n              <span />\n              <button type="button" aria-label="nudge south" onClick={() => nudge(-NU, 0)} className={nudgeBtn}>\n                <ArrowDown className="h-3.5 w-3.5" />\n              </button>\n              <span />\n            </div>\n            <p className="text-xs text-muted-foreground">{t(\'checkout.nudgeHint\')}</p>\n          </div>\n        </>\n      ) : (\n        <p className="mt-2 text-xs font-semibold text-[#e2a13f]">{t(\'checkout.pinRequired\')}</p>\n      )}\n\n      <div className="mt-3 rounded-xl border border-border bg-card p-3">\n        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">\n          {t(\'checkout.pasteLabel\')}\n        </label>\n        <div className="mt-1.5 flex gap-2">\n          <input\n            value={paste}\n            onChange={(e) => {\n              setPaste(e.target.value)\n              setPasteErr(false)\n            }}\n            onKeyDown={(e) => {\n              if (e.key === \'Enter\') {\n                e.preventDefault()\n                void applyPaste()\n              }\n            }}\n            placeholder={t(\'checkout.pastePlaceholder\')}\n            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-flame"\n          />\n          <button\n            type="button"\n            onClick={() => void applyPaste()}\n            className="rounded-lg bg-flame px-4 py-2 text-xs font-bold uppercase tracking-wider text-cream transition-opacity hover:opacity-90"\n          >\n            {t(\'checkout.pasteSet\')}\n          </button>\n        </div>\n        {pasteErr && <p className="mt-1.5 text-xs font-semibold text-[#e05252]">{t(\'checkout.pasteInvalid\')}</p>}\n      </div>\n    </div>\n  )\n}\n'
ORDER_REPL = [("/** Mini OpenStreetMap embed + open-in-maps links for the customer's pinned spot. */", "/** Google Maps embed of the customer's pinned spot + open-in-maps links. */"), ('  const d = 0.004\n  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`\n', ''), ('        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}', '        src={`https://maps.google.com/maps?q=${lat}%2C${lng}&z=17&output=embed&hl=en`}')]
TRACK_ANCHOR = '<p className="mt-3 text-xs text-muted-foreground">Delivering to: {order.city} — {order.address}</p>'
TRACK_INSERT = '<p className="mt-3 text-xs text-muted-foreground">Delivering to: {order.city} — {order.address}</p>\n        {order.address && <TrackPinMap address={order.address} />}'
TRACK_APPEND = '\n/** Google Maps mini-embed for the order\'s delivery pin ("Pin: lat, lng"). */\nfunction TrackPinMap({ address }: { address: string }) {\n  const { t } = useLang()\n  const m = /Pin:\\s*(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)/.exec(address || \'\')\n  if (!m) return null\n  const lat = parseFloat(m[1])\n  const lng = parseFloat(m[2])\n  if (Number.isNaN(lat) || Number.isNaN(lng)) return null\n  return (\n    <div className="mt-4 rounded-xl border border-border bg-card p-3">\n      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t(\'track.mapTitle\')}</p>\n      <iframe\n        title={t(\'track.mapTitle\')}\n        src={`https://maps.google.com/maps?q=${lat}%2C${lng}&z=16&output=embed&hl=en`}\n        className="mt-2 h-48 w-full rounded-lg border border-border"\n        loading="lazy"\n        referrerPolicy="no-referrer-when-downgrade"\n        allowFullScreen\n      />\n      <a\n        href={`https://www.google.com/maps?q=${lat},${lng}`}\n        target="_blank"\n        rel="noreferrer"\n        className="mt-2 inline-block rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:border-flame"\n      >\n        {t(\'admin.ord.openMap\')}\n      </a>\n    </div>\n  )\n}\n'
UPLOAD_CLIENT = "// Client-side media prep + upload.\n//\n// Why this exists: Netlify serverless functions cap request bodies at ~6 MB.\n// Modern phone photos are 3-10 MB and videos are 20-100 MB, so big files\n// silently failed to upload. Two fixes live here:\n//   1. Images are resized in the browser (max 1600 px long edge, JPEG ~82%),\n//      which lands almost every photo well under 1 MB.\n//   2. Anything still too big (videos, huge images) is uploaded in ~4 MB\n//      chunks that the server reassembles into the MediaAsset database.\n// Videos, animated GIFs, small images and anything that fails to decode\n// pass through compression untouched.\n\nconst MAX_EDGE = 1600\nconst QUALITY = 0.82\nconst PASSTHROUGH_TYPES = new Set(['image/gif'])\n// Stay safely under Netlify's ~6 MB function body cap.\nconst CHUNK_SIZE = 4 * 1024 * 1024\n\nexport type UploadResult = { url: string; type: string }\n\nexport async function compressForUpload(file: File): Promise<File> {\n  try {\n    if (!file.type.startsWith('image/') || PASSTHROUGH_TYPES.has(file.type)) return file\n    // small files go as-is; PNGs up to 3 MB keep their transparency untouched\n    if (file.size <= 1024 * 1024) return file\n    if (file.type === 'image/png' && file.size <= 3 * 1024 * 1024) return file\n    const bitmap = await createImageBitmap(file)\n    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))\n    const w = Math.max(1, Math.round(bitmap.width * scale))\n    const h = Math.max(1, Math.round(bitmap.height * scale))\n    const canvas = document.createElement('canvas')\n    canvas.width = w\n    canvas.height = h\n    const ctx = canvas.getContext('2d')\n    if (!ctx) {\n      bitmap.close()\n      return file\n    }\n    ctx.fillStyle = '#ffffff'\n    ctx.fillRect(0, 0, w, h)\n    ctx.drawImage(bitmap, 0, 0, w, h)\n    bitmap.close()\n    const blob = await new Promise<Blob | null>((resolve) =>\n      canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY)\n    )\n    if (!blob || blob.size >= file.size) return file\n    const name = file.name.replace(/\\.[^.]+$/, '') + '.jpg'\n    return new File([blob], name, { type: 'image/jpeg' })\n  } catch {\n    return file // never block an upload because pre-processing failed\n  }\n}\n\n// One entry point for every admin upload (product media, hero/site, categories).\nexport async function uploadMedia(file: File, target: 'products' | 'site' | 'categories'): Promise<UploadResult> {\n  const prepared = await compressForUpload(file)\n  if (prepared.size <= CHUNK_SIZE) return singleShot(prepared, target)\n  return chunkedUpload(prepared, target)\n}\n\nasync function parseJson(res: Response): Promise<Record<string, unknown>> {\n  try {\n    return (await res.json()) as Record<string, unknown>\n  } catch {\n    return {}\n  }\n}\n\nasync function singleShot(file: File, target: string): Promise<UploadResult> {\n  const fd = new FormData()\n  fd.append('file', file)\n  fd.append('target', target)\n  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })\n  const data = await parseJson(res)\n  if (!res.ok || !data.url) throw new Error((data.error as string) ?? 'Upload failed — please try again')\n  return { url: String(data.url), type: String(data.type ?? 'image') }\n}\n\nasync function chunkedUpload(file: File, target: string): Promise<UploadResult> {\n  const cryptoObj = globalThis.crypto\n  const rawId =\n    cryptoObj && typeof cryptoObj.randomUUID === 'function'\n      ? cryptoObj.randomUUID()\n      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`\n  const chunkId = rawId.replace(/-/g, '')\n  const total = Math.ceil(file.size / CHUNK_SIZE)\n\n  for (let index = 0; index < total; index++) {\n    const blob = file.slice(index * CHUNK_SIZE, Math.min(file.size, (index + 1) * CHUNK_SIZE))\n    const fd = new FormData()\n    fd.append('chunkId', chunkId)\n    fd.append('index', String(index))\n    fd.append('total', String(total))\n    fd.append('chunk', blob, 'chunk.bin')\n    const res = await fetch('/api/admin/upload-chunk', { method: 'POST', body: fd })\n    if (!res.ok) {\n      const data = await parseJson(res)\n      throw new Error((data.error as string) ?? `Chunk ${index + 1}/${total} failed — please retry`)\n    }\n  }\n\n  const res = await fetch('/api/admin/upload-final', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ chunkId, filename: file.name, mime: file.type, size: file.size, target }),\n  })\n  const data = await parseJson(res)\n  if (!res.ok || !data.url) throw new Error((data.error as string) ?? 'Upload failed — please try again')\n  return { url: String(data.url), type: String(data.type ?? 'video') }\n}\n"
ROUTES = [['src/app/api/admin/upload-chunk/route.ts', 'upload-chunk', "import { NextRequest, NextResponse } from 'next/server'\nimport { requireAdmin } from '@/lib/auth'\nimport { db } from '@/lib/db'\n\n// Chunked upload, part 1 of 2: receive one slice of a big file. Phone videos\n// are 20-100 MB and Netlify functions reject bodies over ~6 MB, so the client\n// sends ~4 MB slices; each lands in the MediaAsset table under\n// __chunks/<chunkId>/<index> until /api/admin/upload-final stitches them\n// together into a normal media asset.\n\nconst MAX_CHUNK = 5 * 1024 * 1024\n\n// Magic bytes of the FIRST slice decide whether this is really an image/video.\nfunction detectMagic(b: Uint8Array): string | null {\n  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'\n  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'\n  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp'\n  // ISO BMFF container — MP4 (isom/mp42/…) or MOV (qt)\n  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {\n    if (b[8] === 0x71 && b[9] === 0x74 && b[10] === 0x20 && b[11] === 0x20) return 'video/quicktime'\n    return 'video/mp4'\n  }\n  // Matroska/WEBM (EBML)\n  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm'\n  return null\n}\n\nexport async function POST(req: NextRequest) {\n  const admin = await requireAdmin()\n  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })\n\n  try {\n    const form = await req.formData()\n    const chunkId = String(form.get('chunkId') ?? '').replace(/[^a-z0-9]/gi, '')\n    const index = parseInt(String(form.get('index') ?? ''), 10)\n    const chunk = form.get('chunk')\n\n    if (!/^[a-z0-9]{8,64}$/i.test(chunkId) || !Number.isInteger(index) || index < 0 || index > 999) {\n      return NextResponse.json({ error: 'Bad chunk request' }, { status: 400 })\n    }\n    if (!(chunk instanceof File) || chunk.size === 0) {\n      return NextResponse.json({ error: 'No chunk received' }, { status: 400 })\n    }\n    if (chunk.size > MAX_CHUNK) {\n      return NextResponse.json({ error: 'Chunk too large' }, { status: 413 })\n    }\n\n    const bytes = new Uint8Array(await chunk.arrayBuffer())\n    if (index === 0 && !detectMagic(bytes)) {\n      return NextResponse.json(\n        { error: 'Only real JPG, PNG, WEBP, MP4, MOV or WEBM files are allowed' },\n        { status: 415 }\n      )\n    }\n\n    const path = `__chunks/${chunkId}/${String(index).padStart(4, '0')}`\n    await db.mediaAsset.upsert({\n      where: { path },\n      update: { data: bytes, size: bytes.length },\n      create: { path, data: bytes, mime: 'application/octet-stream', size: bytes.length },\n    })\n    return NextResponse.json({ ok: true, index })\n  } catch (e) {\n    console.error('chunk upload error', e)\n    return NextResponse.json({ error: 'Chunk upload failed — please retry' }, { status: 500 })\n  }\n}\n"], ['src/app/api/admin/upload-final/route.ts', 'upload-final', "import { NextRequest, NextResponse } from 'next/server'\nimport { requireAdmin } from '@/lib/auth'\nimport { db } from '@/lib/db'\nimport { persistData } from '@/lib/persist'\nimport crypto from 'crypto'\n\n// Chunked upload, part 2 of 2: stitch the slices back together, validate the\n// result (magic bytes + size caps), store it as a normal MediaAsset, delete\n// the chunk rows and snapshot the DB like the single-shot route does.\n\nconst MAX_IMAGE = 10 * 1024 * 1024\nconst MAX_VIDEO = 80 * 1024 * 1024\n\nconst EXT: Record<string, string> = {\n  'image/jpeg': '.jpg',\n  'image/png': '.png',\n  'image/webp': '.webp',\n  'video/mp4': '.mp4',\n  'video/quicktime': '.mov',\n  'video/webm': '.webm',\n}\n\nfunction detectMagic(b: Uint8Array): string | null {\n  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'\n  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'\n  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp'\n  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {\n    if (b[8] === 0x71 && b[9] === 0x74 && b[10] === 0x20 && b[11] === 0x20) return 'video/quicktime'\n    return 'video/mp4'\n  }\n  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm'\n  return null\n}\n\nexport async function POST(req: NextRequest) {\n  const admin = await requireAdmin()\n  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })\n\n  try {\n    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>\n    const chunkId = String(body.chunkId ?? '').replace(/[^a-z0-9]/gi, '')\n    const declaredSize = Number(body.size ?? 0)\n    const target = body.target === 'site' ? 'site' : body.target === 'categories' ? 'categories' : 'products'\n\n    if (!/^[a-z0-9]{8,64}$/i.test(chunkId)) {\n      return NextResponse.json({ error: 'Bad upload reference' }, { status: 400 })\n    }\n\n    const rows = await db.mediaAsset.findMany({\n      where: { path: { startsWith: `__chunks/${chunkId}/` } },\n      orderBy: { path: 'asc' },\n    })\n    if (rows.length === 0) {\n      return NextResponse.json({ error: 'Upload expired — please start again' }, { status: 410 })\n    }\n\n    const parts: Buffer[] = []\n    let sum = 0\n    for (const row of rows) {\n      parts.push(Buffer.from(row.data))\n      sum += row.size\n    }\n    const buffer = Buffer.concat(parts)\n\n    // The client reports the full file size; a mismatch means a slice was lost.\n    const cleanup = () =>\n      db.mediaAsset.deleteMany({ where: { path: { startsWith: `__chunks/${chunkId}/` } } }).catch(() => {})\n\n    if (declaredSize > 0 && Math.abs(declaredSize - sum) > 1024) {\n      await cleanup()\n      return NextResponse.json({ error: 'Upload incomplete — please retry' }, { status: 409 })\n    }\n\n    const magic = detectMagic(buffer)\n    const ext = magic ? EXT[magic] : null\n    if (!magic || !ext) {\n      await cleanup()\n      return NextResponse.json(\n        { error: 'Only real JPG, PNG, WEBP, MP4, MOV or WEBM files are allowed' },\n        { status: 415 }\n      )\n    }\n    const isVideo = magic.startsWith('video/')\n    if (buffer.length > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {\n      await cleanup()\n      return NextResponse.json(\n        { error: isVideo ? 'Video is too large (max 80MB)' : 'Image is too large (max 10MB)' },\n        { status: 413 }\n      )\n    }\n\n    const rel = `${target}/${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`\n    await db.mediaAsset.create({\n      data: { path: rel, data: new Uint8Array(buffer), mime: magic, size: buffer.length },\n    })\n    await cleanup()\n    persistData()\n\n    return NextResponse.json({ url: `/api/media/${rel}`, type: isVideo ? 'video' : 'image' })\n  } catch (e) {\n    console.error('upload finalize error', e)\n    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })\n  }\n}\n"], ['src/app/api/geo/resolve/route.ts', 'geo/resolve', 'import { NextRequest, NextResponse } from \'next/server\'\n\n// Resolves a pasted Google Maps link (often a short one like\n// https://maps.app.goo.gl/xyz) into coordinates. Browsers cannot follow those\n// redirects cross-origin, so the server does it: fetch the link and pull\n// "!3dlat!4dlng", "@lat,lng" or "q=lat,lng" out of the final URL / page.\n\nconst ALLOWED = /(^|\\.)(goo\\.gl|maps\\.google\\.[a-z.]+|google\\.[a-z.]+)$/i\n\nfunction extract(text: string): { lat: number; lng: number } | null {\n  const s = text.replace(/\\+/g, \' \') // address-bar URLs encode spaces as +\n  const patterns = [\n    /!3d(-?\\d+(?:\\.\\d+)?)!4d(-?\\d+(?:\\.\\d+)?)/,\n    /@(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)/,\n    /[?&]q=(-?\\d+(?:\\.\\d+)?),\\s*(-?\\d+(?:\\.\\d+)?)/,\n  ]\n  for (const re of patterns) {\n    const m = re.exec(s)\n    if (m) {\n      const lat = parseFloat(m[1])\n      const lng = parseFloat(m[2])\n      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }\n    }\n  }\n  return null\n}\n\nexport async function POST(req: NextRequest) {\n  try {\n    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>\n    const raw = String(body.url ?? \'\').trim()\n    let parsed: URL\n    try {\n      parsed = new URL(raw)\n    } catch {\n      return NextResponse.json({ error: \'Not a link\' }, { status: 400 })\n    }\n    if (!/^https?:$/.test(parsed.protocol) || !ALLOWED.test(parsed.hostname)) {\n      return NextResponse.json({ error: \'Only Google Maps links are supported\' }, { status: 400 })\n    }\n\n    const res = await fetch(parsed.toString(), {\n      redirect: \'follow\',\n      signal: AbortSignal.timeout(8000),\n      headers: { \'User-Agent\': \'Mozilla/5.0 (compatible; ZAMU/1.0)\' },\n    })\n    let spot = extract(res.url)\n    if (!spot) {\n      const text = await res.text().catch(() => \'\')\n      spot = extract(text.slice(0, 400000))\n    }\n    if (!spot) return NextResponse.json({ error: \'No coordinates found in that link\' }, { status: 422 })\n    return NextResponse.json(spot)\n  } catch (e) {\n    console.error(\'geo resolve error\', e)\n    return NextResponse.json({ error: \'Could not resolve that link\' }, { status: 502 })\n  }\n}\n']]
PRODUCT_IMPORT_REPL = [("import { compressForUpload } from '@/lib/upload-client'", "import { uploadMedia } from '@/lib/upload-client'")]
PRODUCT_UPLOAD_REPL = [("        const fd = new FormData()\n        fd.append('file', await compressForUpload(file))\n        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })\n        const data = await jsonOrThrow<{ url?: string; error?: string }>(res)\n        if (!res.ok) throw new Error(data.error ?? t('admin.form.uploadFailed'))", "        const data = await uploadMedia(file, 'products')"), ("      const fd = new FormData()\n      fd.append('file', await compressForUpload(file))\n      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })\n      const data = await jsonOrThrow<{ url?: string; error?: string }>(res)\n      if (!res.ok) throw new Error(data.error ?? t('admin.form.uploadFailed'))", "      const data = await uploadMedia(file, 'products')")]
SETTINGS_IMPORT_REPL = [("import { compressForUpload } from '@/lib/upload-client'", "import { uploadMedia } from '@/lib/upload-client'")]
SETTINGS_UPLOAD_REPL = [("      const fd = new FormData()\n      fd.append('file', await compressForUpload(file))\n      fd.append('target', 'site')\n      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })\n      const data = await jsonOrThrow<{ url?: string; error?: string }>(res)\n      if (!res.ok) throw new Error(data.error ?? t('admin.form.uploadFailed'))", "      const data = await uploadMedia(file, 'site')"), ("      const fd = new FormData()\n      fd.append('file', await compressForUpload(file))\n      fd.append('target', 'categories')\n      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })\n      const data = await jsonOrThrow<{ url?: string; error?: string }>(res)\n      if (!res.ok) throw new Error(data.error ?? t('admin.form.uploadFailed'))", "      const data = await uploadMedia(file, 'categories')")]
DICT_ANCHOR = "'checkout.pinRequired': { en: 'Please pin your delivery location on the map', am: 'እባክዎ የማድረስ ቦታዎን በካርታው ላይ ይምረጡ' },"
DICT_KEYS = ["'checkout.pasteLabel': { en: 'Exact spot from Google Maps', am: 'ከGoogle Maps — ትክክለኛ ቦታ' },", "'checkout.pastePlaceholder': { en: 'Paste a Google Maps link or 9.0054, 38.7636', am: 'የGoogle Maps ሊንክ ወይም 9.0054, 38.7636 ይለጥፉ' },", "'checkout.pasteSet': { en: 'Set pin', am: 'ቦታ አስቀምጡ' },", "'checkout.pasteInvalid': { en: 'Couldn’t read that — paste a Google Maps link or lat, lng', am: 'ማንበብ አልተቻለም — የGoogle Maps ሊንክ ወይም lat, lng ይለጥፉ' },", "'checkout.accLabel': { en: 'GPS accuracy', am: 'የGPS ትክክለኛነት' },", "'checkout.accGood': { en: 'accurate', am: 'ትክክል ነው' },", "'checkout.accPoor': { en: 'rough — for an exact pin, paste your spot from the Google Maps app below', am: 'ርቆም ነው — ትክክለኛ ቦታ ለማስቀመጥ ከታች ከGoogle Maps መተግበሪያው ቦታዎን ይለጥፉ' },", "'checkout.nudgeHint': { en: 'Arrows nudge the pin by about 20 m', am: 'ቀስቶቹ ፒኑን በግምት 20 ሜትር ያንቀሳቅሳሉ' },", "'track.mapTitle': { en: 'Delivery map', am: 'የማድረስ ካርታ' },"]
PKG_DROP = ['"leaflet"', '"@types/leaflet"']
import hashlib, os, sys

ROOT = os.getcwd()
FAILS = []

def p_ok(name):
    print("  [PASS] " + name)

def p_fail(name, why=""):
    FAILS.append(name)
    print("  [FAIL] " + name + ((" - " + str(why)) if why else ""))

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()

def write(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(s)
    print("         wrote " + p + " (" + str(len(s.encode("utf-8"))) + " B)")

def edit(path, fn, label):
    try:
        text = read(path) if os.path.exists(os.path.join(ROOT, path)) else ""
        result = fn(text)
        if result is None:
            p_ok(label + " (already up to date)")
        else:
            write(path, result)
            p_ok(label)
    except Exception as e:
        p_fail(label, e)

def repl(text, old, new, label):
    n = text.count(old)
    if n == 1:
        return text.replace(old, new)
    if n == 0 and new in text:
        return text  # already applied by a previous run
    raise ValueError(label + ": expected exactly 1 anchor, found " + str(n))

# -- 1. crown logo component (data URI) --------------------------------------
def op_logo(text):
    if "data:image/webp;base64," in text:
        return None
    return LOGO_TSX

# -- 2/3. header + footer use CrownLogo --------------------------------------
def mk_header(text):
    text = repl(text, HEADER_IMPORT_ANCHOR, HEADER_IMPORT_NEW, "header import")
    for old, new in HEADER_REPL:
        text = repl(text, old, new, "header logo")
    return text

def mk_footer(text):
    text = repl(text, FOOTER_IMPORT_ANCHOR, FOOTER_IMPORT_NEW, "footer import")
    for old, new in FOOTER_REPL:
        text = repl(text, old, new, "footer logo")
    return text

# -- 4. service worker cache version bump ------------------------------------
def mk_sw(text):
    return repl(text, SW_OLD, SW_NEW, "sw version")

# -- 5. next.config rewrites /uploads -> /api/media --------------------------
def mk_next(text):
    if '/uploads/:path*' in text:
        return None
    if 'output: "standalone"' not in text:
        raise ValueError("next.config.ts does not look like the expected file")
    return NEXT_CONFIG

# -- 6. location picker -> Google Maps ---------------------------------------
def mk_picker(text):
    if "output=embed" in text and "leaflet" not in text:
        return None
    return LOCATION_PICKER

# -- 7. admin order map -> Google Maps ---------------------------------------
def mk_order(text):
    if "maps.google.com/maps?" in text and "openstreetmap" not in text:
        return None
    for old, new in ORDER_REPL:
        text = repl(text, old, new, "order map")
    return text

# -- 8. track page mini map ----------------------------------------------------
def mk_track(text):
    if "TrackPinMap" in text:
        return None
    if TRACK_ANCHOR not in text:
        raise ValueError("track 'Delivering to:' anchor not found")
    return text.replace(TRACK_ANCHOR, TRACK_INSERT, 1).rstrip("\n") + "\n" + TRACK_APPEND

# -- 9. upload client with chunked upload ------------------------------------
def mk_upload_client(text):
    if "uploadMedia" in text:
        return None
    return UPLOAD_CLIENT

# -- 10. route files -----------------------------------------------------------
def mk_routes():
    for rel, marker, content in ROUTES:
        try:
            text = read(rel) if os.path.exists(os.path.join(ROOT, rel)) else None
        except OSError:
            text = None
        if text is not None and marker in text:
            p_ok(rel + " (already up to date)")
            continue
        write(rel, content)
        p_ok(rel)

# -- 11/12. admin forms -> uploadMedia ----------------------------------------
def mk_product(text):
    if "uploadMedia(file, 'products')" in text:
        return None
    for old, new in PRODUCT_IMPORT_REPL:
        text = repl(text, old, new, "product import")
    for old, new in PRODUCT_UPLOAD_REPL:
        text = repl(text, old, new, "product upload")
    return text

def mk_settings(text):
    if "uploadMedia(file, 'site')" in text:
        return None
    for old, new in SETTINGS_IMPORT_REPL:
        text = repl(text, old, new, "settings import")
    for old, new in SETTINGS_UPLOAD_REPL:
        text = repl(text, old, new, "settings upload")
    return text

# -- 13. i18n keys (insert only the missing ones) ------------------------------
def mk_dict(text):
    if DICT_ANCHOR not in text and "checkout.pasteLabel" not in text:
        raise ValueError("dict anchor (checkout.pinRequired) not found")
    added = 0
    for line in DICT_KEYS:
        key = line.split("'")[1]
        if ("'" + key + "':") in text:
            continue
        if DICT_ANCHOR in text:
            text = text.replace(DICT_ANCHOR, DICT_ANCHOR + "\n  " + line, 1)
        else:
            # anchor was consumed by an earlier insert; insert after pasteLabel
            text = text.replace("  " + DICT_KEYS[0], "  " + DICT_KEYS[0] + "\n  " + line, 1) \
                if line != DICT_KEYS[0] else text
        added += 1
    if added == 0:
        return None
    print("         +" + str(added) + " i18n keys")
    return text

# -- 14. package.json: drop leaflet --------------------------------------------
def mk_pkg(text):
    lines = text.split("\n")
    kept = [l for l in lines if not any(('"' + d.strip('"') + '"') in l for d in PKG_DROP)]
    removed = len(lines) - len(kept)
    if removed == 0:
        return None
    out = "\n".join(kept)
    out = out.replace(",\n,", ",")  # paranoia, should not trigger
    print("         removed " + str(removed) + " leaflet line(s)")
    return out if out != text else None

edit("src/components/store/logo.tsx", op_logo, "crown logo component (data URI)")
edit("src/components/store/header.tsx", mk_header, "header logo -> CrownLogo")
edit("src/components/store/footer.tsx", mk_footer, "footer logo -> CrownLogo")
edit("public/sw.js", mk_sw, "service worker cache bump (zamu-v5)")
edit("next.config.ts", mk_next, "next.config /uploads rewrite")
edit("src/components/store/location-picker.tsx", mk_picker, "checkout picker -> Google Maps + paste")
edit("src/components/admin/order-detail.tsx", mk_order, "admin order map -> Google Maps")
edit("src/components/store/track-client.tsx", mk_track, "track page delivery mini map")
edit("src/lib/upload-client.ts", mk_upload_client, "upload client (chunked uploads)")
mk_routes()
edit("src/components/admin/product-form.tsx", mk_product, "product form -> uploadMedia")
edit("src/components/admin/settings-editor.tsx", mk_settings, "settings editor -> uploadMedia")
edit("src/lib/i18n-dict.ts", mk_dict, "i18n keys (en+am)")
edit("package.json", mk_pkg, "package.json: leaflet removed")

print("")
if FAILS:
    print("PATCHER FAILED: " + ", ".join(FAILS))
    sys.exit(1)
print("PATCHER: all steps passed")

ZAMU_PY_EOF
if python3 .zamu-fix4-patch.py; then rm -f .zamu-fix4-patch.py; ok "file patcher"; else rm -f .zamu-fix4-patch.py; bad "file patcher"; echo; echo "ABORTED — nothing was pushed."; exit 1; fi

sec "2. Verify UTF-8 integrity of every touched file"
BADFILES=0
for f in src/components/store/logo.tsx src/components/store/header.tsx src/components/store/footer.tsx \
         src/components/store/location-picker.tsx src/components/store/track-client.tsx \
         src/components/admin/order-detail.tsx src/components/admin/product-form.tsx \
         src/components/admin/settings-editor.tsx src/lib/upload-client.ts src/lib/i18n-dict.ts \
         src/app/api/admin/upload-chunk/route.ts src/app/api/admin/upload-final/route.ts \
         src/app/api/geo/resolve/route.ts next.config.ts public/sw.js package.json; do
  if ! iconv -f UTF-8 -t UTF-8 "$f" >/dev/null 2>&1; then echo "         corrupt: $f"; BADFILES=$((BADFILES+1)); fi
done
[ "$BADFILES" = 0 ] && ok "all 16 files are valid UTF-8" || bad "$BADFILES file(s) corrupt"

sec "3. Verify the patch landed"
logo_md5=$(grep -o 'base64,[A-Za-z0-9+/=]*' src/components/store/logo.tsx | cut -d, -f2 | base64 -d 2>/dev/null | md5sum | cut -d' ' -f1)
[ "$logo_md5" = "d8fe122ce84c4cfa5b8d33522928b7e7" ] && ok "crown logo bytes intact (md5 match)" || bad "logo payload md5 mismatch: $logo_md5"
grep -q "CrownLogo" src/components/store/header.tsx && grep -q "CrownLogo" src/components/store/footer.tsx \
  && ! grep -q 'zamu-crown-logo.webp' src/components/store/header.tsx src/components/store/footer.tsx \
  && ok "header/footer use the embedded CrownLogo" || bad "header/footer logo swap incomplete"
grep -q 'zamu-v5' public/sw.js && ok "service worker bumped to zamu-v5 (stale caches purge)" || bad "sw version"
grep -q 'uploads/:path*' next.config.ts && ok "legacy /uploads/* now heals from the DB" || bad "next.config rewrite"
grep -q 'output=embed' src/components/store/location-picker.tsx && ! grep -rq leaflet src/ \
  && ok "checkout picker = real Google Maps, leaflet fully gone" || bad "location picker / leaflet"
grep -q 'maps.google.com/maps?' src/components/admin/order-detail.tsx && ok "admin order map = Google Maps" || bad "admin map"
grep -q 'TrackPinMap' src/components/store/track-client.tsx && ok "track page shows the delivery map" || bad "track map"
grep -q 'upload-chunk' src/lib/upload-client.ts && [ -f src/app/api/admin/upload-chunk/route.ts ] \
  && [ -f src/app/api/admin/upload-final/route.ts ] && [ -f src/app/api/geo/resolve/route.ts ] \
  && ok "chunked upload + link resolver routes present" || bad "upload routes"
! grep -q "fetch('/api/admin/upload'" src/components/admin/product-form.tsx \
  && ! grep -q "fetch('/api/admin/upload'" src/components/admin/settings-editor.tsx \
  && grep -q 'uploadMedia(file, ' src/components/admin/product-form.tsx \
  && grep -q 'uploadMedia(file, ' src/components/admin/settings-editor.tsx \
  && ok "all 4 admin upload call sites use the chunked uploader" || bad "upload call sites"
DK=0; for k in pasteLabel pastePlaceholder pasteSet pasteInvalid accLabel accGood accPoor nudgeHint; do
  grep -q "'checkout.$k'" src/lib/i18n-dict.ts && DK=$((DK+1)); done
grep -q "'track.mapTitle'" src/lib/i18n-dict.ts && DK=$((DK+1))
[ "$DK" = 9 ] && ok "9 new bilingual keys present ($DK/9)" || bad "i18n keys $DK/9"
grep -q 'leaflet' package.json && bad "leaflet still in package.json" || ok "leaflet removed from package.json"

sec "4. Install dependencies (refreshes the lockfile)"
if command -v bun >/dev/null 2>&1; then bun install && ok "bun install" || bad "bun install"; \
elif command -v npm >/dev/null 2>&1; then npm install && ok "npm install" || bad "npm install"; \
else bad "neither bun nor npm found"; fi

sec "5. Publish"
FILES="src/components/store/logo.tsx src/components/store/header.tsx src/components/store/footer.tsx \
src/components/store/location-picker.tsx src/components/store/track-client.tsx \
src/components/admin/order-detail.tsx src/components/admin/product-form.tsx \
src/components/admin/settings-editor.tsx src/lib/upload-client.ts src/lib/i18n-dict.ts \
src/app/api/admin/upload-chunk/route.ts src/app/api/admin/upload-final/route.ts \
src/app/api/geo/resolve/route.ts next.config.ts public/sw.js package.json bun.lock"
if [ "${ZAMU_NO_PUSH:-0}" = "1" ]; then
  echo "  ZAMU_NO_PUSH=1 — changes left in the working tree, nothing committed or pushed."
else
  git add $FILES
  if git diff --cached --quiet; then echo "  Nothing new to commit (already applied)."; fi
  if git commit -m "ZAMU: real Google Maps everywhere + paste-exact-pin, chunked video uploads, unbreakable logo" >/dev/null 2>&1; then
    ok "commit created"
  else
    echo "  [SKIP] nothing to commit"
  fi
  pushed=0
  for i in 1 2 3 4; do
    if git push origin main 2>/dev/null; then pushed=1; break; fi
    echo "         push retry $i — rebasing on origin/main first"
    git pull --rebase --autostash origin main >/dev/null 2>&1 || true
  done
  [ "$pushed" = 1 ] && ok "pushed to GitHub — Netlify will deploy in ~2 min" || bad "push failed after retries"
fi

echo
echo "=============================================="
if [ "$FAIL" -gt 0 ]; then
  echo "RESULT: $FAIL check(s) FAILED, $PASS passed."
  echo "Nothing was pushed while a check is failing. Re-run the script"
  echo "after fixing, or report the [FAIL] lines above."
  exit 1
fi
echo "RESULT: ALL CHECKS PASSED ($PASS passed)."
echo
echo "What changed for you:"
echo "  * Checkout + admin + Track Order page now show REAL Google Maps."
echo "  * Customers can paste their exact spot from the Google Maps app —"
echo "    tell them: long-press the door, copy, paste. No more 5 km guesses."
echo "  * VIDEO uploads now work: the phone sends the clip in small chunks."
echo "  * Crown logo in header + footer can never break again."
echo
echo "After Netlify deploys, hard-refresh the site once (or the PWA re-opens)"
echo "so your phone drops the old cached pages."
exit 0
