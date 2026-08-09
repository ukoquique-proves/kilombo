#!/usr/bin/env node
/**
 * scripts/check-urls.mjs
 *
 * Validates that the Kilombo network URLs declared in three sources are
 * consistent with the single source of truth:
 *
 *   Ground truth: site/assets/network-urls.json
 *
 *   Sources validated against it:
 *     1. .env.example        (KILOMBO_SITE_* variables)
 *     2. site/index.html     (the <!-- CONFIG … --> comment block)
 *     3. README.md           (the "Sitios reales de la red Kilombo" table)
 *
 * Any URL in network-urls.json that is missing from any of the three sources
 * is reported as a discrepancy. This replaces the old "cross-compare three
 * free sources" model with a "validate against a declared ground truth" model,
 * eliminating the drift-detection blindspot described in TO_FIX #44.
 *
 * Run with:   node scripts/check-urls.mjs
 * Or via:     ./scripts/test.sh
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ================================================================
// Load ground truth
// ================================================================

let networkUrls;
try {
  const raw = readFileSync(resolve(ROOT, 'site/assets/network-urls.json'), 'utf8');
  const parsed = JSON.parse(raw);
  // Collect all string values, normalise (strip trailing slash), skip _comment
  networkUrls = Object.entries(parsed)
    .filter(([k]) => !k.startsWith('_'))
    .map(([, v]) => String(v).replace(/\/+$/, ''));
} catch (e) {
  console.error(`❌  Could not read network-urls.json: ${e.message}`);
  process.exit(1);
}

// ================================================================
// Helpers
// ================================================================

/**
 * Extract all https?:// kilombo.top URLs from a string.
 * Returns a Set of normalised URLs (trailing slash stripped).
 * @param {string} text
 * @returns {Set<string>}
 */
const extractNetworkUrls = (text) => {
  const matches = text.match(/https?:\/\/[^\s"'<>)]+/g) || [];
  return new Set(
    matches
      .map((u) => u
        .replace(/[`)\].,;:]+$/, '')
        .replace(/\/+$/, '')
      )
      .filter((u) => {
        if (!u.includes('kilombo.top')) return false;
        try { new URL(u); return true; }
        catch { return false; }
      })
  );
};

// ================================================================
// Read sources
// ================================================================

const sources = {
  '.env.example': '.env.example',
  'index.html':   'site/index.html',
  'README.md':    'README.md',
};

/** @type {Record<string, Set<string>>} */
const urlSets = {};

for (const [label, relativePath] of Object.entries(sources)) {
  try {
    const text = readFileSync(resolve(ROOT, relativePath), 'utf8');
    urlSets[label] = extractNetworkUrls(text);
  } catch (e) {
    console.error(`❌  Could not read ${relativePath}: ${e.message}`);
    process.exit(1);
  }
}

// ================================================================
// Validate each ground-truth URL against all three sources
// ================================================================

let hasDiscrepancy = false;

console.log('Kilombo network URL consistency check');
console.log('======================================');
console.log(`Ground truth: site/assets/network-urls.json (${networkUrls.length} URLs)`);
console.log(`Sources checked: ${Object.keys(sources).join(', ')}`);
console.log('');

const labels = Object.keys(urlSets);
const colWidth = 18;
const header = 'URL'.padEnd(50) + labels.map((l) => l.padEnd(colWidth)).join('');
console.log(header);
console.log('-'.repeat(header.length));

for (const url of networkUrls) {
  const presence = labels.map((l) => (urlSets[l].has(url) ? '✅ ' : '❌ ').padEnd(colWidth));
  const missing = labels.filter((l) => !urlSets[l].has(url));
  const line = url.padEnd(50) + presence.join('');
  console.log(line);
  if (missing.length > 0) {
    console.log(`    ↳ missing in: ${missing.join(', ')}`);
    hasDiscrepancy = true;
  }
}

console.log('');

if (hasDiscrepancy) {
  console.error('⚠️   URL discrepancies found — update the flagged sources to match network-urls.json.');
  console.error('    See TO_FIX.md #44 for context.');
  process.exit(1);
} else {
  console.log('✅  All network URLs are consistent across sources.');
  process.exit(0);
}
