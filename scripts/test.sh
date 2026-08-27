#!/bin/bash
# =========================================================
# scripts/test.sh
# =========================================================
# Single entry point for the project's checks. Runs, in order:
#   1. Unit tests — all test/*.test.mjs files (10 files, 172 tests)
#   2. JSON data validation for site/assets/data/*.json and site/assets/content/*.json
#   3. Cross-file URL consistency check (.env.example / index.html / README.md)
#   4. Index cards check — ensures all index.html cards have Level 1/2 badges
#   5. docs/PENDING-REVIEW.md freshness — must match what articles.json would
#      generate (docs/PENDING-REVIEW.md is generated, never hand-edited; see
#      scripts/list-pending-review.mjs)
#
# Stops at the first failure (set -e) so a broken step is obvious
# instead of getting buried under later output.
#
# USO:
#   chmod +x scripts/test.sh   (solo la primera vez)
#   npm test                   (o directamente: ./scripts/test.sh)
# =========================================================

set -e

HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "${HERE}"

echo "============================================================"
echo " 1/5  Unit tests — all test/*.test.mjs files"
echo "============================================================"
# Scoped to test/*.test.mjs on purpose: a bare `node --test` uses Node's
# default discovery glob, which also matches any file named `test-*.mjs`
# or `*-test.mjs` anywhere in the repo — including scripts/test-spip-access.mjs,
# scripts/test-spip-privilege-tiers.mjs and scripts/test-spip-access.mjs (successors to a since-removed sandbox/test-admin-plugin-access.mjs).
# Those are live scripts that hit the real SPIP backend and require a
# populated .env, so an unscoped `node --test` fails on any machine/CI run
# without those credentials, even though the actual unit tests all pass.
node --test test/*.test.mjs

echo ""
echo "============================================================"
echo " 2/5  Data validation — scripts/validate-data.mjs"
echo "============================================================"
node scripts/validate-data.mjs

echo ""
echo "============================================================"
echo " 3/5  URL consistency — scripts/check-urls.mjs"
echo "============================================================"
node scripts/check-urls.mjs

echo ""
echo "============================================================"
echo " 4/5  Index cards badges — scripts/check-badges.mjs"
echo "============================================================"
node scripts/check-badges.mjs

echo ""
echo "============================================================"
echo " 5/5  PENDING-REVIEW.md freshness — scripts/list-pending-review.mjs --check"
echo "============================================================"
node scripts/list-pending-review.mjs --check

echo ""
echo "✅  All checks passed."
