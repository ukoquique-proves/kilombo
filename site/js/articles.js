// @ts-check
// articles.js — listado y detalle de artículos internos (JSON → HTML).
//
// Convención:
// - `articulos.html`  → <body data-page="articulos">
// - `articulo.html`   → <body data-page="articulo">
//
// Los datos viven en: `assets/content/articles.json`

import { escapeHtml, sanitizeHtml } from './render.mjs';
import { parseJson } from './decrypt.mjs';

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

function getArticleIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || '';
}

function renderEmptyState(container, msg) {
  container.innerHTML = `<div class="article-empty"><p>${escapeHtml(msg)}</p></div>`;
}

async function initIndexPage() {
  const list = document.getElementById('article-list');
  if (!list) return;

  try {
    const articles = await loadArticles();
    if (articles.length === 0) {
      renderEmptyState(list, 'Todavía no hay artículos internos publicados.');
      return;
    }

    const fragment = document.createDocumentFragment();
    articles.forEach((a) => fragment.appendChild(renderArticleCard(a)));
    list.appendChild(fragment);
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
      <p><strong>Fuente:</strong> ${escapeHtml(a.sourceSite)} · <a class="ext-link" href="${safeSourceUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.sourceUrl)}</a></p>
    `.trim();
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

