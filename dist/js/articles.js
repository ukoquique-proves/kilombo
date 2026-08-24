// @ts-check
// articles.js — listado y detalle de artículos internos (JSON → HTML).
//
// Convención:
// - `articulos.html`  → <body data-page="articulos">
// - `articulo.html`   → <body data-page="articulo">
//
// Los datos viven en: `assets/content/articles.json`

// @ts-check
// articles.js — listado y detalle de artículos internos (JSON → HTML).
//
// Imports from modular components:
// - Model (articulos-model.mjs): data loading, filtering, relationships
// - Components (render-components.mjs): UI rendering (cards, filters, etc)
// - Utilities (render-utils.mjs): sanitization, escaping (via render.mjs re-export)

import { escapeHtml, sanitizeHtml, renderFilterBar } from './render.mjs';
import {
  loadArticles,
  sectionLabel,
  getAllTopics,
  filterArticlesByTopic,
  filterArticlesBySection,
  filterArticlesByQuery,
  findRelatedArticles,
} from './models/articles-model.mjs';
import {
  renderTopics,
  renderArticleCard,
  renderRelatedArticles,
  renderPendingBanner,
  renderMetadataCard,
  renderExternalLinksCard,
  renderSourceBox,
  renderContentHtml,
} from './components/render-components.mjs';
import { isSafeUrl } from './shared/url-safety.mjs';

// Re-exported so existing imports of renderFilterBar from articles.js
// (including test/articles.test.mjs) keep working.
export { renderFilterBar };

// Re-export model functions for backwards compatibility with tests
export {
  sectionLabel,
  getAllTopics,
  filterArticlesByTopic,
  filterArticlesBySection,
  filterArticlesByQuery,
  findRelatedArticles,
};

// Re-export component functions for backwards compatibility with tests
export { renderTopics, renderArticleCard, renderRelatedArticles };

/**
 * Returns a safe href value for a sourceUrl.
 * @param {string} url
 * @returns {string}
 */
export function safeHref(url) {
  return isSafeUrl(url) ? url : '#';
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

function getSectionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('section') || null;
}

function getQueryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('q') || '';
}

function renderEmptyState(container, msg) {
  container.innerHTML = `<div class="article-empty"><p>${escapeHtml(msg)}</p></div>`;
}

/**
 * Wires the fixed progress bar (#progress-bar) to document scroll
 * position. No-ops if the element isn't on the page. rAF-throttled
 * so scroll doesn't trigger layout thrashing.
 */
function initReadingProgress() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;

  let ticking = false;
  const update = () => {
    const scrolled = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (scrolled / maxScroll) * 100 : 0;
    bar.style.width = `${progress}%`;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', update);

  update();
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
    let activeSection = getSectionFromUrl();
    if (searchInput) searchInput.value = activeQuery;

    const render = () => {
      const url = new URL(window.location.href);
      if (activeTopic) url.searchParams.set('topic', activeTopic);
      else url.searchParams.delete('topic');
      if (activeQuery) url.searchParams.set('q', activeQuery);
      else url.searchParams.delete('q');
      if (activeSection) url.searchParams.set('section', activeSection);
      else url.searchParams.delete('section');
      window.history.replaceState({}, '', url);

      const sectionFiltered = filterArticlesBySection(articles, activeSection);
      const topicsInSection = getAllTopics(sectionFiltered);
      if (activeTopic && !topicsInSection.includes(activeTopic)) activeTopic = null;

      if (filterBarSlot) {
        filterBarSlot.innerHTML = '';
        filterBarSlot.appendChild(renderFilterBar(topicsInSection, activeTopic, applyTopic));
      }

      const filtered = filterArticlesByQuery(
        filterArticlesByTopic(sectionFiltered, activeTopic),
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

    render();
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

    // Mark the page/body with a data attribute for pending-review styling
    if (a.status === 'pending-review') {
      document.body.dataset.articleStatusPendingReview = 'true';
    }

    const statusBadge =
      a.status === 'pending-review'
        ? `<span class="article-detail__status-badge article-detail__status-badge--pending">⚠️ ${escapeHtml(a.status)}</span>`
        : `<span>${escapeHtml(a.status)}</span>`;

    metaEl.innerHTML = `
      <span>${escapeHtml(a.date || '—')}</span>
      <span>${escapeHtml(sectionLabel(a.section))}</span>
      ${statusBadge}
    `.trim();

    // contentHtml viene de un JSON versionado en el repo, pero puede haber
    // sido importado/adaptado desde una fuente externa (ver `status` y
    // `sourceUrl`). Se sanea igualmente antes de insertarse en el DOM:
    // se descarta <script>, atributos de evento (onerror, onclick, ...) y
    // URLs javascript:/data:, conservando solo un allowlist de etiquetas
    // de formato (p, a, strong, em, listas, blockquote, img, ...).
    contentEl.innerHTML = '';

    // If pending-review, prepend a visual banner before the content
    if (a.status === 'pending-review') {
      contentEl.appendChild(renderPendingBanner());
    }

    contentEl.appendChild(renderContentHtml(a.contentHtml || ''));

    // Render metadata card if present (for movies, documentaries, etc.)
    if (a.metadata && (a.metadata.mediaType || a.metadata.director || a.metadata.year)) {
      contentEl.appendChild(renderMetadataCard(a.metadata));
    }

    // Render external links if present (YouTube, IMDb, etc.)
    if (a.externalLinks && a.externalLinks.length > 0) {
      contentEl.appendChild(renderExternalLinksCard(a.externalLinks));
    }

    initReadingProgress();

    sourceEl.innerHTML = renderSourceBox(a.sourceUrl, a.sourceSite);

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
