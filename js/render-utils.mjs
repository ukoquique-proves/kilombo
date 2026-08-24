/**
 * site/js/render-utils.mjs
 *
 * Pure rendering utilities: escaping, sanitization, HTML building.
 * Extracted from render.mjs to be a reusable library with no component-specific logic.
 * No DOM globals except minimal necessary for parsing/building.
 */

import { isSafeUrl } from './shared/url-safety.mjs';

// ================================================================
// ESCAPING
// ================================================================

/**
 * Escape a string for safe interpolation into HTML text content or
 * attribute values. Covers & < > " ' — the five characters that can
 * break markup or allow attribute injection.
 *
 * @param {unknown} s
 * @returns {string}
 */
export const escapeHtml = (s) =>
  String(s === null || s === undefined ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c
  );

// ================================================================
// HTML SANITIZATION
// ================================================================

/**
 * Tags allowed to survive sanitization.
 */
const SANITIZE_ALLOWED_TAGS = new Set([
  'P',
  'A',
  'STRONG',
  'EM',
  'B',
  'I',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'H3',
  'H4',
  'BR',
  'IMG',
  'SPAN',
  'FIGURE',
  'FIGCAPTION',
  'HR',
]);

/** @type {Record<string, string[]>} */
const SANITIZE_ALLOWED_ATTRS = {
  A: ['href'],
  IMG: ['src', 'alt'],
};

/**
 * Tags to remove entirely (tag + children).
 */
const SANITIZE_DROP_ENTIRELY = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'LINK',
  'META',
  'NOSCRIPT',
  'TEMPLATE',
  'SVG',
]);

/**
 * Recursively copy the safe subset of `source`'s children into `target`.
 * @param {Node} source
 * @param {Node} target
 */
const sanitizeInto = (source, target) => {
  for (const node of Array.from(source.childNodes)) {
    if (node.nodeType === 3) {
      target.appendChild(document.createTextNode(node.textContent));
      continue;
    }
    if (node.nodeType !== 1) continue;

    const tag = /** @type {Element} */ (node).tagName;
    if (SANITIZE_DROP_ENTIRELY.has(tag)) {
      continue;
    }
    if (!SANITIZE_ALLOWED_TAGS.has(tag)) {
      sanitizeInto(node, target);
      continue;
    }

    const srcEl = /** @type {Element} */ (node);
    const el = document.createElement(tag.toLowerCase());
    for (const attr of SANITIZE_ALLOWED_ATTRS[tag] || []) {
      if (!srcEl.hasAttribute(attr)) continue;
      const value = srcEl.getAttribute(attr) || '';
      if ((attr === 'href' || attr === 'src') && !isSafeUrl(value)) continue;
      el.setAttribute(attr, value);
    }
    if (tag === 'A' && el.hasAttribute('href')) {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }

    sanitizeInto(node, el);
    target.appendChild(el);
  }
};

/**
 * Sanitize an HTML string down to a small allowlist of formatting tags.
 * @param {string} dirty
 * @returns {DocumentFragment}
 */
export const sanitizeHtml = (dirty) => {
  const source = document.createElement('div');
  source.innerHTML = String(dirty === null || dirty === undefined ? '' : dirty);

  const fragment = document.createDocumentFragment();
  sanitizeInto(source, fragment);
  return fragment;
};

// ================================================================
// VIDEO CARD BUILDERS (for plandemismo.js)
// ================================================================

/**
 * Build lang chips HTML.
 * @param {Array<{chip: string, label: string, title?: string}>} langs
 * @returns {string}
 */
export const buildLangs = (langs) =>
  langs
    .map((l) => {
      const titleAttr = l.title ? ` title="${escapeHtml(l.title)}"` : '';
      return `<span class="lang-chip lang-chip--${escapeHtml(l.chip)}"${titleAttr}>${escapeHtml(l.label)}</span>`;
    })
    .join('\n            ');

/**
 * Build keypoints list HTML (featured cards only).
 * @param {string[] | undefined} keypoints
 * @returns {string}
 */
export const buildKeypoints = (keypoints) => {
  if (!keypoints || keypoints.length === 0) return '';
  const items = keypoints.map((kp) => `<li>${escapeHtml(kp)}</li>`).join('\n            ');
  return `
          <ul class="video-card__keypoints">
            ${items}
          </ul>`;
};

/**
 * Render a video card as an HTMLElement.
 * @param {Object} v - video entry
 * @returns {HTMLElement}
 */
export const renderCard = (v) => {
  const isFeatured = !!v.featured;
  const cardClass = isFeatured ? 'video-card video-card--featured' : 'video-card';
  const thumbClass = isFeatured
    ? 'video-card__thumb video-card__thumb--featured video-card__thumb--placeholder'
    : 'video-card__thumb video-card__thumb--placeholder';
  const playClass = isFeatured ? 'play-icon play-icon--big' : 'play-icon';
  const codeClass = isFeatured ? 'thumb-code thumb-code--big' : 'thumb-code';
  const codeLabel = v.idAlt ? `${escapeHtml(v.id)} · ${escapeHtml(v.idAlt)}` : escapeHtml(v.id);
  const titleClass = isFeatured ? 'video-card__title video-card__title--big' : 'video-card__title';
  const ctaClass = isFeatured ? 'video-card__cta video-card__cta--big' : 'video-card__cta';
  const cornerHtml = v.cornerLabel
    ? `<span class="thumb-corner">${escapeHtml(v.cornerLabel)}</span>`
    : '';

  const article = document.createElement('article');
  article.className = cardClass;
  article.dataset.videoId = v.id;
  article.dataset.country = v.country;
  article.dataset.year = String(v.year);
  article.dataset.tags = v.tags.join(', ');
  if (v.subtitlesFr) article.dataset.subtitlesFr = v.subtitlesFr;

  article.innerHTML = `
      <div class="video-card__media">
        <div class="${thumbClass}" aria-hidden="true">
          <span class="${playClass}">&#9654;</span>
          <span class="${codeClass}">${codeLabel}</span>
          ${cornerHtml}
        </div>
      </div>
      <div class="video-card__body">
        <div class="video-card__meta">
          <span class="meta-pais">${escapeHtml(v.countryLabel)}</span>
          <span class="meta-fecha">${escapeHtml(v.year)}</span>
          <span class="meta-cat">${escapeHtml(v.category)}</span>
        </div>
        <h3 class="${titleClass}">${escapeHtml(v.title)}</h3>
        <p class="video-card__desc">${escapeHtml(v.desc)}</p>
        ${buildKeypoints(v.keypoints)}
        <div class="video-card__langs">
          ${buildLangs(v.langs)}
        </div>
        <a href="${isSafeUrl(v.ctaUrl) ? escapeHtml(v.ctaUrl) : '#'}" target="_blank" rel="noopener noreferrer"
           class="${ctaClass}"${v.ctaPlaceholder ? ' data-cta-placeholder="true"' : ''}${!isSafeUrl(v.ctaUrl) ? ' data-unsafe-url-blocked="true"' : ''}>${escapeHtml(v.ctaLabel)}</a>
      </div>`;

  return article;
};

// ================================================================
// VIDEO TAG HELPERS
// ================================================================

/**
 * Get all unique tags from videos, sorted.
 * @param {Array} videos
 * @returns {string[]}
 */
export const getAllTags = (videos) => {
  const set = new Set();
  for (const v of videos) for (const t of v.tags || []) set.add(t);
  return [...set].sort((x, y) => x.localeCompare(y, 'es'));
};

/**
 * Filter videos by tag.
 * @param {Array} videos
 * @param {string|null} tag
 * @returns {Array}
 */
export const filterVideosByTag = (videos, tag) => {
  if (!tag) return videos;
  return videos.filter((v) => (v.tags || []).includes(tag));
};

// ================================================================
// GENERIC FILTER BAR (shared across articles and videos)
// ================================================================

/**
 * Build a clickable filter bar.
 * @param {string[]} values
 * @param {string|null} activeValue
 * @param {(value: string|null) => void} onSelect
 * @param {string} [allLabel]
 * @returns {HTMLElement}
 */
export const renderFilterBar = (values, activeValue, onSelect, allLabel = 'Todos') => {
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
};
