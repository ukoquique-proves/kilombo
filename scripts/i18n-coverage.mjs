#!/usr/bin/env node
// @ts-check
/**
 * scripts/i18n-coverage.mjs
 *
 * Reports translation-parity state for site/assets/content/articles.json,
 * using the actual documented schema fields — `language` and
 * `relatedArticles` (see site/assets/content/ARTICLES.schema.md and
 * scripts/lib/article-validator.mjs) — instead of guessing language or
 * pairing from titles/ids, which is unreliable since not every
 * same-topic pair is a real translation.
 *
 * CORRECTED (2026-08-30, TO_FIX #38): the original version of this script
 * read `lang` / `translationOf`, fields that were never part of the real
 * schema (the schema uses `language` and `relatedArticles` — confirmed
 * against ARTICLES.schema.md and article-validator.mjs). As a result it
 * reported 100% of entries as "missing lang" regardless of actual data —
 * not a real coverage report, just constant noise. This version reads the
 * real fields, so its output reflects what's actually in the data.
 *
 * This does NOT invent pairings. It only reports:
 *   1. Entries missing a `language` tag at all (can't evaluate coverage
 *      for these until backfilled — this is expected to be most of the
 *      catalog today; language tagging has not been a backfill priority).
 *   2. Entries with `language` set but no `relatedArticles` link to an
 *      entry in a *different* language — i.e. no known translation
 *      exists yet, per current data.
 *   3. Confirmed cross-language pairs (two entries with different
 *      `language` values that reference each other via
 *      `relatedArticles`) — printed as reassurance, not a problem.
 *
 * A `relatedArticles` link between two entries of the SAME language (e.g.
 * two Spanish variants of one piece, per ARTICLES.schema.md's "variant
 * versions of the same content" use) is not a translation pair and is not
 * reported as one.
 *
 * Run with:   npm run i18n-coverage
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_PATH = resolve(__dirname, '../site/assets/content/articles.json');

/** @typedef {{ id: string, title: string, language?: string, relatedArticles?: string[] }} Article */

/** @param {Article[]} articles */
export function buildCoverageReport(articles) {
  const byId = new Map(articles.map((a) => [a.id, a]));

  /** @type {Article[]} */
  const missingLanguage = [];
  /** @type {{ from: Article, to: Article }[]} */
  const pairs = [];
  /** @type {Article[]} */
  const unpaired = [];

  // Track which (id) pairs we've already reported, so a mutual
  // relatedArticles link (A -> B and B -> A) is only listed once.
  const reportedPairKeys = new Set();

  for (const a of articles) {
    if (!a.language) {
      missingLanguage.push(a);
      continue;
    }

    const related = (a.relatedArticles || [])
      .map((id) => byId.get(id))
      .filter((target) => target && target.language && target.language !== a.language);

    if (related.length > 0) {
      for (const target of related) {
        const key = [a.id, target.id].sort().join('::');
        if (reportedPairKeys.has(key)) continue;
        reportedPairKeys.add(key);
        pairs.push({ from: a, to: target });
      }
      continue;
    }

    unpaired.push(a);
  }

  return { missingLanguage, pairs, unpaired };
}

function main() {
  const articles = JSON.parse(readFileSync(ARTICLES_PATH, 'utf-8'));
  const { missingLanguage, pairs, unpaired } = buildCoverageReport(articles);

  console.log(`Cobertura i18n — ${articles.length} artículos en total\n`);

  if (missingLanguage.length) {
    console.log(
      `❓  Sin \`language\` asignado (${missingLanguage.length}) — no se puede evaluar cobertura hasta rellenar:`
    );
    for (const a of missingLanguage) console.log(`    - ${a.id}  (${a.title.slice(0, 60)})`);
    console.log('');
  }

  if (pairs.length) {
    console.log(`✅  Pares de traducción confirmados vía relatedArticles (${pairs.length}):`);
    for (const { from, to } of pairs) {
      console.log(`    - ${from.id} [${from.language}]  ↔  ${to.id} [${to.language}]`);
    }
    console.log('');
  }

  if (unpaired.length) {
    console.log(`🟡  Con \`language\` pero sin traducción registrada (${unpaired.length}):`);
    console.log(
      `    (puede ser intencional — ver MIRROR_GROWING.md §5.3 antes de asumir que es un hueco real)`
    );
    for (const a of unpaired)
      console.log(`    - ${a.id} [${a.language}]  (${a.title.slice(0, 60)})`);
    console.log('');
  }

  if (!missingLanguage.length && !unpaired.length) {
    console.log('Todo el contenido con `language` asignado tiene su traducción registrada. 🎉');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
