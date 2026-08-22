#!/usr/bin/env node
// @ts-check
/**
 * scripts/i18n-coverage.mjs
 *
 * Reports translation-parity state for site/assets/content/articles.json,
 * using the optional `lang` / `translationOf` fields (see
 * scripts/validate-data.mjs) instead of guessing language or pairing from
 * titles/ids — which is unreliable, since not every same-topic pair is a
 * real translation.
 *
 * This does NOT invent pairings. It only reports:
 *   1. Entries missing a `lang` tag at all (backfill needed before this
 *      report can say anything useful about them)
 *   2. Entries with `lang` set but no `translationOf`, and no other entry
 *      claims them as its translationOf — i.e. no known translation exists
 *      yet, per current data.
 *   3. Confirmed pairs (an entry with translationOf pointing at another
 *      entry's id) — printed as reassurance / a sanity list, not a problem.
 *
 * Run with:   npm run i18n-coverage
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_PATH = resolve(__dirname, '../site/assets/content/articles.json');

/** @typedef {{ id: string, title: string, lang?: string, translationOf?: string }} Article */

/** @param {Article[]} articles */
export function buildCoverageReport(articles) {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const referencedAsTranslation = new Set(
    articles.filter((a) => a.translationOf).map((a) => a.translationOf)
  );

  /** @type {Article[]} */
  const missingLang = [];
  /** @type {{ from: Article, to: Article }[]} */
  const pairs = [];
  /** @type {Article[]} */
  const unpaired = [];

  for (const a of articles) {
    if (!a.lang) {
      missingLang.push(a);
      continue;
    }
    if (a.translationOf) {
      const target = byId.get(a.translationOf);
      if (target) pairs.push({ from: a, to: target });
      continue;
    }
    if (!referencedAsTranslation.has(a.id)) {
      unpaired.push(a);
    }
  }

  return { missingLang, pairs, unpaired };
}

function main() {
  const articles = JSON.parse(readFileSync(ARTICLES_PATH, 'utf-8'));
  const { missingLang, pairs, unpaired } = buildCoverageReport(articles);

  console.log(`Cobertura i18n — ${articles.length} artículos en total\n`);

  if (missingLang.length) {
    console.log(
      `❓  Sin \`lang\` asignado (${missingLang.length}) — no se puede evaluar cobertura hasta rellenar:`
    );
    for (const a of missingLang) console.log(`    - ${a.id}  (${a.title.slice(0, 60)})`);
    console.log('');
  }

  if (pairs.length) {
    console.log(`✅  Pares de traducción confirmados (${pairs.length}):`);
    for (const { from, to } of pairs) {
      console.log(
        `    - ${from.id} [${from.lang}]  →  translationOf: ${to.id} [${to.lang || '?'}]`
      );
    }
    console.log('');
  }

  if (unpaired.length) {
    console.log(`🟡  Con \`lang\` pero sin traducción registrada (${unpaired.length}):`);
    console.log(
      `    (puede ser intencional — ver MIRROR_GROWING.md §5.3 antes de asumir que es un hueco real)`
    );
    for (const a of unpaired) console.log(`    - ${a.id} [${a.lang}]  (${a.title.slice(0, 60)})`);
    console.log('');
  }

  if (!missingLang.length && !unpaired.length) {
    console.log('Todo el contenido con `lang` asignado tiene su traducción registrada. 🎉');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
