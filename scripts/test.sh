#!/bin/bash
# =========================================================
# scripts/test.sh
# =========================================================
# Single entry point for the project's checks. Runs, in order:
#   1. Unit tests — all test/*.test.mjs files (9 files, 157 tests)
#   2. JSON data validation for site/assets/data/*.json and site/assets/content/*.json
#   3. Cross-file URL consistency check (.env.example / index.html / README.md)
#   4. Index cards check — ensures all index.html cards have Level 1/2 badges
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
echo " 1/4  Unit tests — all test/*.test.mjs files"
echo "============================================================"
node --test

echo ""
echo "============================================================"
echo " 2/4  Data validation — scripts/validate-data.mjs"
echo "============================================================"
node scripts/validate-data.mjs

echo ""
echo "============================================================"
echo " 3/4  URL consistency — scripts/check-urls.mjs"
echo "============================================================"
node scripts/check-urls.mjs

echo ""
echo "============================================================"
echo " 4/4  Index cards badges — scripts/check-badges.mjs"
echo "============================================================"
node scripts/check-badges.mjs

echo ""
echo "✅  All checks passed."
