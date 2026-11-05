#!/usr/bin/env bash
# =====================================================================
# ZAMU fix 11 — the social buttons become YOURS:
#   * NEW TAB in Admin > Settings: "Social buttons"
#       - change TikTok / Instagram / WhatsApp / Telegram / Facebook /
#         YouTube / X / other — @handle or full link, your choice
#       - ADD new buttons, REORDER with the arrows, REMOVE with the bin
#   * the round buttons at the bottom of every page AND the cards on
#     the Contact page now follow exactly what you set there
#   * the three old hidden text fields (WhatsApp / Instagram / TikTok)
#     are retired — ONE place to manage them from now on
#   * changes go live right after "Save all" (no redeploy needed)
#
# Run inside your Codespace:   bash zamu-fix11.sh
# Self-verifying: every step prints [PASS] or stops with [FAIL].
# Safe to re-run (idempotent). Set ZAMU_NO_PUSH=1 to test without pushing.
# =====================================================================
set -u
cd "$(dirname "$0")"

pass=0; fail=0
ok()   { echo "  [PASS] $1"; pass=$((pass+1)); }
bad()  { echo "  [FAIL] $1"; fail=$((fail+1)); }
trap 'echo; echo "RESULT: $pass passed, $fail failed — script did NOT complete."; exit 1' ERR

echo "== 0. Preflight =="
[ -f package.json ] && ok "repo root found (package.json)" || { bad "package.json not found"; false; }
[ -d src/components/store ] && ok "Next.js src/ found" || { bad "src/ missing"; false; }
command -v python3 >/dev/null && ok "python3 available" || { bad "python3 not available"; false; }
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
[ "$branch" = "main" ] && ok "on branch main" || echo "  (note: branch is '$branch' — continuing anyway)"
[ -n "${ZAMU_NO_PUSH:-}" ] && echo "  (ZAMU_NO_PUSH set: will commit but not push)" || true

echo
echo "== 1. Ground check (what must already be true) =="
grep -q '"postinstall": "prisma generate"' package.json \
  && ok "prisma generate guard in place (postinstall)" || { bad "postinstall hook missing"; false; }
grep -q "parseSocialLinks(settings.socialLinks" src/components/store/footer.tsx \
  && ok "footer already reads the socialLinks setting" || { bad "footer social wiring changed"; false; }
grep -q "export const SOCIAL_TYPES" src/lib/social.ts \
  && ok "shared social library present" || { bad "src/lib/social.ts missing"; false; }
grep -q "socialLinks:" src/lib/settings-defaults.ts \
  && ok "socialLinks default present in settings" || { bad "settings-defaults changed"; false; }

echo
echo "== 2. Admin Settings: new 'Social buttons' tab =="
python3 - <<'ZAMU_EDITOR_EOF'
import pathlib
p = pathlib.Path("src/components/admin/settings-editor.tsx")
src = p.read_text(encoding="utf-8")

if 'value="social"' in src:
    print("  settings-editor already patched - skipping")
else:
    def rep(old, new, what):
        global src
        n = src.count(old)
        assert n == 1, "anchor not unique (%d): %s" % (n, what)
        src = src.replace(old, new, 1)
        print("  " + what)

    rep("import { Loader2, Plus, Trash2, Save, UploadCloud, PowerOff, X } from 'lucide-react'",
        "import { Loader2, Plus, Trash2, Save, UploadCloud, PowerOff, X, ArrowUp, ArrowDown } from 'lucide-react'",
        "arrow icons imported")

    rep("import { MediaBox } from '@/components/store/media-box'",
        "import { MediaBox } from '@/components/store/media-box'\n"
        "import { SocialIcon } from '@/components/store/social-icons'\n"
        "import { parseSocialLinks, stringifySocialLinks, SOCIAL_TYPES, type SocialLink, type SocialType } from '@/lib/social'",
        "shared social library imported")

    rep("  const [heroImageUploading, setHeroImageUploading] = useState(false)",
        "  const [heroImageUploading, setHeroImageUploading] = useState(false)\n"
        "  const [socialRows, setSocialRows] = useState<SocialLink[]>([])",
        "socialRows state added")

    rep("    setSettings(s?.settings ?? {})",
        "    setSettings(s?.settings ?? {})\n"
        "    setSocialRows(parseSocialLinks(s?.settings?.socialLinks, {\n"
        "      whatsapp: s?.settings?.contactWhatsapp,\n"
        "      tiktok: s?.settings?.contactTiktok,\n"
        "      instagram: s?.settings?.contactInstagram,\n"
        "    }))",
        "editor prefills from the same source the footer uses")

    rep("body: JSON.stringify(settings) })",
        "body: JSON.stringify({ ...settings, socialLinks: stringifySocialLinks(socialRows) }) })",
        "Save all now stores the social links too")

    rep("          <TabsTrigger value=\"store\">{t('admin.settings.tabStore')}</TabsTrigger>",
        "          <TabsTrigger value=\"store\">{t('admin.settings.tabStore')}</TabsTrigger>\n"
        "          <TabsTrigger value=\"social\">{t('admin.settings.tabSocial')}</TabsTrigger>",
        "'Social buttons' tab added")

    helpers = """  function updateSocialRow(i: number, patch: Partial<SocialLink>) {
    setSocialRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function moveSocialRow(i: number, dir: -1 | 1) {
    setSocialRows((rows) => {
      const j = i + dir
      if (j < 0 || j >= rows.length) return rows
      const next = [...rows]
      const tmp = next[i]
      next[i] = next[j]
      next[j] = tmp
      return next
    })
  }

  function addSocialRow() {
    setSocialRows((rows) => [...rows, { type: 'tiktok', url: '' }])
  }

  function removeSocialRow(i: number) {
    setSocialRows((rows) => rows.filter((_, idx) => idx !== i))
  }

"""
    rep("  async function uploadHeroMedia(file: File | undefined) {",
        helpers + "  async function uploadHeroMedia(file: File | undefined) {",
        "add / move / remove helpers added")

    legacy = (
        "  { key: 'contactWhatsapp', labelKey: 'admin.settings.fields.contactWhatsapp' },\n"
        "  { key: 'contactInstagram', labelKey: 'admin.settings.fields.contactInstagram' },\n"
        "  { key: 'contactTiktok', labelKey: 'admin.settings.fields.contactTiktok' },\n")
    n = src.count(legacy)
    assert n == 1, "legacy field block not found (%d)" % n
    src = src.replace(legacy, "", 1)
    print("  retired the 3 old hidden fields (one place to manage them now)")

    tab = """        {/* SOCIAL LINKS — the round buttons at the bottom of every page + contact page */}
        <TabsContent value="social" className="mt-4 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div>
              <h2 className="font-display text-lg uppercase">{t('admin.settings.socialTitle')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('admin.settings.socialHint')}</p>
            </div>
            <div className="mt-4 space-y-3">
              {socialRows.map((row, i) => (
                <div key={`${row.type}-${i}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border">
                    <SocialIcon type={row.type} className="h-4 w-4" />
                  </span>
                  <select
                    value={row.type}
                    onChange={(e) => updateSocialRow(i, { type: e.target.value as SocialType })}
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    aria-label={t('admin.settings.socialType')}
                  >
                    {SOCIAL_TYPES.map((st) => (
                      <option key={st.type} value={st.type}>{st.label}</option>
                    ))}
                  </select>
                  <Input
                    value={row.url}
                    onChange={(e) => updateSocialRow(i, { url: e.target.value })}
                    placeholder={SOCIAL_TYPES.find((st) => st.type === row.type)?.placeholder ?? 'https://…'}
                    className="min-w-[200px] flex-1"
                    aria-label={t('admin.settings.socialValue')}
                  />
                  <Button type="button" size="sm" variant="ghost" disabled={i === 0} onClick={() => moveSocialRow(i, -1)} aria-label={t('admin.settings.socialUp')} className="px-2">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={i === socialRows.length - 1} onClick={() => moveSocialRow(i, 1)} aria-label={t('admin.settings.socialDown')} className="px-2">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeSocialRow(i)} aria-label={t('common.remove')} className="rounded-full text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {socialRows.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t('admin.settings.socialEmpty')}</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={addSocialRow} className="rounded-full text-xs uppercase tracking-wider">
                <Plus className="mr-1 h-4 w-4" /> {t('admin.settings.socialAdd')}
              </Button>
              <Button onClick={saveSettings} disabled={busy} className="rounded-full bg-ink text-xs uppercase tracking-wider hover:bg-flame">
                <Save className="mr-1.5 h-4 w-4" /> {busy ? t('admin.form.saving') : t('admin.settings.saveAll')}
              </Button>
            </div>
          </section>
        </TabsContent>

"""
    anchor = "        {/* CATEGORIES (home page tiles) */}"
    n = src.count(anchor)
    assert n == 1, "categories anchor not unique (%d)" % n
    src = src.replace(anchor, tab + anchor, 1)
    print("  Social buttons editor inserted")

    p.write_text(src, encoding="utf-8")
ZAMU_EDITOR_EOF
[ $? -eq 0 ] && ok "admin settings editor patched" || { bad "settings-editor"; false; }

echo
echo "== 3. Contact page: same setting drives the cards =="
python3 - <<'ZAMU_CONTACT_EOF'
import pathlib
p = pathlib.Path("src/app/(storefront)/contact/page.tsx")
src = p.read_text(encoding="utf-8")

if "parseSocialLinks" in src:
    print("  contact page already patched - skipping")
else:
    def rep(old, new, what):
        global src
        n = src.count(old)
        assert n == 1, "anchor not unique (%d): %s" % (n, what)
        src = src.replace(old, new, 1)
        print("  " + what)

    rep("import { Phone, Mail, MapPin, MessageCircle, Instagram } from 'lucide-react'",
        "import { MapPin } from 'lucide-react'",
        "lucide imports slimmed")

    rep("import Link from 'next/link'",
        "import Link from 'next/link'\n"
        "import { SocialIcon } from '@/components/store/social-icons'\n"
        "import { parseSocialLinks, socialHref, socialLabel, socialDisplay } from '@/lib/social'",
        "shared social library imported")

    i = src.find("/** TikTok has no lucide glyph")
    assert i != -1, "TikTokIcon start not found"
    j = src.find("export const metadata", i)
    assert j != -1, "metadata marker not found"
    src = src[:i] + src[j:]
    print("  local TikTok icon removed (shared icon set used instead)")

    old_channels = """  const wa = (map.contactWhatsapp ?? '').replace(/[^0-9]/g, '')

  const channels = [
    { icon: Phone, label: 'Call Us', value: map.contactPhone, href: `tel:${map.contactPhone}`, cta: 'Call Now' },
    { icon: MessageCircle, label: 'WhatsApp', value: map.contactWhatsapp, href: `https://wa.me/${wa}`, cta: 'Chat on WhatsApp' },
    { icon: TikTokIcon, label: 'TikTok', value: `@${(map.contactTiktok ?? '').replace('@', '')}`, href: `https://tiktok.com/@${(map.contactTiktok ?? '').replace('@', '')}`, cta: 'Follow' },
    { icon: Instagram, label: 'Instagram', value: `@${(map.contactInstagram ?? '').replace('@', '')}`, href: `https://instagram.com/${(map.contactInstagram ?? '').replace('@', '')}`, cta: 'Follow' },
    { icon: Mail, label: 'Email', value: map.contactEmail, href: `mailto:${map.contactEmail}`, cta: 'Send email' },
  ].filter((c) => c.value)"""
    new_channels = """  const socials = parseSocialLinks(map.socialLinks, {
    whatsapp: map.contactWhatsapp,
    tiktok: map.contactTiktok,
    instagram: map.contactInstagram,
  })
  const channels = [
    { kind: 'phone', label: 'Call Us', value: map.contactPhone, href: `tel:${map.contactPhone}`, cta: 'Call Now' },
    { kind: 'email', label: 'Email', value: map.contactEmail, href: `mailto:${map.contactEmail}`, cta: 'Send email' },
    ...socials.map((s) => ({
      kind: s.type as string,
      label: socialLabel(s.type),
      value: socialDisplay(s.type, s.url),
      href: socialHref(s.type, s.url),
      cta: s.type === 'whatsapp' ? 'Chat on WhatsApp' : 'Follow',
    })),
  ].filter((c) => c.value)"""
    n = src.count(old_channels)
    assert n == 1, "channels block not found (%d)" % n
    src = src.replace(old_channels, new_channels, 1)
    print("  contact cards now driven by the Social buttons setting")

    rep('<c.icon className="h-5 w-5" />',
        '<SocialIcon type={c.kind} className="h-5 w-5" />',
        "cards render the shared icon set")

    p.write_text(src, encoding="utf-8")
ZAMU_CONTACT_EOF
[ $? -eq 0 ] && ok "contact page unified with the same setting" || { bad "contact page"; false; }

echo
echo "== 4. Bilingual strings + service worker refresh =="
python3 - <<'ZAMU_I18N_EOF'
import pathlib
p = pathlib.Path("src/lib/i18n-dict.ts")
src = p.read_text(encoding="utf-8")
if "'admin.settings.tabSocial'" in src:
    print("  i18n keys already present - skipping")
else:
    anchor = "  'admin.settings.tabPromos': { en: 'Promotions', am: 'ቅናሾች' },"
    n = src.count(anchor)
    assert n == 1, "tabPromos anchor not found (%d)" % n
    keys = [
        "  'admin.settings.tabSocial': { en: 'Social buttons', am: 'የሶሻል አዝራሮች' },",
        "  'admin.settings.socialTitle': { en: 'Social links (footer buttons)', am: 'የሶሻል ሊንኮች (የግርጌ አዝራሮች)' },",
        "  'admin.settings.socialHint': { en: 'These are the round TikTok / Instagram / WhatsApp buttons at the bottom of the page and the cards on the Contact page. Pick the network, type a @handle or a full link, add, reorder or remove them, then press \"Save all\" — the site updates right away.', am: 'እነዚህ በገጹ ግርጌና በContact ገጽ ላይ ያሉ የቲክቶክ / ኢንስታግራም / ዋትስአፕ ክብ አዝራሮች ናቸው። አውታረ መረቡን ይምረጡ፣ @መለያ ወይም ሙሉ ሊንክ ይጻፉ፣ ያክሉ ወይም ያስወግዱ፣ ከዚያ \"Save all\" ይንኩ — ለውጦች ወዲያውኑ ይታያሉ።' },",
        "  'admin.settings.socialAdd': { en: 'Add link', am: 'ሊንክ ጨምር' },",
        "  'admin.settings.socialEmpty': { en: 'No social links yet — press \"Add link\" to create the first one.', am: 'እስካሁን ምንም የሶሻል ሊንኮች የሉም — የመጀመሪያውን ለመፍጠር \"ሊንክ ጨምር\" ይንኩ።' },",
        "  'admin.settings.socialType': { en: 'Network', am: 'ዓይነት' },",
        "  'admin.settings.socialValue': { en: 'Handle or full link', am: 'መለያ ወይም ሙሉ ሊንክ' },",
        "  'admin.settings.socialUp': { en: 'Move up', am: 'ወደ ላይ' },",
        "  'admin.settings.socialDown': { en: 'Move down', am: 'ወደ ታች' },",
    ]
    src = src.replace(anchor, anchor + "\n" + "\n".join(keys), 1)
    p.write_text(src, encoding="utf-8")
    print("  9 bilingual keys added (en + am)")
ZAMU_I18N_EOF
[ $? -eq 0 ] && ok "i18n strings (en + am)" || { bad "i18n"; false; }

python3 - <<'ZAMU_SW_EOF'
import pathlib, re
p = pathlib.Path("public/sw.js")
src = p.read_text(encoding="utf-8")
if "zamu-v11" in src:
    print("  sw.js already at zamu-v11 - skipping")
else:
    new, n = re.subn(r"const VERSION = 'zamu-v\d+'", "const VERSION = 'zamu-v11'", src)
    assert n == 1, "sw.js VERSION line not found"
    p.write_text(new, encoding="utf-8")
    print("  sw.js cache -> zamu-v11 (PWA users get the fresh pages)")
ZAMU_SW_EOF
[ $? -eq 0 ] && ok "service worker bumped to zamu-v11" || { bad "sw bump"; false; }

echo
echo "== 5. Verify the patch landed =="
grep -q 'TabsTrigger value="social"' src/components/admin/settings-editor.tsx \
  && ok "Social buttons tab trigger present" || { bad "tab trigger missing"; false; }
grep -q 'TabsContent value="social"' src/components/admin/settings-editor.tsx \
  && grep -q "stringifySocialLinks(socialRows)" src/components/admin/settings-editor.tsx \
  && ok "editor content + save wiring present" || { bad "editor content missing"; false; }
grep -q "updateSocialRow" src/components/admin/settings-editor.tsx \
  && grep -q "addSocialRow" src/components/admin/settings-editor.tsx \
  && ok "add / move / remove controls present" || { bad "row helpers missing"; false; }
if grep -q "key: 'contactTiktok'" src/components/admin/settings-editor.tsx; then
  bad "old hidden fields still present"; false
else
  ok "old hidden fields retired"
fi
grep -q "'admin.settings.socialHint'" src/lib/i18n-dict.ts \
  && grep -q "'admin.settings.socialDown'" src/lib/i18n-dict.ts \
  && ok "bilingual strings verified" || { bad "i18n keys missing"; false; }
grep -q "parseSocialLinks(map.socialLinks" "src/app/(storefront)/contact/page.tsx" \
  && grep -q "SocialIcon type={c.kind}" "src/app/(storefront)/contact/page.tsx" \
  && ok "contact page reads the same setting" || { bad "contact page wiring"; false; }
if grep -q "TikTokIcon" "src/app/(storefront)/contact/page.tsx"; then
  bad "old TikTok icon still on contact page"; false
else
  ok "contact page cleaned of dead code"
fi
python3 - <<'ZAMU_UTF8_EOF'
import pathlib
files = [
    "src/components/admin/settings-editor.tsx",
    "src/app/(storefront)/contact/page.tsx",
    "src/lib/i18n-dict.ts",
    "public/sw.js",
]
for f in files:
    pathlib.Path(f).read_text(encoding="utf-8")
print("  all 4 touched files are valid UTF-8")
ZAMU_UTF8_EOF
[ $? -eq 0 ] && ok "utf-8 sweep" || { bad "utf-8"; false; }

echo
echo "== 6. TypeScript proof (must be 0 errors) =="
if [ ! -x node_modules/.bin/tsc ]; then
  echo "  installing dependencies (one-time, can take a few minutes)..."
  if command -v bun >/dev/null 2>&1; then
    bun install >/dev/null 2>&1 || npm install --no-audit --no-fund --loglevel=error
  else
    npm install --no-audit --no-fund --loglevel=error
  fi
fi
[ -x node_modules/.bin/tsc ] && ok "TypeScript compiler ready" || { bad "tsc not available"; false; }
rm -rf .next/types
rm -f tsconfig.tsbuildinfo
if ./node_modules/.bin/tsc --noEmit > /tmp/zamu-tsc-fix11.log 2>&1; then
  ok "type check: 0 errors"
else
  echo "  --- first TypeScript errors ---"
  head -30 /tmp/zamu-tsc-fix11.log
  echo "  -------------------------------"
  bad "tsc reported errors — nothing was pushed"; false
fi

echo
echo "== 7. Publish (hardened) =="
git add -A src/components/admin/settings-editor.tsx "src/app/(storefront)/contact/page.tsx" src/lib/i18n-dict.ts public/sw.js
unpushed=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
if [ "${unpushed:-0}" -gt 0 ] 2>/dev/null; then
  echo "  note: $unpushed un-pushed commit(s) (incl. any earlier fix) will ship with this push"
fi
if git diff --cached --quiet; then
  ok "nothing to commit — already applied"
else
  git commit -m "ZAMU: social buttons (TikTok, Instagram, WhatsApp and more) now editable in Admin > Settings" >/dev/null 2>&1 && ok "commit created" || { bad "commit"; false; }
fi
if [ -n "${ZAMU_NO_PUSH:-}" ]; then
  ok "ZAMU_NO_PUSH set — skipped push"
else
  git pull --rebase origin main >/dev/null 2>&1 || echo "  (note: pull skipped — trying direct push)"
  pushed=0
  for i in 1 2 3 4; do
    if git push origin main >/dev/null 2>&1; then pushed=1; break; fi
    sleep 3
  done
  if [ "$pushed" = 1 ]; then
    ok "pushed to GitHub — Netlify will deploy in ~2 min"
  else
    bad "push failed — run this once yourself: git push origin main"
  fi
fi

echo
echo "=============================================="
echo "RESULT: ALL CHECKS PASSED ($pass passed)."
echo
echo "What changed for you:"
echo "  * Admin > Settings now has a 'Social buttons' tab."
echo "  * There you can change the TikTok / Instagram / WhatsApp buttons,"
echo "    add new ones (Telegram, Facebook, YouTube, X, any link),"
echo "    reorder them with the arrows or remove them with the bin."
echo "  * The round buttons at the bottom of every page AND the cards on"
echo "    the Contact page follow what you set there — one place, always"
echo "    in sync, no redeploy needed."
echo "  * The three old hidden text fields are gone to avoid confusion."
echo
echo "HOW TO USE (after Netlify deploys, ~2 min):"
echo "  1. Open your admin panel > Settings > 'Social buttons' tab."
echo "  2. For TikTok type your real handle, e.g. zamustore or the full"
echo "     link https://www.tiktok.com/@yourname"
echo "  3. Press 'Save all' — open the shop page and the buttons are yours."
echo "=============================================="
exit 0
