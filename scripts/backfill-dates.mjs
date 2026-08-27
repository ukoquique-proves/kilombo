#!/usr/bin/env node
/**
 * scripts/backfill-dates.mjs
 *
 * One-off backfill for the "51% of articles have empty dates" gap
 * (docs/EXTRACTION-GAPS-FIXED.md Gap 2). That fix corrected the date
 * regex in extractTierra() (now extracted as extractTierraDate() in
 * scripts/import-article.mjs) to also match `class="date-article"`, not
 * just `id="date-article"` — but the fix only applies to *future* imports.
 * Every article already in articles.json that was imported before the fix
 * still has date: "" even though the source page has always had a real
 * date, just under the markup variant the old regex didn't match.
 *
 * This script re-runs the *current* (fixed) extractTierraDate() against
 * the locally-scraped source snapshot for every article with an empty
 * date, and fills in the recovered value.
 *
 * Source of truth for the HTML: scraped-full/article-{N}.html, matched
 * against each article's sourceUrl (…?article{N}). This keeps the backfill
 * reproducible offline, consistent with how scripts/import-article.mjs
 * --file already works — no live fetch of kilombo.top required.
 *
 * Recovered dates are normalized to YYYY-MM-DD (required by
 * scripts/validate-data.mjs's ARTICLE_RULES) from the two date formats
 * seen on kilombo.top: Spanish "D de MES de AAAA" and French "D mes AAAA".
 *
 * Articles whose sourceUrl doesn't map to a local scraped-full/ snapshot,
 * or whose snapshot still has no date-article markup at all, are reported
 * as unresolved and left untouched — they need a live re-fetch or manual
 * lookup, not a mechanical backfill.
 *
 * Dry-run by default — prints a summary of what would change and writes
 * nothing. Pass --commit to actually write the file.
 *
 * Usage:
 *   node scripts/backfill-dates.mjs            (dry-run, no changes written)
 *   node scripts/backfill-dates.mjs --commit    (writes articles.json)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTierraDate } from './import-article.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_PATH = resolve(__dirname, '../site/assets/content/articles.json');
const SCRAPED_DIR = resolve(__dirname, '../scraped-full');

const commit = process.argv.includes('--commit');

// ── Date string → YYYY-MM-DD ─────────────────────────────────────────────

const MONTHS_ES = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

const MONTHS_FR = {
  janvier: '01',
  février: '02',
  fevrier: '02',
  mars: '03',
  avril: '04',
  mai: '05',
  juin: '06',
  juillet: '07',
  août: '08',
  aout: '08',
  septembre: '09',
  octobre: '10',
  novembre: '11',
  décembre: '12',
  decembre: '12',
};

/**
 * Normalizes a raw kilombo.top date string into YYYY-MM-DD.
 * Handles Spanish "16 de mayo de 2021" and French "19 mai 2021".
 * @param {string} raw
 * @returns {string|null} ISO date, or null if the format isn't recognized
 */
export function normalizeDate(raw) {
  const s = raw.trim().toLowerCase();

  // Spanish: "D de MES de AAAA" (day may be 1-2 digits, no leading zero in source)
  const es = s.match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/);
  if (es) {
    const [, day, month, year] = es;
    const mm = MONTHS_ES[month];
    if (mm) return `${year}-${mm}-${day.padStart(2, '0')}`;
  }

  // French: "D MOIS AAAA" (no "de")
  const fr = s.match(/^(\d{1,2})\s+([a-zàâéèêëîïôûùç]+)\s+(\d{4})$/);
  if (fr) {
    const [, day, month, year] = fr;
    const mm = MONTHS_FR[month];
    if (mm) return `${year}-${mm}-${day.padStart(2, '0')}`;
  }

  return null;
}

// ── Backfill ──────────────────────────────────────────────────────────────

const articles = JSON.parse(readFileSync(ARTICLES_PATH, 'utf-8'));

const resolved = [];
const unresolved = [];

for (const article of articles) {
  if (article.date && article.date.trim()) continue; // already has a date

  const m = (article.sourceUrl || '').match(/[?&]article(\d+)\b/);
  if (!m) {
    unresolved.push({
      id: article.id,
      reason: `sourceUrl has no ?article{N} — ${article.sourceUrl}`,
    });
    continue;
  }

  const snapshotPath = resolve(SCRAPED_DIR, `article-${m[1]}.html`);
  if (!existsSync(snapshotPath)) {
    unresolved.push({
      id: article.id,
      reason: `no local snapshot at scraped-full/article-${m[1]}.html — needs live re-fetch`,
    });
    continue;
  }

  const html = readFileSync(snapshotPath, 'utf-8');
  const rawDate = extractTierraDate(html);
  if (!rawDate) {
    unresolved.push({
      id: article.id,
      reason: `snapshot found (article-${m[1]}.html) but no date-article markup matched`,
    });
    continue;
  }

  const iso = normalizeDate(rawDate);
  if (!iso) {
    unresolved.push({
      id: article.id,
      reason: `extracted raw date "${rawDate}" (article-${m[1]}.html) but couldn't parse it — unrecognized month/format`,
    });
    continue;
  }

  resolved.push({ id: article.id, rawDate, iso, snapshot: `article-${m[1]}.html` });
}

console.log('============================================================');
console.log(` Date backfill — ${commit ? 'COMMIT MODE' : 'DRY RUN'}`);
console.log('============================================================\n');

if (resolved.length > 0) {
  console.log(`Resolved (${resolved.length}):`);
  for (const r of resolved) {
    console.log(`  • ${r.id}: "${r.rawDate}" (${r.snapshot}) → ${r.iso}`);
  }
}

if (unresolved.length > 0) {
  console.log(`\nUnresolved — left untouched, needs manual/live follow-up (${unresolved.length}):`);
  for (const u of unresolved) {
    console.log(`  • ${u.id}: ${u.reason}`);
  }
}

if (resolved.length === 0) {
  console.log('\nNothing to backfill.');
  process.exit(0);
}

if (!commit) {
  console.log(
    `\n${resolved.length} date(s) would be filled in, ${unresolved.length} left unresolved.`
  );
  console.log('--dry-run: no changes written. Re-run with --commit to apply.');
  process.exit(0);
}

for (const r of resolved) {
  const article = articles.find((a) => a.id === r.id);
  article.date = r.iso;
}

writeFileSync(ARTICLES_PATH, JSON.stringify(articles, null, 2) + '\n');
console.log(`\n✅  Wrote ${resolved.length} recovered date(s) to ${ARTICLES_PATH}`);
if (unresolved.length > 0) {
  console.log(`⚠️  ${unresolved.length} article(s) still have no date — see "Unresolved" above.`);
}
console.log("    Run 'npm test' before committing.");
