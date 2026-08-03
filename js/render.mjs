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
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );

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
  const codeLabel = v.idAlt
    ? `${escapeHtml(v.id)} · ${escapeHtml(v.idAlt)}`
    : escapeHtml(v.id);
  const titleClass = isFeatured
    ? 'video-card__title video-card__title--big'
    : 'video-card__title';
  const ctaClass = isFeatured
    ? 'video-card__cta video-card__cta--big'
    : 'video-card__cta';
  const cornerHtml = v.cornerLabel
    ? `<span class="thumb-corner">${escapeHtml(v.cornerLabel)}</span>`
    : '';
  const todoComment = v.ctaPlaceholder
    ? `<!-- TODO (A-2): reemplazar href por URL real del vídeo ${escapeHtml(v.id)} en tv.canal7salta.com -->`
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
        ${todoComment}
        <a href="${escapeHtml(v.ctaUrl)}" target="_blank" rel="noopener"
           class="${ctaClass}"${v.ctaPlaceholder ? ' data-cta-placeholder="true"' : ''}>${escapeHtml(v.ctaLabel)}</a>
      </div>`;

  return article;
};
