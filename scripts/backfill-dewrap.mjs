#!/usr/bin/env node
/**
 * scripts/backfill-dewrap.mjs
 *
 * One-off backfill (TO_FIX #46, subitem B): applies dewrapHardBreaks() to
 * every article already in site/assets/content/articles.json whose
 * contentHtml still has the old hard-wrapped <br> formatting — content
 * imported before dewrapHardBreaks() was wired into import-article.mjs
 * (see scripts/import-article.mjs step 3.5).
 *
 * Targets entries where status === "imported" and contentHtml has >= 3
 * <br> tags (same threshold dewrap.mjs itself uses to decide whether a
 * <p> has enough signal to be worth restructuring — see MIN_BR_COUNT in
 * site/js/shared/dewrap.mjs). Entries below that threshold are left
 * completely untouched, matching dewrap.mjs's own no-op behavior for
 * "too little signal to safely restructure" content.
 *
 * Dry-run by default — prints a diff-style summary of what would change
 * and writes nothing. Pass --commit to actually write the file.
 *
 * Usage:
 *   node scripts/backfill-dewrap.mjs            (dry-run, no changes written)
 *   node scripts/backfill-dewrap.mjs --commit    (writes articles.json)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dewrapHardBreaks } from '../site/js/shared/dewrap.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_PATH = resolve(__dirname, '../site/assets/content/articles.json');
const MIN_BR_COUNT = 3;

const commit = process.argv.includes('--commit');

const countBr = (html) => (html.match(/<br\s*\/?>/gi) || []).length;
const countParagraphs = (html) => (html.match(/<p>/gi) || []).length;

const articles = JSON.parse(readFileSync(ARTICLES_PATH, 'utf-8'));

const changes = [];

for (const article of articles) {
  if (article.status !== 'imported') continue;

  const before = article.contentHtml;
  const brBefore = countBr(before);
  if (brBefore < MIN_BR_COUNT) continue;

  const after = dewrapHardBreaks(before);
  if (after === before) continue; // dewrap.mjs found nothing to restructure

  changes.push({
    id: article.id,
    brBefore,
    brAfter: countBr(after),
    paragraphsBefore: countParagraphs(before),
    paragraphsAfter: countParagraphs(after),
    charsBefore: before.length,
    charsAfter: after.length,
    after,
  });
}

console.log('============================================================');
console.log(` Dewrap backfill — ${commit ? 'COMMIT MODE' : 'DRY RUN'}`);
console.log('============================================================\n');

if (changes.length === 0) {
  console.log('No imported articles with hard-wrapped formatting found. Nothing to do.');
  process.exit(0);
}

for (const c of changes) {
  console.log(`• ${c.id}`);
  console.log(`    <br> count:   ${c.brBefore} → ${c.brAfter}`);
  console.log(`    <p> count:    ${c.paragraphsBefore} → ${c.paragraphsAfter}`);
  console.log(`    chars:        ${c.charsBefore} → ${c.charsAfter}`);
}

console.log(`\n${changes.length} article(s) would be reformatted.`);

if (!commit) {
  console.log('\n--dry-run: no changes written. Re-run with --commit to apply.');
  process.exit(0);
}

const stamp = new Date().toISOString();
for (const c of changes) {
  const article = articles.find((a) => a.id === c.id);
  article.contentHtml = c.after;
  article._lastDewrapped = stamp;
}

writeFileSync(ARTICLES_PATH, JSON.stringify(articles, null, 2) + '\n');
console.log(`\n✅  Wrote ${changes.length} reformatted article(s) to ${ARTICLES_PATH}`);
console.log("    Run 'npm test' before committing.");
