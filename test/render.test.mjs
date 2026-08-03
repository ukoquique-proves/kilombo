/**
 * test/render.test.mjs
 *
 * Unit tests for escapeHtml(), buildLangs(), buildKeypoints() from render.mjs.
 * renderCard() uses document.createElement so it is tested via happy-dom shim.
 *
 * Run with:   node --test test/render.test.mjs
 * Or via:     ./scripts/test.sh
 *
 * Zero production dependencies — uses only node:test, node:assert, and
 * the happy-dom package (dev-only, installed via npm install --save-dev happy-dom).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { escapeHtml, buildLangs, buildKeypoints, renderCard } from '../site/js/render.mjs';

// ================================================================
// DOM shim setup — happy-dom gives us document.createElement
// ================================================================
const window = new Window();
global.document = window.document;

// ================================================================
// escapeHtml
// ================================================================
test('escapeHtml — escapes the five dangerous characters', () => {
  assert.equal(escapeHtml('&'), '&amp;');
  assert.equal(escapeHtml('<'), '&lt;');
  assert.equal(escapeHtml('>'), '&gt;');
  assert.equal(escapeHtml('"'), '&quot;');
  assert.equal(escapeHtml("'"), '&#39;');
});

test('escapeHtml — escapes a full XSS payload in text position', () => {
  const result = escapeHtml('<script>alert(1)</script>');
  assert.equal(result, '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.ok(!result.includes('<script>'), 'must not contain raw <script>');
});

test('escapeHtml — escapes attribute breakout payload', () => {
  const result = escapeHtml('" onmouseover="evil"');
  assert.equal(result, '&quot; onmouseover=&quot;evil&quot;');
  assert.ok(!result.includes('"'), 'must not contain unescaped double-quote');
});

test('escapeHtml — escapes href injection payload', () => {
  // javascript: URLs are handled elsewhere; this guards attribute breakout
  const result = escapeHtml("https://ok.com/' onclick='bad");
  assert.ok(!result.includes("'"), 'must not contain unescaped single-quote');
});

test('escapeHtml — leaves safe text unchanged', () => {
  assert.equal(escapeHtml('normal text'), 'normal text');
  assert.equal(escapeHtml('Café & Niños'), 'Café &amp; Niños');
});

test('escapeHtml — handles non-string inputs without throwing', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(0), '0');
  assert.equal(escapeHtml(false), 'false');
});

test('escapeHtml — double-escaping: already-escaped input is not re-escaped', () => {
  // Caller's responsibility not to double-escape, but verify the function
  // is deterministic: escaping an already-escaped string produces &amp;amp; etc.
  const once = escapeHtml('&');
  const twice = escapeHtml(once);
  assert.equal(once, '&amp;');
  assert.equal(twice, '&amp;amp;');
});

// ================================================================
// buildLangs
// ================================================================
test('buildLangs — renders a basic lang chip correctly', () => {
  const html = buildLangs([{ chip: 'es', label: 'ES original' }]);
  assert.ok(html.includes('lang-chip--es'), 'should include chip class');
  assert.ok(html.includes('ES original'), 'should include label');
});

test('buildLangs — escapes chip class and label', () => {
  const html = buildLangs([{ chip: 'es"><img', label: '<b>XSS</b>' }]);
  assert.ok(!html.includes('<b>'), 'label must be escaped');
  assert.ok(!html.includes('"><img'), 'chip must be escaped');
});

test('buildLangs — renders optional title attribute when present', () => {
  const html = buildLangs([{ chip: 'pending', label: 'FR: pendiente', title: 'En espera' }]);
  assert.ok(html.includes('title="En espera"'), 'should include title attr');
});

test('buildLangs — escapes title attribute', () => {
  const html = buildLangs([{ chip: 'todo', label: 'FR', title: '"injected"' }]);
  assert.ok(!html.includes('"injected"'), 'title must be escaped');
  assert.ok(html.includes('&quot;injected&quot;'));
});

test('buildLangs — renders multiple chips', () => {
  const html = buildLangs([
    { chip: 'en', label: 'EN original' },
    { chip: 'es', label: 'ES subt.' },
    { chip: 'todo', label: 'FR ★' },
  ]);
  assert.ok(html.includes('lang-chip--en'));
  assert.ok(html.includes('lang-chip--es'));
  assert.ok(html.includes('lang-chip--todo'));
});

// ================================================================
// buildKeypoints
// ================================================================
test('buildKeypoints — returns empty string for undefined', () => {
  assert.equal(buildKeypoints(undefined), '');
});

test('buildKeypoints — returns empty string for empty array', () => {
  assert.equal(buildKeypoints([]), '');
});

test('buildKeypoints — renders list items', () => {
  const html = buildKeypoints(['Point A', 'Point B']);
  assert.ok(html.includes('<li>Point A</li>'));
  assert.ok(html.includes('<li>Point B</li>'));
  assert.ok(html.includes('video-card__keypoints'));
});

test('buildKeypoints — escapes keypoint text', () => {
  const html = buildKeypoints(['<script>bad</script>']);
  assert.ok(!html.includes('<script>'), 'keypoints must be escaped');
  assert.ok(html.includes('&lt;script&gt;'));
});

// ================================================================
// renderCard — DOM-dependent, uses happy-dom shim
// ================================================================

/** Minimal valid video entry for testing */
const baseVideo = {
  id: '1641',
  country: 'ARG',
  countryLabel: 'Argentina',
  year: 2020,
  tags: ['miedo', 'pandemia'],
  category: 'Plandemia · Datos estadísticos',
  title: '2020: El año del miedo fabricado',
  desc: 'Análisis de la primera etapa.',
  langs: [
    { chip: 'es', label: 'ES original' },
    { chip: 'pending', label: 'FR: pendiente' },
  ],
  subtitlesFr: '',
  ctaUrl: 'https://tv.canal7salta.com/',
  ctaLabel: 'Ver en tv.canal7salta.com →',
  ctaPlaceholder: true,
};

test('renderCard — returns an article element', () => {
  const card = renderCard(baseVideo);
  assert.equal(card.tagName.toLowerCase(), 'article');
});

test('renderCard — sets data-video-id attribute', () => {
  const card = renderCard(baseVideo);
  assert.equal(card.dataset.videoId, '1641');
});

test('renderCard — sets data-country and data-year', () => {
  const card = renderCard(baseVideo);
  assert.equal(card.dataset.country, 'ARG');
  assert.equal(card.dataset.year, '2020');
});

test('renderCard — non-featured card has correct class', () => {
  const card = renderCard(baseVideo);
  assert.ok(card.classList.contains('video-card'));
  assert.ok(!card.classList.contains('video-card--featured'));
});

test('renderCard — featured card has featured class', () => {
  const card = renderCard({ ...baseVideo, featured: true, cornerLabel: 'Prioridad' });
  assert.ok(card.classList.contains('video-card--featured'));
});

test('renderCard — title is rendered in h3', () => {
  const card = renderCard(baseVideo);
  const h3 = card.querySelector('h3');
  assert.ok(h3, 'h3 must exist');
  assert.equal(h3.textContent, '2020: El año del miedo fabricado');
});

test('renderCard — description is rendered in p.video-card__desc', () => {
  const card = renderCard(baseVideo);
  const p = card.querySelector('.video-card__desc');
  assert.ok(p, 'desc paragraph must exist');
  assert.equal(p.textContent.trim(), 'Análisis de la primera etapa.');
});

test('renderCard — CTA link has correct href', () => {
  const card = renderCard(baseVideo);
  const a = card.querySelector('a.video-card__cta');
  assert.ok(a, 'CTA link must exist');
  assert.equal(a.getAttribute('href'), 'https://tv.canal7salta.com/');
});

test('renderCard — CTA opens in new tab with rel=noopener', () => {
  const card = renderCard(baseVideo);
  const a = card.querySelector('a.video-card__cta');
  assert.equal(a.getAttribute('target'), '_blank');
  assert.equal(a.getAttribute('rel'), 'noopener');
});

test('renderCard — XSS in title is escaped', () => {
  const card = renderCard({ ...baseVideo, title: '<script>alert(1)</script>' });
  const h3 = card.querySelector('h3');
  assert.ok(!h3.innerHTML.includes('<script>'), 'script tag must be escaped');
  assert.ok(h3.innerHTML.includes('&lt;script&gt;'));
});

test('renderCard — XSS in ctaUrl is escaped (attribute breakout)', () => {
  const card = renderCard({ ...baseVideo, ctaUrl: 'https://ok.com/" onmouseover="bad' });
  const a = card.querySelector('a.video-card__cta');
  // The href attribute value should contain the raw injected string (browser
  // decodes entities when returning getAttribute), but the serialised outerHTML
  // must have the quotes escaped so the attribute boundary is not broken.
  const serialised = a.outerHTML;
  // &quot; must appear in the serialised href, proving the quote was escaped
  assert.ok(serialised.includes('&quot;'), 'double-quote in href must be &quot; in serialised HTML');
  // The injected attribute name must NOT appear as a real attribute on the element
  assert.equal(a.getAttribute('onmouseover'), null, 'onmouseover must not be a real attribute');
});

test('renderCard — idAlt is shown in thumb-code when present', () => {
  const card = renderCard({ ...baseVideo, id: '167', idAlt: '1201', featured: true });
  const code = card.querySelector('.thumb-code');
  assert.ok(code.textContent.includes('167'));
  assert.ok(code.textContent.includes('1201'));
});

test('renderCard — keypoints list is rendered for featured cards', () => {
  const card = renderCard({
    ...baseVideo,
    featured: true,
    keypoints: ['Point A', 'Point B'],
  });
  const items = card.querySelectorAll('.video-card__keypoints li');
  assert.equal(items.length, 2);
  assert.equal(items[0].textContent, 'Point A');
});

test('renderCard — no keypoints list rendered when keypoints absent', () => {
  const card = renderCard(baseVideo);
  assert.equal(card.querySelectorAll('.video-card__keypoints').length, 0);
});

test('renderCard — subtitlesFr stored in dataset when non-empty', () => {
  const card = renderCard({ ...baseVideo, subtitlesFr: 'assets/subtitles/1641-fr.vtt' });
  assert.equal(card.dataset.subtitlesFr, 'assets/subtitles/1641-fr.vtt');
});

test('renderCard — subtitlesFr dataset absent when empty string', () => {
  const card = renderCard({ ...baseVideo, subtitlesFr: '' });
  assert.equal(card.dataset.subtitlesFr, undefined);
});
