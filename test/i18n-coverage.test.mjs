/**
 * test/i18n-coverage.test.mjs
 *
 * Unit tests for scripts/i18n-coverage.mjs's buildCoverageReport().
 *
 * These exist because the original version of this script read `lang` /
 * `translationOf` — fields that were never part of the real schema (see
 * site/assets/content/ARTICLES.schema.md, which documents `language` and
 * `relatedArticles`). That mismatch meant the script silently reported
 * 100% of entries as "missing lang" regardless of actual data, for every
 * dataset, forever — a report that always looked the same whether or not
 * anything was wrong. The fixture below has a mix of tagged/untagged and
 * paired/unpaired entries specifically so a regression back to the wrong
 * field names shows up as a wrong pair/unpaired count, not as silence.
 *
 * Run with: node --test test/i18n-coverage.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoverageReport } from '../scripts/i18n-coverage.mjs';

test('buildCoverageReport flags entries with no `language` field', () => {
  const articles = [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B', language: 'ES' },
  ];
  const { missingLanguage } = buildCoverageReport(articles);
  assert.equal(missingLanguage.length, 1);
  assert.equal(missingLanguage[0].id, 'a');
});

test('buildCoverageReport pairs entries linked via relatedArticles with different language', () => {
  const articles = [
    { id: 'es-1', title: 'ES version', language: 'ES', relatedArticles: ['fr-1'] },
    { id: 'fr-1', title: 'FR version', language: 'FR', relatedArticles: ['es-1'] },
  ];
  const { pairs, unpaired } = buildCoverageReport(articles);
  assert.equal(pairs.length, 1);
  assert.equal(unpaired.length, 0);
  const ids = [pairs[0].from.id, pairs[0].to.id].sort();
  assert.deepEqual(ids, ['es-1', 'fr-1']);
});

test('buildCoverageReport does not double-report a mutual relatedArticles link', () => {
  const articles = [
    { id: 'es-1', title: 'ES version', language: 'ES', relatedArticles: ['fr-1'] },
    { id: 'fr-1', title: 'FR version', language: 'FR', relatedArticles: ['es-1'] },
  ];
  const { pairs } = buildCoverageReport(articles);
  assert.equal(pairs.length, 1, 'mutual A<->B link should count as one pair, not two');
});

test('buildCoverageReport does NOT treat a same-language relatedArticles link as a translation pair', () => {
  // Per ARTICLES.schema.md, relatedArticles is also used for same-language
  // content variants (e.g. two Spanish cuts of one piece) — those are not
  // translations and must not be reported as covered.
  const articles = [
    { id: 'variant-a', title: 'Variant A', language: 'ES', relatedArticles: ['variant-b'] },
    { id: 'variant-b', title: 'Variant B', language: 'ES', relatedArticles: ['variant-a'] },
  ];
  const { pairs, unpaired } = buildCoverageReport(articles);
  assert.equal(pairs.length, 0);
  assert.equal(unpaired.length, 2);
});

test('buildCoverageReport flags a tagged entry with no cross-language relatedArticles as unpaired', () => {
  const articles = [{ id: 'solo', title: 'Solo piece', language: 'ES' }];
  const { unpaired, missingLanguage, pairs } = buildCoverageReport(articles);
  assert.equal(unpaired.length, 1);
  assert.equal(unpaired[0].id, 'solo');
  assert.equal(missingLanguage.length, 0);
  assert.equal(pairs.length, 0);
});

test('buildCoverageReport ignores a relatedArticles id that does not resolve to a known entry', () => {
  const articles = [
    { id: 'dangling', title: 'Dangling ref', language: 'ES', relatedArticles: ['does-not-exist'] },
  ];
  const { unpaired, pairs } = buildCoverageReport(articles);
  assert.equal(pairs.length, 0);
  assert.equal(unpaired.length, 1, 'a dangling relatedArticles id should not crash or silently pair');
});
