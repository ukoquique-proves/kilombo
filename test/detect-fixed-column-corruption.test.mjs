/**
 * test/detect-fixed-column-corruption.test.mjs
 *
 * Regression coverage for scripts/detect-fixed-column-corruption.mjs.
 *
 * The original detectFixedColumnCorruption() matched <p> content against
 * /<p>([^<]*\\n[^<]*)<\/p>/g — a regex that looks for the two literal
 * characters "\\" + "n" in the string. But after JSON.parse(), a JSON \n
 * escape decodes to an actual newline character (charCode 10) in the JS
 * string, not the two-character sequence "\n". So the detector never
 * matched any real corrupted content and always reported "0 articles
 * affected", even when run directly against the two articles TO_FIX.md
 * #54 documents as having exactly this corruption.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFixedColumnCorruption, repairFixedColumnCorruption } from '../scripts/detect-fixed-column-corruption.mjs';

// Mirrors the real-world pattern from TO_FIX.md #54: text copy-pasted from
// a fixed-width source (PDF, 80-column terminal, etc.), wrapped with a
// literal newline roughly every 60-70 characters — including mid-word.
const hardWrappedHtml =
  '<p>la ignorancia por los esfuerzos sistematicos de todos los\n' +
  'gobiernos que consideran esta ignorancia como necesaria para su\n' +
  'dominio y control social sobre las masas populares oprimidas y\n' +
  'explotadas en todo el mundo capitalista contemporaneo donde el\n' +
  'poder economico domina las relaciones sociales de produccion</p>';

test('detectFixedColumnCorruption finds a real embedded-newline hard-wrap', () => {
  const result = detectFixedColumnCorruption(hardWrappedHtml);
  assert.equal(result.found, true, 'must detect embedded real newlines, not just literal backslash-n text');
  assert.equal(result.lineCount, 5);
});

test('detectFixedColumnCorruption does not false-positive on clean, unwrapped content', () => {
  const clean = '<p>Este es un párrafo normal, sin saltos de línea embebidos, de longitud razonable para una prueba unitaria.</p>';
  const result = detectFixedColumnCorruption(clean);
  assert.equal(result.found, false);
});

test('detectFixedColumnCorruption ignores the literal two-character sequence backslash+n (not a real newline)', () => {
  // A string that contains the literal characters \ and n, but no actual
  // newline — this must NOT be treated as corruption.
  const literalBackslashN = '<p>texto con la secuencia literal \\n+n que no es un salto de linea real en absoluto.</p>';
  const result = detectFixedColumnCorruption(literalBackslashN);
  assert.equal(result.found, false);
});

test('repairFixedColumnCorruption joins hard-wrapped lines back into flowing text', () => {
  const repaired = repairFixedColumnCorruption(hardWrappedHtml);
  assert.ok(!repaired.includes('\n'), 'repaired HTML must not contain embedded newlines');
  assert.ok(repaired.includes('gobiernos que consideran'), 'text content must be preserved');
});
