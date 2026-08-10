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
import {
  sectionLabel,
  renderTopics,
  renderArticleCard,
  getAllTopics,
  filterArticlesByTopic,
  filterArticlesByQuery,
  renderFilterBar,
  findRelatedArticles,
  renderRelatedArticles,
} from '../site/js/articles.js';

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

// ================================================================
// getAllTopics / filterArticlesByTopic
// ================================================================

const articleSet = [
  { ...baseArticle, id: 'a1', topics: ['salud', 'pandemia'], date: '2026-01-01' },
  { ...baseArticle, id: 'a2', topics: ['pandemia', 'medios'], date: '2026-02-01' },
  { ...baseArticle, id: 'a3', topics: [], date: '2026-03-01' },
];

test('getAllTopics — returns the deduplicated, sorted union of all topics', () => {
  assert.deepEqual(getAllTopics(articleSet), ['medios', 'pandemia', 'salud']);
});

test('getAllTopics — returns an empty array when no article has topics', () => {
  assert.deepEqual(getAllTopics([{ ...baseArticle, topics: [] }]), []);
});

test('filterArticlesByTopic — returns all articles when topic is null/empty', () => {
  assert.equal(filterArticlesByTopic(articleSet, null).length, 3);
  assert.equal(filterArticlesByTopic(articleSet, '').length, 3);
});

test('filterArticlesByTopic — keeps only articles that include the topic', () => {
  const result = filterArticlesByTopic(articleSet, 'salud');
  assert.deepEqual(result.map((a) => a.id), ['a1']);
});

test('filterArticlesByTopic — returns an empty array for a topic no article has', () => {
  assert.deepEqual(filterArticlesByTopic(articleSet, 'inexistente'), []);
});

// ================================================================
// renderFilterBar
// ================================================================

test('renderFilterBar — renders one button per topic plus "Todos"', () => {
  const el = renderFilterBar(['pandemia', 'salud'], null, () => {});
  const buttons = el.querySelectorAll('button');
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0].textContent, 'Todos');
});

test('renderFilterBar — marks the active topic button with is-active and aria-pressed', () => {
  const el = renderFilterBar(['pandemia', 'salud'], 'salud', () => {});
  const active = el.querySelector('.is-active');
  assert.equal(active.textContent, 'salud');
  assert.equal(active.getAttribute('aria-pressed'), 'true');
});

test('renderFilterBar — clicking a topic button calls onSelect with that topic', () => {
  let selected = 'not-called';
  const el = renderFilterBar(['pandemia'], null, (topic) => { selected = topic; });
  const btn = [...el.querySelectorAll('button')].find((b) => b.textContent === 'pandemia');
  btn.click();
  assert.equal(selected, 'pandemia');
});

test('renderFilterBar — clicking "Todos" calls onSelect with null', () => {
  let selected = 'not-called';
  const el = renderFilterBar(['pandemia'], 'pandemia', (topic) => { selected = topic; });
  const btn = [...el.querySelectorAll('button')].find((b) => b.textContent === 'Todos');
  btn.click();
  assert.equal(selected, null);
});

// ================================================================
// findRelatedArticles
// ================================================================

test('findRelatedArticles — ranks by number of shared topics, most first', () => {
  const current = { ...baseArticle, id: 'cur', topics: ['salud', 'pandemia'] };
  const pool = [
    current,
    { ...baseArticle, id: 'one-shared', topics: ['salud'], date: '2026-01-01' },
    { ...baseArticle, id: 'two-shared', topics: ['salud', 'pandemia'], date: '2026-01-01' },
    { ...baseArticle, id: 'no-shared', topics: ['medios'], date: '2026-01-01' },
  ];
  const result = findRelatedArticles(current, pool);
  assert.deepEqual(result.map((a) => a.id), ['two-shared', 'one-shared']);
});

test('findRelatedArticles — never includes the current article itself', () => {
  const current = { ...baseArticle, id: 'cur', topics: ['salud'] };
  const result = findRelatedArticles(current, [current]);
  assert.deepEqual(result, []);
});

test('findRelatedArticles — respects the limit', () => {
  const current = { ...baseArticle, id: 'cur', topics: ['salud'] };
  const pool = [
    current,
    { ...baseArticle, id: 'r1', topics: ['salud'], date: '2026-01-01' },
    { ...baseArticle, id: 'r2', topics: ['salud'], date: '2026-01-02' },
    { ...baseArticle, id: 'r3', topics: ['salud'], date: '2026-01-03' },
  ];
  assert.equal(findRelatedArticles(current, pool, 2).length, 2);
});

test('findRelatedArticles — returns an empty array when current article has no topics', () => {
  const current = { ...baseArticle, id: 'cur', topics: [] };
  const pool = [current, { ...baseArticle, id: 'other', topics: ['salud'] }];
  assert.deepEqual(findRelatedArticles(current, pool), []);
});

// ================================================================
// renderRelatedArticles
// ================================================================

test('renderRelatedArticles — returns null for an empty list (caller skips the section)', () => {
  assert.equal(renderRelatedArticles([]), null);
  assert.equal(renderRelatedArticles(undefined), null);
});

test('renderRelatedArticles — renders a card per related article', () => {
  const el = renderRelatedArticles([
    { ...baseArticle, id: 'r1' },
    { ...baseArticle, id: 'r2' },
  ]);
  assert.equal(el.querySelectorAll('.article-card').length, 2);
});

// ================================================================
// filterArticlesByQuery
// ================================================================

test('filterArticlesByQuery — returns all articles for an empty/blank query', () => {
  assert.equal(filterArticlesByQuery(articleSet, '').length, 3);
  assert.equal(filterArticlesByQuery(articleSet, '   ').length, 3);
  assert.equal(filterArticlesByQuery(articleSet, undefined).length, 3);
});

test('filterArticlesByQuery — matches against the title, case-insensitively', () => {
  const result = filterArticlesByQuery(
    [{ ...baseArticle, id: 'x', title: 'Un Título de Ejemplo', topics: [] }],
    'título'
  );
  assert.equal(result.length, 1);
});

test('filterArticlesByQuery — matches against topics too', () => {
  const result = filterArticlesByQuery(articleSet, 'medios');
  assert.deepEqual(result.map((a) => a.id), ['a2']);
});

test('filterArticlesByQuery — returns an empty array when nothing matches', () => {
  assert.deepEqual(filterArticlesByQuery(articleSet, 'inexistente-xyz'), []);
});


