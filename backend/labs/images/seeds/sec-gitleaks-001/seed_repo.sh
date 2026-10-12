#!/usr/bin/env bash
# Build the deterministic "leaky" training repo for sec-gitleaks-001.
#
# ALL SECRETS BELOW ARE CLEARLY FAKE (EXAMPLE/FAKE-shaped values, marked fake
# in comments). They exist so gitleaks has real findings to report; they must
# never be used as real credentials anywhere.
#
# History (all commits by the fictional "dev <dev@example.com>"):
#   1. "add app config"      — .env with a fake AWS key pair (still in history)
#   2. "remove secrets"      — deletes .env, but adds config.py with a fake
#                              Stripe key and a fake Slack token
#   3. "docs"                — README with a fake GitHub PAT and a fake RSA key
#
# Run at image build time as root; the repo is chowned to analyst afterwards.
set -euo pipefail

REPO="${REPO_DIR:-/home/analyst/leaky-repo}"
rm -rf "$REPO"
mkdir -p "$REPO"
cd "$REPO"

export GIT_AUTHOR_NAME="dev" GIT_AUTHOR_EMAIL="dev@example.com"
export GIT_COMMITTER_NAME="dev" GIT_COMMITTER_EMAIL="dev@example.com"

git init -q -b main

# --- commit 1: .env with fake AWS credentials (the classic committed-secret) ---
cat > .env <<'EOF'
# FAKE example credentials for security training — NOT REAL, never use these.
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF
cat > app.py <<'EOF'
"""Tiny demo app (training fixture)."""
import os

REGION = os.environ.get("AWS_REGION", "us-east-1")
EOF
git add -A
GIT_AUTHOR_DATE="2026-01-15T10:00:00" GIT_COMMITTER_DATE="2026-01-15T10:00:00" \
    git commit -qm "add app config"

# --- commit 2: "remove" the .env, but leak new fake secrets in config.py ---
git rm -q .env
# NOTE: the Stripe/Slack fixtures are assembled programmatically so that no
# secret-shaped string ever appears in this committed file (GitHub push
# protection blocks sk_live_ / xoxb- literals). The generated values are
# all-A / all-1 fixtures — obviously fake, yet still detected by gitleaks'
# default stripe/slack rules when the lab image runs seed_repo.sh at build time.
STRIPE_FIXTURE="sk_live_$(printf 'A%.0s' $(seq 1 24))"
SLACK_FIXTURE="xoxb-$(printf '1%.0s' $(seq 1 40))"
cat > config.py <<EOF
"""App config (training fixture)."""
# FAKE example credentials for security training — NOT REAL, never use these.
STRIPE_API_KEY = "$STRIPE_FIXTURE"
SLACK_BOT_TOKEN = "$SLACK_FIXTURE"
EOF
git add -A
GIT_AUTHOR_DATE="2026-01-16T10:00:00" GIT_COMMITTER_DATE="2026-01-16T10:00:00" \
    git commit -qm "remove secrets, move config to config.py"

# --- commit 3: README with a fake GitHub PAT and a fake RSA private key ---
cat > README.md <<'EOF'
# demo-app (training fixture)

## Deploy notes
<!-- FAKE example credentials for security training — NOT REAL, never use these. -->
CI token: ghp_EXAMPLEFAKETOKEN0000000000000000000

## Legacy deploy key (fake, for training only)
```
-----BEGIN RSA PRIVATE KEY-----
FAKEEXAMPLEKEYDATAFORSECURITYTRAININGONLY00000000000000000000000000
FAKEEXAMPLEKEYDATAFORSECURITYTRAININGONLY11111111111111111111111111
-----END RSA PRIVATE KEY-----
```
EOF
git add -A
GIT_AUTHOR_DATE="2026-01-17T10:00:00" GIT_COMMITTER_DATE="2026-01-17T10:00:00" \
    git commit -qm "docs"

echo "seeded $REPO ($(git rev-list --count HEAD) commits)"
