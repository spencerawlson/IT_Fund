#!/usr/bin/env sh
# Push the current code to Vercel PRODUCTION and switch the AI tutor on.
#
# Why this exists: production (it-fund.vercel.app) sat 14 commits behind while
# the main-branch alias built fine, and OPENAI_API_KEY was never set in Vercel.
# The tutor UI hides itself whenever GET /api/ai/status is not {enabled:true},
# so both the deploy AND the key are required before it appears.
#
# Usage:  sh scripts/deploy-prod.sh
# Run `vercel login` first if you are not logged in (it needs a browser).
set -e
cd "$(dirname "$0")/.."

PROD_URL="https://it-fund.vercel.app"

if [ ! -f backend/.env ]; then
  echo "FAIL: backend/.env not found; nowhere to read OPENAI_API_KEY from." >&2
  exit 1
fi

# Read the key without ever printing it. Strips surrounding quotes and CRLF.
KEY=$(sed -n 's/^OPENAI_API_KEY=//p' backend/.env | head -1 | tr -d '\r\n' | sed 's/^"//;s/"$//;s/^'\''//;s/'\''$//')
if [ -z "$KEY" ]; then
  echo "FAIL: OPENAI_API_KEY is empty in backend/.env." >&2
  exit 1
fi
echo "Found OPENAI_API_KEY in backend/.env (${#KEY} chars, value not shown)."

# 1. Attach the key to the production environment.
#    `env add` fails if the var already exists, so clear it first; both are
#    allowed to fail harmlessly if it was never set.
echo "==> Setting OPENAI_API_KEY for production"
printf '%s' "y" | vercel env rm OPENAI_API_KEY production >/dev/null 2>&1 || true
printf '%s' "$KEY" | vercel env add OPENAI_API_KEY production

# 2. Deploy straight to production. This bypasses the Production Branch
#    setting, which is why pushes to main were stranding as previews.
echo "==> Deploying to production"
vercel --prod

# 3. Verify the tutor is actually reachable and enabled.
echo "==> Verifying $PROD_URL/api/ai/status"
sleep 5
STATUS=$(curl -s -m 30 "$PROD_URL/api/ai/status" || true)
echo "    $STATUS"
case "$STATUS" in
  *'"enabled":true'*)
    echo "OK: AI tutor is live in production." ;;
  *'"enabled":false'*)
    echo "PARTIAL: deployed, but the key did not attach to production." >&2
    echo "         Check Vercel > Settings > Environment Variables." >&2
    exit 1 ;;
  *)
    echo "FAIL: unexpected response. Production may still be the stale deploy." >&2
    exit 1 ;;
esac
