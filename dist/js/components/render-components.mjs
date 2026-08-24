/**
 * site/js/components/render-components.mjs
 *
 * Rendering components for cards, filters, and metadata displays.
 * Each export is a self-contained component factory.
 */

import { escapeHtml, sanitizeHtml } from '../render.mjs';
import { isSafeUrl } from '../shared/url-safety.mjs';
import { sectionLabel } from '../models/articles-model.mjs';

/**
 * Render topic chips for an article card or detail page.
 * @param {string[]} topics
 * @returns {string}
 */
export function renderTopics(topics) {
  if (!topics || topics.length === 0) return '';
  const chips = topics
    .map((t) => `<span class="topic-chip">${escapeHtml(t)}</span>`)
    .join('\n        ');
  return `<div class="article-card__topics">\n        ${chips}\n      </div>`;
}

/**
 * Render an article card as an HTMLElement.
 * @param {Object} a - article entry
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

  if (a.status === 'pending-review') {
    el.dataset.statusPendingReview = 'true';
  }

  const statusHtml =
    a.status === 'pending-review'
      ? `<span class="article-card__status-badge article-card__status-badge--pending">⚠️ ${status}</span>`
      : `<span>${status}</span>`;

  el.innerHTML = `
      <div class="article-card__meta">
        <span>${date}</span>
        <span>${sec}</span>
        ${statusHtml}
      </div>
      <h3 class="article-card__title">${title}</h3>
      ${renderTopics(a.topics)}
  `.trim();

  return el;
}

/**
 * Render a filter bar (reusable for topics or other filters).
 * @param {string[]} values
 * @param {string|null} activeValue
 * @param {(value: string|null) => void} onSelect
 * @param {string} [allLabel]
 * @returns {HTMLElement}
 */
export function renderFilterBar(values, activeValue, onSelect, allLabel = 'Todos') {
  const bar = document.createElement('div');
  bar.className = 'topic-filter-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Filtrar por tema');

  const makeButton = (label, value) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'topic-filter-btn';
    btn.textContent = label;
    if (value) btn.dataset.topic = value;
    const isActive = value === activeValue || (!value && !activeValue);
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    btn.addEventListener('click', () => onSelect(value));
    return btn;
  };

  bar.appendChild(makeButton(allLabel, null));
  values.forEach((v) => bar.appendChild(makeButton(v, v)));

  return bar;
}

/**
 * Render a pending-review banner for articles.
 * @returns {HTMLElement}
 */
export function renderPendingBanner() {
  const banner = document.createElement('div');
  banner.className = 'article-pending-banner';
  banner.innerHTML = `
    <div class="article-pending-banner__icon">⚠️</div>
    <div class="article-pending-banner__text">
      <strong>Artículo pendiente de revisión</strong>
      <p>Este contenido ha sido importado como borrador y necesita ser completado, revisado y adaptado antes de su publicación final. El texto a continuación es preliminar y servirá como guía para futuras ediciones.</p>
    </div>
  `;
  return banner;
}

/**
 * Render metadata card for movies/documentaries.
 * @param {Object} metadata
 * @returns {HTMLElement}
 */
export function renderMetadataCard(metadata) {
  const card = document.createElement('div');
  card.className = 'article-metadata-card';

  const metaItems = [];
  if (metadata.director)
    metaItems.push(`<strong>Director:</strong> ${escapeHtml(metadata.director)}`);
  if (metadata.year) metaItems.push(`<strong>Año:</strong> ${escapeHtml(metadata.year)}`);
  if (metadata.country)
    metaItems.push(`<strong>País:</strong> ${escapeHtml(metadata.country)}`);
  if (metadata.duration)
    metaItems.push(`<strong>Duración:</strong> ${escapeHtml(metadata.duration)}`);
  if (metadata.language)
    metaItems.push(`<strong>Idioma:</strong> ${escapeHtml(metadata.language)}`);
  if (metadata.subtitles)
    metaItems.push(`<strong>Subtítulos:</strong> ${escapeHtml(metadata.subtitles)}`);

  card.innerHTML = `
    <div class="article-metadata-card__header">📽️ Ficha técnica</div>
    <div class="article-metadata-card__body">
      ${metaItems.map((item) => `<div class="article-metadata-card__item">${item}</div>`).join('')}
    </div>
  `;
  return card;
}

/**
 * Render external links card.
 * @param {Array} externalLinks
 * @returns {HTMLElement}
 */
export function renderExternalLinksCard(externalLinks) {
  const card = document.createElement('div');
  card.className = 'article-external-links-card';

  const linkItems = externalLinks
    .map((link) => {
      const safeUrl = escapeHtml(isSafeUrl(link.url) ? link.url : '#');
      const unsafe = !isSafeUrl(link.url);
      return `
        <a href="${safeUrl}" class="article-external-links-card__link" target="_blank" rel="noopener noreferrer"${unsafe ? ' data-unsafe-url-blocked="true"' : ''}>
          <span class="article-external-links-card__type">${escapeHtml(link.type)}</span>
          <span class="article-external-links-card__title">${escapeHtml(link.title || link.url)}</span>
        </a>
      `;
    })
    .join('');

  card.innerHTML = `
    <div class="article-external-links-card__header">🔗 Enlaces externos</div>
    <div class="article-external-links-card__body">
      ${linkItems}
    </div>
  `;
  return card;
}

/**
 * Render related articles section.
 * @param {Array} related
 * @returns {HTMLElement|null}
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

/**
 * Render source attribution box.
 * @param {string} sourceUrl
 * @param {string} sourceSite
 * @returns {string}
 */
export function renderSourceBox(sourceUrl, sourceSite) {
  const safeSourceUrl = escapeHtml(sourceUrl);
  const sourceHref = escapeHtml(isSafeUrl(sourceUrl) ? sourceUrl : '#');
  return `
    <div class="article-detail__source-box">
      <div class="article-detail__source-label">📍 Fuente original</div>
      <div class="article-detail__source-site">${escapeHtml(sourceSite)}</div>
      <a class="article-detail__source-link" href="${sourceHref}" target="_blank" rel="noopener noreferrer"${!isSafeUrl(sourceUrl) ? ' data-unsafe-url-blocked="true"' : ''}>${safeSourceUrl}</a>
    </div>
  `.trim();
}

/**
 * Helper to safely display contentHtml (sanitized).
 * @param {string} contentHtml
 * @returns {DocumentFragment}
 */
export function renderContentHtml(contentHtml) {
  return sanitizeHtml(contentHtml || '');
}
