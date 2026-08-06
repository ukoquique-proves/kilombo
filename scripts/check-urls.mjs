#!/usr/bin/env node
/**
 * scripts/check-urls.mjs
 *
 * Checks that the Kilombo network URLs are consistent across the three
 * places they are declared:
 *   1. .env.example  (KILOMBO_SITE_* and FRIEND_* variables)
 *   2. site/index.html  (the <!-- CONFIG … --> comment block)
 *   3. README.md  (the "Sitios reales de la red Kilombo" table)
 *
 * Exits with code 1 and prints a diff-style report if any URL appears in
 * one source but not another. Helps catch the common drift problem of
 * updating one place and forgetting the others.
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
// Helpers
// ================================================================

/**
 * Extract all https?:// URLs from a string.
 * Returns a Set of normalised URLs (trailing slash stripped for comparison).
 * @param {string} text
 * @returns {Set<string>}
 */
const extractUrls = (text) => {
  const matches = text.match(/https?:\/\/[^\s"'<>)]+/g) || [];
  return new Set(
    matches
      .map((u) => u
        .replace(/[`)\].,;:]+$/, '')  // strip trailing markdown/punctuation chars
        .replace(/\/+$/, '')           // strip trailing slash
      )
      .filter((u) => {
        try { new URL(u); return true; }
        catch { return false; }
      })
  );
};

/**
 * Filter a URL set to only kilombo.top network URLs.
 * Canal7 and other allied/friend sources are intentionally excluded —
 * they don't need to appear in the index.html config block.
 * @param {Set<string>} urls
 * @returns {Set<string>}
 */
const filterNetworkUrls = (urls) => {
  return new Set(
    [...urls].filter((u) => u.includes('kilombo.top'))
  );
};

// ================================================================
// Read sources
// ================================================================

const sources = {
  '.env.example':    '.env.example',
  'index.html':      'site/index.html',
  'README.md':       'README.md',
};

/** @type {Record<string, Set<string>>} */
const urlSets = {};

for (const [label, relativePath] of Object.entries(sources)) {
  try {
    const text = readFileSync(resolve(ROOT, relativePath), 'utf8');
    urlSets[label] = filterNetworkUrls(extractUrls(text));
  } catch (e) {
    console.error(`❌  Could not read ${relativePath}: ${e.message}`);
    process.exit(1);
  }
}

// ================================================================
// Build union and find discrepancies
// ================================================================

const allUrls = new Set([...Object.values(urlSets)].flatMap((s) => [...s]));

let hasDiscrepancy = false;

console.log('Kilombo network URL consistency check');
console.log('======================================');
console.log(`Sources checked: ${Object.keys(sources).join(', ')}`);
console.log('');

// Print presence matrix
const labels = Object.keys(urlSets);
const colWidth = 18;
const header = 'URL'.padEnd(50) + labels.map((l) => l.padEnd(colWidth)).join('');
console.log(header);
console.log('-'.repeat(header.length));

const sortedUrls = [...allUrls].sort();
for (const url of sortedUrls) {
  const presence = labels.map((l) => (urlSets[l].has(url) ? '✅' : '❌').padEnd(colWidth));
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
  console.error('⚠️   URL discrepancies found. Update the missing sources to match.');
  console.error('    See TO_FIX.md item A-2 for background.');
  process.exit(1);
} else {
  console.log('✅  All network URLs are consistent across sources.');
  process.exit(0);
}
