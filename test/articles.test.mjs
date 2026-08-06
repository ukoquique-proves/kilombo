/**
 * test/articles.test.mjs
 *
 * Unit tests for the pure/DOM-building helpers exported from
 * site/js/articles.js: sectionLabel(), renderTopics(), renderArticleCard().
 *
 * Run with:   node --test test/articles.test.mjs
 * Or via:     ./scripts/test.sh
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { sectionLabel, renderTopics, renderArticleCard } from '../site/js/articles.js';

// ================================================================
// DOM shim setup — happy-dom gives us document.createElement
// ================================================================
const window = new Window();
global.document = window.document;

// ================================================================
// sectionLabel
// ================================================================

test('sectionLabel — maps known section codes to their display labels', () => {
  assert.equal(sectionLabel('tierra'), 'Tierra y Libertad');
  assert.equal(sectionLabel('gci'), 'GCI');
  assert.equal(sectionLabel('pi'), 'Proletarios Internacionalistas');
  assert.equal(sectionLabel('nom'), 'NOM / Plandemismo');
  assert.equal(sectionLabel('general'), 'Artículos');
});

test('sectionLabel — falls back to the raw section (or a default) for unknown codes', () => {
  assert.equal(sectionLabel('mystery'), 'mystery');
  assert.equal(sectionLabel(''), 'Artículos');
});

// ================================================================
// renderTopics
// ================================================================

test('renderTopics — returns empty string for no topics', () => {
  assert.equal(renderTopics([]), '');
  assert.equal(renderTopics(undefined), '');
});

test('renderTopics — renders one chip per topic and escapes topic text', () => {
  const html = renderTopics(['salud', '<b>xss</b>']);
  assert.ok(html.includes('salud'));
  assert.ok(html.includes('&lt;b&gt;xss&lt;/b&gt;'), 'topic text must be HTML-escaped');
  assert.ok(!html.includes('<b>xss</b>'), 'raw HTML in a topic must not survive');
});

// ================================================================
// renderArticleCard
// ================================================================

const baseArticle = {
  id: 'art-001',
  title: 'Un título de ejemplo',
  date: '2026-01-15',
  section: 'gci',
  topics: ['salud', 'pandemia'],
  sourceSite: 'kilombo.top',
  sourceUrl: 'https://kilombo.top/algun-articulo',
  status: 'imported',
  contentHtml: '<p>cuerpo</p>',
};

test('renderArticleCard — builds a link card pointing at articulo.html?id=...', () => {
  const el = renderArticleCard(baseArticle);
  assert.equal(el.tagName, 'A');
  assert.equal(el.getAttribute('href'), 'articulo.html?id=art-001');
});

test('renderArticleCard — URL-encodes the id in the href', () => {
  const el = renderArticleCard({ ...baseArticle, id: 'a b&c' });
  assert.equal(el.getAttribute('href'), 'articulo.html?id=a%20b%26c');
});

test('renderArticleCard — escapes title, date, section label and status', () => {
  const el = renderArticleCard({
    ...baseArticle,
    title: '<script>alert(1)</script>',
    status: '"><img src=x onerror=alert(1)>',
  });
  const html = el.innerHTML;
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
});

test('renderArticleCard — shows an em-dash when date is absent', () => {
  const el = renderArticleCard({ ...baseArticle, date: undefined });
  assert.ok(el.querySelector('.article-card__meta').textContent.includes('—'));
});

test('renderArticleCard — includes a topics block when topics are present', () => {
  const el = renderArticleCard(baseArticle);
  assert.ok(el.querySelector('.article-card__topics'));
  assert.equal(el.querySelectorAll('.topic-chip').length, 2);
});

test('renderArticleCard — omits the topics block when topics is empty', () => {
  const el = renderArticleCard({ ...baseArticle, topics: [] });
  assert.equal(el.querySelector('.article-card__topics'), null);
});
