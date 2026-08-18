/**
 * test/backfill-dates.test.mjs
 *
 * Unit tests for scripts/backfill-dates.mjs's date-string normalizer.
 * Run with: node --test test/backfill-dates.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDate } from '../scripts/backfill-dates.mjs';

test('normalizeDate parses Spanish "D de MES de AAAA"', () => {
  assert.equal(normalizeDate('16 de mayo de 2021'), '2021-05-16');
  assert.equal(normalizeDate('8 de junio de 2021'), '2021-06-08');
  assert.equal(normalizeDate('4 de septiembre de 2021'), '2021-09-04');
});

test('normalizeDate pads single-digit days', () => {
  assert.equal(normalizeDate('2 de agosto de 2024'), '2024-08-02');
});

test('normalizeDate parses French "D mois AAAA" (no "de")', () => {
  assert.equal(normalizeDate('19 mai 2021'), '2021-05-19');
});

test('normalizeDate is case-insensitive', () => {
  assert.equal(normalizeDate('16 DE MAYO DE 2021'), '2021-05-16');
});

test('normalizeDate returns null for unrecognized formats', () => {
  assert.equal(normalizeDate('2021-05-16'), null);
  assert.equal(normalizeDate('not a date'), null);
  assert.equal(normalizeDate(''), null);
});

test('normalizeDate output always matches the YYYY-MM-DD shape required by validate-data.mjs', () => {
  const iso = normalizeDate('27 de febrero de 2023');
  assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
});
