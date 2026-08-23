/**
 * render.mjs — pure rendering helpers for Kilombo video cards.
 *
 * Exported as an ES module so both plandemismo.js (browser) and
 * test/render.test.mjs (Node) can import the same code without duplication.
 *
 * No DOM globals are used in escapeHtml / buildLangs / buildKeypoints.
 * renderCard() uses document.createElement — tests that exercise it must
 * either run in a browser context or supply a DOM shim (e.g. happy-dom).
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
 * Run every JSON-sourced value through this before placing it in
 * innerHTML, including href values (guards against " onmouseover=...
 * attribute breakout).
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
// HTML SANITIZATION (for editorial rich-text content, e.g. articles)
// ================================================================

/**
 * Tags allowed to survive sanitization, with the attributes each may keep.
 * Anything not listed here is stripped: the tag is unwrapped (its safe
 * children are kept) rather than dropped wholesale, so legitimate text
 * inside an unknown wrapper tag is not silently lost.
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
 * Tags whose *content* is unsafe to keep even as plain text (script bodies,
 * stylesheets, etc.) — these are removed entirely, tag and children alike,
 * unlike other disallowed tags which are unwrapped but keep their text.
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
 * Recursively copy the safe subset of `source`'s children into `target`,
 * dropping disallowed tags (but keeping their text/children content) and
 * disallowed attributes, and neutralizing unsafe URLs.
 * @param {Node} source
 * @param {Node} target
 */
const sanitizeInto = (source, target) => {
  for (const node of Array.from(source.childNodes)) {
    if (node.nodeType === 3) {
      // Text node — always safe, copy as-is (no HTML is parsed from it).
      target.appendChild(document.createTextNode(node.textContent));
      continue;
    }
    if (node.nodeType !== 1) continue; // skip comments, etc.

    const tag = /** @type {Element} */ (node).tagName;
    if (SANITIZE_DROP_ENTIRELY.has(tag)) {
      // Unsafe even as plain text (e.g. a <script> body) — drop tag and children.
      continue;
    }
    if (!SANITIZE_ALLOWED_TAGS.has(tag)) {
      // Merely unknown/unstyled tag: drop the tag itself, keep its safe content.
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
    // Any external link gets forced-safe rel/target regardless of source markup.
    if (tag === 'A' && el.hasAttribute('href')) {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }

    sanitizeInto(node, el);
    target.appendChild(el);
  }
};

/**
 * Sanitize an HTML string down to a small allowlist of formatting tags,
 * suitable for content that comes from a JSON data file rather than from
 * hand-written, reviewed template code. Strips <script>, event-handler
 * attributes (onerror, onclick, ...), javascript:/data: URLs, and any tag
 * not in the allowlist — while preserving the safe text/markup around it.
 *
 * Note: the input is parsed into a *detached* element (never inserted into
 * the live document), so no embedded script or event handler can execute
 * during parsing — only the resulting sanitized tree is ever attached.
 *
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
// CARD FRAGMENT BUILDERS
// ================================================================

/**
 * Build the lang chips HTML for a video card.
 * All JSON-sourced values are escaped.
 *
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
 * Build the keypoints list HTML (only for featured cards).
 * All JSON-sourced values are escaped.
 *
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

// ================================================================
// CARD RENDERER
// ================================================================

/**
 * @typedef {Object} LangChip
 * @property {string} chip
 * @property {string} label
 * @property {string} [title]
 */

/**
 * @typedef {Object} VideoEntry
 * @property {string}     id
 * @property {string}     [idAlt]
 * @property {string}     country
 * @property {string}     countryLabel
 * @property {number}     year
 * @property {string[]}   tags
 * @property {string}     category
 * @property {string}     title
 * @property {string}     desc
 * @property {string[]}   [keypoints]
 * @property {LangChip[]} langs
 * @property {string}     [subtitlesFr]
 * @property {boolean}    [featured]
 * @property {string}     [cornerLabel]
 * @property {string}     ctaUrl
 * @property {string}     ctaLabel
 * @property {boolean}    [ctaPlaceholder]
 */

/**
 * Render a single video card as an <article> HTMLElement.
 * Requires a DOM environment (browser or compatible shim).
 *
 * @param {VideoEntry} v
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
// GENERIC FILTER BAR
// Shared by site/js/articles.js (topics) and site/js/plandemismo.js
// (tags) — one implementation instead of two copies that could drift.
// ================================================================

/**
 * Builds a clickable filter bar as real <button> elements — never <a>, so
 * it's keyboard-accessible and safe to place anywhere, including directly
 * above card grids where the cards themselves are links.
 *
 * @param {string[]} values           - the filterable values (topics or tags)
 * @param {string|null} activeValue   - currently selected value, or null for "show all"
 * @param {(value: string|null) => void} onSelect
 * @param {string} [allLabel]         - label for the "clear filter" button
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

// ================================================================
// VIDEO TAG HELPERS (plandemismo.js)
// ================================================================

/**
 * @param {VideoEntry[]} videos
 * @returns {string[]} deduplicated, alphabetically sorted (es collation)
 */
export const getAllTags = (videos) => {
  const set = new Set();
  for (const v of videos) for (const t of v.tags || []) set.add(t);
  return [...set].sort((x, y) => x.localeCompare(y, 'es'));
};

/**
 * @param {VideoEntry[]} videos
 * @param {string|null} tag  null/'' means "no filter, show all"
 * @returns {VideoEntry[]}
 */
export const filterVideosByTag = (videos, tag) => {
  if (!tag) return videos;
  return videos.filter((v) => (v.tags || []).includes(tag));
};
