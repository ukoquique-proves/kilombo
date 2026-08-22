/**
 * test/dewrap.test.mjs
 *
 * Unit tests for site/js/shared/dewrap.mjs.
 * Run with: node --test test/dewrap.test.mjs
 *
 * Fixtures A and B are trimmed excerpts of real content already in
 * site/assets/content/articles.json (represion-plandemica-1 and
 * plandemismo-y-domesticacion-11 respectively) — the two article
 * patterns that motivated this module. See dewrap.mjs's doc comment.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasEnoughBreaksToAnalyze,
  splitAtSentenceBoundaries,
  dewrapHardBreaks,
} from '../site/js/shared/dewrap.mjs';

const stripTags = (s) =>
  s
    .replace(/<\/p><p>/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// ================================================================
// hasEnoughBreaksToAnalyze
// ================================================================

test('hasEnoughBreaksToAnalyze: false below MIN_BR_COUNT', () => {
  assert.equal(hasEnoughBreaksToAnalyze('one line<br>two lines'), false);
});

test('hasEnoughBreaksToAnalyze: true once enough <br> are present', () => {
  assert.equal(hasEnoughBreaksToAnalyze('a<br>b<br>c<br>d'), true);
});

// ================================================================
// splitAtSentenceBoundaries
// ================================================================

test('splitAtSentenceBoundaries: short text passes through as one chunk', () => {
  const text = 'Una frase corta que no necesita dividirse.';
  assert.deepEqual(splitAtSentenceBoundaries(text, 600), [text]);
});

test('splitAtSentenceBoundaries: never cuts mid-sentence', () => {
  const text =
    'Primera frase larga que ocupa bastante espacio en el texto de prueba. ' +
    'Segunda frase también con contenido considerable para superar el umbral fijado. ' +
    'Tercera frase final para cerrar el bloque de prueba.';
  const chunks = splitAtSentenceBoundaries(text, 80);
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.ok(/[.!?]["')\]]?$/.test(c), `chunk should end at a sentence boundary: "${c}"`);
  }
  // No content lost or reordered.
  assert.equal(chunks.join(' '), text);
});

// ================================================================
// dewrapHardBreaks — Case A: hard-wrapped (PDF-paste style)
// ================================================================

const HARD_WRAPPED_FIXTURE =
  '<p>REPRESIÓN PLANDÉMICA: ocultan la<br>\n' +
  'HECATOMBE provocada por las mal<br>\n' +
  'llamadas "VACUNAS" (1)<br>\n' +
  'Por InternacionalistasPorLaVerdad<br>\n' +
  'El mayor logro del capitalismo mundial, en esta nueva fase de tiranía del dinero contra el ser humano, fue<br>\n' +
  'la creación ideológica de un mundo horror al virus y las pandemias haciendo de la "ciencia" una<br>\n' +
  'verdadera religión dominante y del sistema político mundial una tiranía generalizada y genocida.<br>\n' +
  'Lo falso cuando se impone en las masas se constituye en una verdadera potencia opresiva.<br>\n' +
  'Estamos viviendo el mayor ataque contra la especie humana de toda la historia, y no podemos<br>\n' +
  'esperar que respondan con pruebas científicas, porque la construcción de esa religión no se basa<br>\n' +
  'en la ciencia, ni en la evidencia, sino en el miedo administrado como herramienta de control social.</p>';

test('dewrapHardBreaks: Case A joins wrapped fragments and drops <br>', () => {
  const out = dewrapHardBreaks(HARD_WRAPPED_FIXTURE);
  assert.ok(!/<br/i.test(out), 'no <br> should remain');
  assert.ok((out.match(/<p>/g) || []).length >= 1, 'should produce at least one clean <p>');
});

test('dewrapHardBreaks: Case A preserves every word (no content loss)', () => {
  const out = dewrapHardBreaks(HARD_WRAPPED_FIXTURE);
  assert.equal(stripTags(out), stripTags(HARD_WRAPPED_FIXTURE));
});

// ================================================================
// dewrapHardBreaks — Case B: <br> used as paragraph separator between
// already-complete paragraphs (no reflow needed, just re-tagging)
// ================================================================

const LONG_SEGMENTS_FIXTURE =
  '<p>' +
  '¡Es la más gigantesca de las traiciones históricas, a los intereses del proletariado y la revolución social, ' +
  'sólo equivalentes a la participación de espacios que dijeron defender otra cosa en su momento!<br>' +
  'No solo la izquierda burguesa participa alegremente en los PLANES genocidarios y milicos de la guerra contra ' +
  'la humanidad que las "pandemias" izquierdistas también terminaron por avalar sin matices.<br>' +
  '"En vez de denunciar que EL PLANDEMISMO es un crimen, un genocidio, en vez de denunciar que la PLANDEMIA es, ' +
  'en realidad, la mayor CONTRA INSURRECCIÓN preventiva jamás organizada contra la clase obrera mundial."<br>' +
  'Legitimaban con ello todas las mentiras de la "ciencia" médica burguesa, en realidad militar, y todos los ' +
  'camelos de las PLANdemias anteriores, tal como habían hecho frente a las otras guerras del capital mundial.' +
  '</p>';

test('dewrapHardBreaks: Case B converts <br> between long segments into paragraph breaks', () => {
  const out = dewrapHardBreaks(LONG_SEGMENTS_FIXTURE);
  assert.ok(!/<br/i.test(out), 'no <br> should remain');
  assert.equal(
    (out.match(/<p>/g) || []).length,
    4,
    'each already-complete segment becomes its own <p>'
  );
});

test('dewrapHardBreaks: Case B preserves every word (no content loss)', () => {
  const out = dewrapHardBreaks(LONG_SEGMENTS_FIXTURE);
  assert.equal(stripTags(out), stripTags(LONG_SEGMENTS_FIXTURE));
});

// ================================================================
// dewrapHardBreaks — leaves well-formed / low-signal content untouched
// ================================================================

test('dewrapHardBreaks: leaves a normal well-formed article untouched', () => {
  const clean =
    '<p>Un párrafo normal y bien formado.</p><p>Otro párrafo distinto, también correcto.</p>';
  assert.equal(dewrapHardBreaks(clean), clean);
});

test('dewrapHardBreaks: leaves a <p> with only an occasional <br> untouched', () => {
  // Below MIN_BR_COUNT — more likely an intentional line break (e.g. a
  // quote attribution) than a formatting artifact; not touched.
  const p = '<p>Un párrafo con una sola línea suelta.<br>Y una segunda línea corta.</p>';
  assert.equal(dewrapHardBreaks(p), p);
});

test('dewrapHardBreaks: leaves non-<p> content (blockquote, figure, ul) untouched', () => {
  const html =
    '<blockquote><p>Una cita textual larga que no debería tocarse aunque tenga varias líneas de extensión considerable.</p></blockquote>' +
    '<ul><li>Item uno</li><li>Item dos</li></ul>';
  assert.equal(dewrapHardBreaks(html), html);
});

// ================================================================
// dewrapHardBreaks — idempotency: running it twice must be a no-op
// ================================================================

test('dewrapHardBreaks is idempotent', () => {
  const once = dewrapHardBreaks(HARD_WRAPPED_FIXTURE);
  const twice = dewrapHardBreaks(once);
  assert.equal(once, twice);
});
