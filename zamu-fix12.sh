#!/usr/bin/env bash
# ============================================================================
#  ZAMU FIX 12 — ONE social-media config controls the whole site
# ----------------------------------------------------------------------------
#  What this does:
#   1. Verifies Admin > Settings has exactly ONE social section ("Social
#      buttons" tab) and that the footer + contact page both read that same
#      setting (no duplicate controls anywhere).
#   2. Bumps the offline cache version to zamu-v12 so every phone gets the
#      new settings page (old cached pages self-destruct).
#   3. Commits + pushes to GitHub main  ->  Netlify rebuilds automatically.
#   4. Watches the live site and tells you exactly what to do if Netlify
#      does not switch within ~5 minutes.
#  Safe to run more than once (idempotent).
# ============================================================================

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "[PASS] $1"; }
bad()  { FAIL=$((FAIL+1)); echo "[FAIL] $1"; }
info() { echo "[INFO] $1"; }

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" || exit 1
echo "=============================================="
echo " ZAMU FIX 12 — one social config for everything"
echo " Repo: $(pwd)"
echo "=============================================="

# ---- step 0: right repo -----------------------------------------------------
if [ -f package.json ] && [ -f prisma/schema.prisma ] && [ -d src/app ]; then
  ok "c00 ZAMU repository detected"
else
  bad "c00 This is not the ZAMU repo — run inside /workspaces/ZAMU"
  echo "RESULT: ABORTED (0 environment, $PASS passed, $FAIL failed)"; exit 1
fi
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ "$BRANCH" = "main" ] && ok "c00b on branch main" || bad "c00b branch is '$BRANCH' (expected main)"

SW="public/sw.js"
SE="src/components/admin/settings-editor.tsx"
FT="src/components/store/footer.tsx"
CT="src/app/(storefront)/contact/page.tsx"
SO="src/lib/social.ts"
SD="src/lib/settings-defaults.ts"
I18N="src/lib/i18n-dict.ts"

# ---- step 1: ground checks — the unified system must be in place ------------
echo "---- ground checks: single social configuration ----"

grep -q 'TabsTrigger value="social"' "$SE" \
  && ok "c01 Settings has the single 'Social buttons' tab" \
  || bad "c01 Social buttons tab missing in settings editor"

grep -q 'socialLinks: stringifySocialLinks' "$SE" \
  && ok "c02 Social tab saves into the shared socialLinks setting" \
  || bad "c02 Social tab does not save socialLinks"

if grep -qE "key: 'contact(Tiktok|Instagram|Whatsapp)'" "$SE"; then
  bad "c03 old duplicate social fields still present in settings editor"
else
  ok "c03 no duplicate social controls in settings (old fields removed)"
fi

grep -q 'parseSocialLinks(settings.socialLinks' "$FT" \
  && ok "c04 footer buttons read the shared socialLinks setting" \
  || bad "c04 footer is not connected to socialLinks"

grep -q 'parseSocialLinks(' "$CT" && grep -q 'socialLinks' "$CT" \
  && ok "c05 contact page cards read the shared socialLinks setting" \
  || bad "c05 contact page is not connected to socialLinks"

grep -q 'export function socialHref' "$SO" && grep -q 'SOCIAL_TYPES' "$SO" \
  && ok "c06 shared social library present (single URL builder)" \
  || bad "c06 shared social library missing"

grep -q 'socialLinks:' "$SD" \
  && ok "c07 socialLinks default registered in settings defaults" \
  || bad "c07 socialLinks default missing"

grep -q "'admin.settings.tabSocial'" "$I18N" \
  && ok "c08 social tab labels translated (English + Amharic)" \
  || bad "c08 social tab translations missing"

# ---- step 2: cache bump zamu-v11 -> zamu-v12 --------------------------------
echo "---- cache bump ----"
if grep -q "zamu-v12" "$SW"; then
  ok "p01 cache already at zamu-v12 (previously applied)"
elif grep -q "zamu-v11" "$SW"; then
  sed -i "s/zamu-v11/zamu-v12/g" "$SW"
  grep -q "zamu-v12" "$SW" && ! grep -q "zamu-v11" "$SW" \
    && ok "p01 offline cache bumped zamu-v11 -> zamu-v12" \
    || bad "p01 cache bump failed"
else
  bad "p01 unexpected cache version in $SW (expected zamu-v11)"
fi

# ---- step 3: type safety gate ------------------------------------------------
echo "---- type check ----"
rm -rf .next/types
if [ ! -d node_modules ]; then info "installing dependencies (one time)..."; bun install >/dev/null 2>&1; fi
if bunx tsc --noEmit >/tmp/zamu-tsc12.log 2>&1; then
  ok "t01 TypeScript clean (no type errors)"
else
  bad "t01 TypeScript errors:"; tail -12 /tmp/zamu-tsc12.log
fi

# ---- step 4: commit + push (this also re-triggers the Netlify build) --------
echo "---- ship it ----"
if [ "${ZAMU_NO_PUSH:-0}" = "1" ]; then
  info "ZAMU_NO_PUSH=1 -> rehearsal mode, skipping git push + watchdog"
else
  git add -A >/dev/null 2>&1
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    if git commit -m "$COMMIT_MSG" >/dev/null 2>&1; then
      ok "g01 committed: $COMMIT_MSG"
    else
      bad "g01 git commit failed"
    fi
  else
    if git log -1 --format=%s | grep -q "one social config"; then
      ok "g01 already committed previously (idempotent)"
    else
      ok "g01 nothing to commit (tree clean)"
    fi
  fi
  if git push origin main >/tmp/zamu-push12.log 2>&1; then
    ok "g02 pushed to GitHub main — Netlify build re-triggered"
  else
    bad "g02 git push failed — see /tmp/zamu-push12.log; try: git push origin main"
    tail -5 /tmp/zamu-push12.log
  fi

  # ---- step 5: live deploy watchdog -----------------------------------------
  echo "---- watching the live site (up to 5 minutes) ----"
  LIVE=""
  for i in $(seq 1 20); do
    V="$(curl -fsSL "https://zaamu.netlify.app/sw.js?wd=$i$RANDOM" 2>/dev/null | grep -o 'zamu-v[0-9]*' | head -1)"
    if [ "$V" != "zamu-v10" ] && [ "$V" != "zamu-v11" ] && [ -n "$V" ]; then LIVE="$V"; break; fi
    sleep 15
  done
  if [ -n "$LIVE" ]; then
    ok "w01 LIVE SITE UPDATED to $LIVE — deployment successful!"
  else
    bad "w01 live site still not updated after 5 minutes. Do this (2 minutes):"
    echo "       1. Open https://app.netlify.com -> your ZAMU site -> Deploys"
    echo "       2. If the newest deploy shows FAILING: click 'Clear cache and deploy site'"
    echo "       3. If it shows queued/building: just wait — the build takes a few minutes"
    echo "       4. Then reload your shop with the page fully refreshed"
  fi
fi

# ---- summary -----------------------------------------------------------------
echo "=============================================="
if [ "$FAIL" -eq 0 ]; then
  echo "RESULT: ALL CHECKS PASSED ($PASS passed)"
  echo ""
  echo "WHAT CHANGED FOR YOU"
  echo "  * Admin > Settings has ONE 'Social buttons' tab — the single control"
  echo "    for TikTok / Instagram / WhatsApp / Telegram / Facebook / YouTube / X."
  echo "  * Change a link there once -> the round buttons at the bottom of every"
  echo "    page AND the cards on the Contact page update together. One control,"
  echo "    every place follows. No duplicate settings anywhere."
  echo "  * Offline cache bumped to v12 so all phones pick the new page up."
  echo ""
  echo "HOW TO USE (after Netlify finishes deploying)"
  echo "  1. Open your shop -> Admin -> Settings -> 'Social buttons' tab"
  echo "  2. Edit the value (e.g. @yournewname or a full https link)"
  echo "  3. Press 'Save all'  ->  footer + contact update everywhere"
else
  echo "RESULT: $FAIL CHECK(S) FAILED ($PASS passed) — read the [FAIL] lines above"
fi
echo "=============================================="
exit 0
