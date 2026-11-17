#!/usr/bin/env bash
# Regenerate content, lower baselines, run the audit tests, and commit + push
# ONLY if everything passes.  Usage: scripts/content-audit/finish.sh "commit message"
set -euo pipefail
cd "$(dirname "$0")/../.."
node scripts/export-content.mjs | tail -1
node scripts/content-audit/rebaseline.mjs >/dev/null
node ./node_modules/vitest/vitest.mjs run scripts/ --testTimeout=60000 2>&1 | tee /tmp/audit-test.log | grep -E "Tests " 
if grep -q "failed" /tmp/audit-test.log; then echo "TESTS FAILED - not committing"; exit 1; fi
node ./node_modules/eslint/bin/eslint.js scripts/content-audit --quiet
git add -A docs/audit src backend/data/content.json scripts/content-audit avatar-scripts
git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q
git log --oneline -1
node scripts/content-audit/scorecard.mjs | tail -1
