// @ts-check
// articles.js — listado y detalle de artículos internos (JSON → HTML).
//
// Convención:
// - `articulos.html`  → <body data-page="articulos">
// - `articulo.html`   → <body data-page="articulo">
//
// Los datos viven en: `assets/content/articles.json`

import { escapeHtml, sanitizeHtml, renderFilterBar } from './render.mjs';
import { parseJson } from './decrypt.mjs';

// Re-exported so existing imports of renderFilterBar from articles.js
// (including test/articles.test.mjs) keep working. The implementation now
// lives in render.mjs, shared with plandemismo.js's tag filter bar.
export { renderFilterBar };

const DATA_PATH = 'assets/content/articles.json';

/**
 * @typedef {Object} ArticleEntry
 * @property {string} id
 * @property {string} title
 * @property {string} [date]         // YYYY-MM-DD (opcional)
 * @property {string} section        // e.g. tierra|gci|pi|nom|general
 * @property {string[]} topics
 * @property {string} sourceSite
 * @property {string} sourceUrl
 * @property {string} status         // imported|adapted|translated|pending-review|external-only
 * @property {string} contentHtml
 */

/** @returns {Promise<ArticleEntry[]>} */
async function loadArticles() {
  const res = await fetch(DATA_PATH);
  if (!res.ok) throw new Error(`Failed to load ${DATA_PATH}: ${res.status}`);
  const data = await parseJson(await res.text());
  if (!Array.isArray(data)) throw new Error(`${DATA_PATH} must be an array`);
  return /** @type {ArticleEntry[]} */ (data);
}

/** @param {string} section */
export function sectionLabel(section) {
  switch (section) {
    case 'tierra':
      return 'Tierra y Libertad';
    case 'gci':
      return 'GCI';
    case 'pi':
      return 'Proletarios Internacionalistas';
    case 'nom':
      return 'NOM / Plandemismo';
    case 'general':
      return 'Artículos';
    default:
      return section || 'Artículos';
  }
}

/** @param {string[]} topics */
export function renderTopics(topics) {
  if (!topics || topics.length === 0) return '';
  const chips = topics
    .map((t) => `<span class="topic-chip">${escapeHtml(t)}</span>`)
    .join('\n        ');
  return `<div class="article-card__topics">\n        ${chips}\n      </div>`;
}

/**
 * @param {ArticleEntry} a
 * @returns {HTMLElement}
 */
export function renderArticleCard(a) {
  const el = document.createElement('a');
  el.className = 'article-card';
  el.href = `articulo.html?id=${encodeURIComponent(a.id)}`;

  const date = a.date ? escapeHtml(a.date) : '—';
  const sec = escapeHtml(sectionLabel(a.section));
  const status = escapeHtml(a.status);
  const title = escapeHtml(a.title);

  el.innerHTML = `
      <div class="article-card__meta">
        <span>${date}</span>
        <span>${sec}</span>
        <span>${status}</span>
      </div>
      <h3 class="article-card__title">${title}</h3>
      ${renderTopics(a.topics)}
  `.trim();

  return el;
}

// ================================================================
// Topic filtering (articulos.html)
// ================================================================

/**
 * Collects every distinct topic across a set of articles, sorted
 * alphabetically (locale-aware, Spanish collation) for stable, predictable
 * ordering in the filter bar.
 * @param {ArticleEntry[]} articles
 * @returns {string[]}
 */
export function getAllTopics(articles) {
  const set = new Set();
  for (const a of articles) {
    for (const t of a.topics || []) set.add(t);
  }
  return [...set].sort((x, y) => x.localeCompare(y, 'es'));
}

/**
 * @param {ArticleEntry[]} articles
 * @param {string|null} topic  null/'' means "no filter, show all"
 * @returns {ArticleEntry[]}
 */
export function filterArticlesByTopic(articles, topic) {
  if (!topic) return articles;
  return articles.filter((a) => (a.topics || []).includes(topic));
}

/**
 * Case-insensitive substring match against title + topics. Empty/blank
 * query returns every article unchanged.
 * @param {ArticleEntry[]} articles
 * @param {string} query
 * @returns {ArticleEntry[]}
 */
export function filterArticlesByQuery(articles, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return articles;
  return articles.filter((a) => {
    const haystack = [a.title, ...(a.topics || [])].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

// ================================================================
// Related articles (articulo.html)
// ================================================================

/**
 * Ranks other articles by how many topics they share with the current one.
 * Ties broken by most recent date first. Articles with zero shared topics
 * are excluded — "related" should mean something, not just "other".
 * @param {ArticleEntry} current
 * @param {ArticleEntry[]} all
 * @param {number} [limit]
 * @returns {ArticleEntry[]}
 */
export function findRelatedArticles(current, all, limit = 3) {
  const currentTopics = new Set(current.topics || []);
  if (currentTopics.size === 0) return [];

  const scored = all
    .filter((a) => a.id !== current.id)
    .map((a) => {
      const shared = (a.topics || []).filter((t) => currentTopics.has(t)).length;
      return { article: a, shared };
    })
    .filter((x) => x.shared > 0)
    .sort((x, y) => {
      if (y.shared !== x.shared) return y.shared - x.shared;
      // Most recent first; articles without a date sort last.
      return (y.article.date || '').localeCompare(x.article.date || '');
    });

  return scored.slice(0, limit).map((x) => x.article);
}

/**
 * @param {ArticleEntry[]} related
 * @returns {HTMLElement|null}  null when there's nothing to show — callers
 *   should skip inserting the section entirely rather than render an empty box.
 */
export function renderRelatedArticles(related) {
  if (!related || related.length === 0) return null;

  const wrap = document.createElement('div');
  wrap.className = 'article-detail__related';

  const heading = document.createElement('h3');
  heading.className = 'article-detail__related-title';
  heading.textContent = 'Sobre el mismo tema';
  wrap.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'related-grid';
  related.forEach((a) => grid.appendChild(renderArticleCard(a)));
  wrap.appendChild(grid);

  return wrap;
}

// ================================================================
// Page wiring
// ================================================================

function getArticleIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || '';
}

function getTopicFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('topic') || null;
}

function getQueryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('q') || '';
}

function renderEmptyState(container, msg) {
  container.innerHTML = `<div class="article-empty"><p>${escapeHtml(msg)}</p></div>`;
}

/**
 * @param {HTMLElement} list
 * @param {ArticleEntry[]} articles
 */
function renderList(list, articles) {
  list.innerHTML = '';
  if (articles.length === 0) {
    renderEmptyState(list, 'No hay artículos que coincidan con este filtro.');
    return;
  }
  const fragment = document.createDocumentFragment();
  articles.forEach((a) => fragment.appendChild(renderArticleCard(a)));
  list.appendChild(fragment);
}

async function initIndexPage() {
  const list = document.getElementById('article-list');
  const filterBarSlot = document.getElementById('article-filter-bar');
  const searchInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById('article-search')
  );
  if (!list) return;

  try {
    const articles = await loadArticles();

    if (articles.length === 0) {
      renderEmptyState(list, 'Todavía no hay artículos internos publicados.');
      return;
    }

    const topics = getAllTopics(articles);
    let activeTopic = getTopicFromUrl();
    if (activeTopic && !topics.includes(activeTopic)) activeTopic = null;
    let activeQuery = getQueryFromUrl();
    if (searchInput) searchInput.value = activeQuery;

    const render = () => {
      const url = new URL(window.location.href);
      if (activeTopic) url.searchParams.set('topic', activeTopic);
      else url.searchParams.delete('topic');
      if (activeQuery) url.searchParams.set('q', activeQuery);
      else url.searchParams.delete('q');
      window.history.replaceState({}, '', url);

      if (filterBarSlot) {
        filterBarSlot.innerHTML = '';
        filterBarSlot.appendChild(renderFilterBar(topics, activeTopic, applyTopic));
      }

      const filtered = filterArticlesByQuery(
        filterArticlesByTopic(articles, activeTopic),
        activeQuery
      );
      renderList(list, filtered);
    };

    const applyTopic = (topic) => {
      activeTopic = topic;
      render();
    };

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        activeQuery = searchInput.value;
        render();
      });
    }

    if (filterBarSlot && topics.length > 0) {
      filterBarSlot.appendChild(renderFilterBar(topics, activeTopic, applyTopic));
    }
    renderList(
      list,
      filterArticlesByQuery(filterArticlesByTopic(articles, activeTopic), activeQuery)
    );
  } catch (e) {
    console.error('[articulos]', e);
    renderEmptyState(list, 'Error cargando el índice de artículos. Intenta recargar la página.');
  }
}

async function initDetailPage() {
  const titleEl = document.getElementById('article-title');
  const metaEl = document.getElementById('article-meta');
  const contentEl = document.getElementById('article-content');
  const sourceEl = document.getElementById('article-source');
  const relatedEl = document.getElementById('article-related');

  if (!titleEl || !metaEl || !contentEl || !sourceEl) return;

  const id = getArticleIdFromUrl();
  if (!id) {
    titleEl.textContent = 'Artículo no especificado';
    renderEmptyState(contentEl, 'Falta el parámetro `id` en la URL.');
    return;
  }

  try {
    const articles = await loadArticles();
    const a = articles.find((x) => x.id === id);

    if (!a) {
      titleEl.textContent = 'Artículo no encontrado';
      renderEmptyState(contentEl, `No existe un artículo con id "${id}".`);
      return;
    }

    titleEl.textContent = a.title;
    document.title = `${a.title} — Kilombo`;
    metaEl.innerHTML = `
      <span>${escapeHtml(a.date || '—')}</span>
      <span>${escapeHtml(sectionLabel(a.section))}</span>
      <span>${escapeHtml(a.status)}</span>
    `.trim();

    // contentHtml viene de un JSON versionado en el repo, pero puede haber
    // sido importado/adaptado desde una fuente externa (ver `status` y
    // `sourceUrl`). Se sanea igualmente antes de insertarse en el DOM:
    // se descarta <script>, atributos de evento (onerror, onclick, ...) y
    // URLs javascript:/data:, conservando solo un allowlist de etiquetas
    // de formato (p, a, strong, em, listas, blockquote, img, ...).
    contentEl.innerHTML = '';
    contentEl.appendChild(sanitizeHtml(a.contentHtml || ''));

    const safeSourceUrl = escapeHtml(a.sourceUrl);
    sourceEl.innerHTML = `
      <p><strong>Fuente:</strong> ${escapeHtml(a.sourceSite)} · <a class="ext-link" href="${safeSourceUrl}" target="_blank" rel="noopener noreferrer">${safeSourceUrl}</a></p>
    `.trim();

    if (relatedEl) {
      relatedEl.innerHTML = '';
      const related = findRelatedArticles(a, articles);
      const relatedBlock = renderRelatedArticles(related);
      if (relatedBlock) relatedEl.appendChild(relatedBlock);
    }
  } catch (e) {
    console.error('[articulo]', e);
    titleEl.textContent = 'Error';
    renderEmptyState(contentEl, 'Error cargando el artículo. Intenta recargar la página.');
  }
}

// Guarded so this module can be imported in a non-browser context (e.g. the
// Node/happy-dom unit tests, which import the pure render helpers above
// without wanting the page to auto-initialize).
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (page === 'articulos') initIndexPage();
    if (page === 'articulo') initDetailPage();
  });
}

