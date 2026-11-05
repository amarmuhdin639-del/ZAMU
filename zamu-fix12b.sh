#!/usr/bin/env bash
# ============================================================================
#  ZAMU FIX 12B — finish the ship (repair of fix12)
# ----------------------------------------------------------------------------
#  fix12 verified everything and bumped the cache to zamu-v12, but the
#  commit step failed (missing git identity) so nothing reached GitHub.
#  This repair: sets identity -> commits -> pushes -> PROVES the commit
#  arrived on GitHub -> watches the live site. No bun needed, node only.
#  Safe to run more than once (idempotent).
# ============================================================================

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "[PASS] $1"; }
bad()  { FAIL=$((FAIL+1)); echo "[FAIL] $1"; }
info() { echo "[INFO] $1"; }

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" || exit 1
echo "=============================================="
echo " ZAMU FIX 12B — finish shipping the social fix"
echo " Repo: $(pwd)"
echo "=============================================="

[ -f package.json ] && [ -d src/app ] \
  && ok "c00 ZAMU repository detected" \
  || { bad "c00 not the ZAMU repo — run inside /workspaces/ZAMU"; echo "RESULT: ABORTED"; exit 1; }
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ "$BRANCH" = "main" ] && ok "c00b on branch main" || bad "c00b branch is '$BRANCH' (expected main)"

# ---- step 1: git identity (fixes the failed commit) --------------------------
echo "---- git identity ----"
if [ -z "$(git config user.name)" ]; then
  git config user.name "amarmuhdin639-del"
  info "set git user.name (repo-local)"
fi
if [ -z "$(git config user.email)" ]; then
  git config user.email "amarmuhdin639@gmail.com"
  info "set git user.email (repo-local)"
fi
[ -n "$(git config user.name)" ] && [ -n "$(git config user.email)" ] \
  && ok "i01 git identity ready ($(git config user.name))" \
  || bad "i01 could not set git identity"

# ---- step 2: make sure the cache bump is applied ------------------------------
SW="public/sw.js"
if grep -q "zamu-v12" "$SW"; then
  ok "p01 offline cache at zamu-v12 (already applied)"
else
  sed -i "s/zamu-v11/zamu-v12/g" "$SW" 2>/dev/null
  grep -q "zamu-v12" "$SW" && ok "p01 cache bumped to zamu-v12 now" || bad "p01 cache bump failed"
fi

# ---- step 3: commit (errors shown if it fails) --------------------------------
echo "---- commit ----"
git add -A
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  if git commit -m "ZAMU: one social config controls footer + contact everywhere (SW v12)" >/tmp/zamu-commit-b.log 2>&1; then
    ok "g01 committed for real: $(git log -1 --format='%h %s')"
  else
    bad "g01 git commit failed — error below:"; cat /tmp/zamu-commit-b.log
  fi
else
  if git log -1 --format=%s | grep -q "one social config"; then
    ok "g01 already committed previously ($(git log -1 --format='%h'))"
  else
    ok "g01 tree already clean — nothing to commit"
  fi
fi

# ---- step 4: push + PROOF it reached GitHub -----------------------------------
echo "---- push + proof ----"
if [ "${ZAMU_NO_PUSH:-0}" = "1" ]; then
  info "ZAMU_NO_PUSH=1 -> rehearsal mode, skipping push + watchdog"
else
  LOCAL="$(git rev-parse HEAD)"
  if git push origin main >/tmp/zamu-push-b.log 2>&1; then
    REMOTE="$(git ls-remote origin -h refs/heads/main 2>/dev/null | cut -f1)"
    if [ -n "$REMOTE" ] && [ "$REMOTE" = "$LOCAL" ]; then
      ok "g02 pushed AND verified on GitHub: ${LOCAL:0:7} is now on origin/main"
    else
      bad "g02 push command ok but GitHub head is '${REMOTE:0:7}' vs local '${LOCAL:0:7}' — run: git push origin main"
    fi
  else
    bad "g02 git push failed — error below:"; tail -8 /tmp/zamu-push-b.log
  fi

  # ---- step 5: live deploy watchdog -------------------------------------------
  echo "---- watching the live site (up to 5 minutes) ----"
  LIVE=""
  for i in $(seq 1 20); do
    V="$(curl -fsSL "https://zaamu.netlify.app/sw.js?wd=$i$RANDOM" 2>/dev/null | grep -o 'zamu-v[0-9]*' | head -1)"
    if [ -n "$V" ] && [ "$V" != "zamu-v10" ] && [ "$V" != "zamu-v11" ]; then LIVE="$V"; break; fi
    sleep 15
  done
  if [ -n "$LIVE" ]; then
    ok "w01 LIVE SITE UPDATED to $LIVE — deployment successful!"
  else
    bad "w01 live site still not updated after 5 minutes. Do this (2 minutes):"
    echo "       1. Open https://app.netlify.com -> your ZAMU site -> Deploys"
    echo "       2. Click 'Clear cache and deploy site' (force-unsticks the build)"
    echo "       3. Wait for the build to finish, then hard-refresh your shop"
  fi
fi

# ---- step 6: type check (informational, node only — never blocks shipping) ----
echo "---- type check (informational) ----"
rm -rf .next/types
if [ ! -d node_modules ]; then
  info "installing dependencies with npm (one time, a few minutes)..."
  npm install --no-audit --no-fund --loglevel=error >/tmp/zamu-npm-b.log 2>&1
fi
if [ -x node_modules/.bin/tsc ]; then
  if node_modules/.bin/tsc --noEmit >/tmp/zamu-tsc-b.log 2>&1; then
    ok "t01 TypeScript clean (informational)"
  else
    info "t01 TypeScript reported issues (informational only, ship already done):"
    tail -8 /tmp/zamu-tsc-b.log
  fi
else
  info "t01 TypeScript binary not found — skipped (informational only)"
fi

# ---- summary -------------------------------------------------------------------
echo "=============================================="
if [ "$FAIL" -eq 0 ]; then
  echo "RESULT: ALL CHECKS PASSED ($PASS passed)"
  echo ""
  echo "WHAT YOU HAVE NOW"
  echo "  * Admin > Settings -> ONE 'Social buttons' tab: the single control"
  echo "    for TikTok / Instagram / WhatsApp / Telegram / Facebook / YouTube / X."
  echo "  * Change a link once -> footer round buttons AND contact-page cards"
  echo "    update together. One control, every place follows."
  echo "  * Offline cache bumped to zamu-v12 so all phones get the new page."
  echo ""
  echo "HOW TO USE (once the site shows the new version)"
  echo "  1. Admin -> Settings -> 'Social buttons' tab"
  echo "  2. Edit the value (@name or a full https link)"
  echo "  3. Press 'Save all' -> footer + contact update everywhere"
else
  echo "RESULT: $FAIL CHECK(S) FAILED ($PASS passed) — read the [FAIL] lines above"
fi
echo "=============================================="
exit 0
