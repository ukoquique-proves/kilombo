// @ts-check
// plandemismo.js — behaviour and rendering for plandemismo.html only.
// Guard: this script self-limits to pages with data-page="plandemismo".

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'plandemismo') return;

  // ================================================================
  // TABS — WAI-ARIA tablist with roving tabindex
  // ================================================================

  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));

  /** @param {Element} tab */
  const isEnabled = (tab) => tab.getAttribute('aria-disabled') !== 'true';

  const getEnabledTabs = () => tabs.filter(isEnabled);

  /** @param {Element} activeTab */
  const updateRovingTabindex = (activeTab) => {
    tabs.forEach((t) => {
      t.setAttribute('tabindex', t === activeTab ? '0' : '-1');
    });
  };

  /** @param {Element} targetTab */
  const activateTab = (targetTab) => {
    if (!isEnabled(targetTab)) return;
    const targetId = /** @type {HTMLElement} */ (targetTab).dataset.tab;

    tabs.forEach((t) => {
      const isActive = t === targetTab;
      t.classList.toggle('tab--active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });

    panels.forEach((panel) => {
      const shouldShow = panel.id === `tab-${targetId}`;
      panel.classList.toggle('tab-panel--hidden', !shouldShow);
    });

    updateRovingTabindex(targetTab);
    /** @type {HTMLElement} */ (targetTab).focus();
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab));

    tab.addEventListener('keydown', (e) => {
      const ke = /** @type {KeyboardEvent} */ (e);
      const enabledTabs = getEnabledTabs();
      const currentIdx = enabledTabs.indexOf(tab);
      if (currentIdx === -1) return;

      let nextIdx = null;

      switch (ke.key) {
        case 'ArrowRight':
          ke.preventDefault();
          nextIdx = (currentIdx + 1) % enabledTabs.length;
          break;
        case 'ArrowLeft':
          ke.preventDefault();
          nextIdx = (currentIdx - 1 + enabledTabs.length) % enabledTabs.length;
          break;
        case 'Home':
          ke.preventDefault();
          nextIdx = 0;
          break;
        case 'End':
          ke.preventDefault();
          nextIdx = enabledTabs.length - 1;
          break;
        case 'Enter':
        case ' ':
          ke.preventDefault();
          activateTab(tab);
          return;
        default:
          return;
      }

      if (nextIdx !== null) {
        const nextTab = enabledTabs[nextIdx];
        updateRovingTabindex(nextTab);
        /** @type {HTMLElement} */ (nextTab).focus();
      }
    });
  });

  // Seed roving tabindex on load
  const initialActive =
    tabs.find((t) => t.classList.contains('tab--active') && isEnabled(t)) ||
    getEnabledTabs()[0];
  if (initialActive) updateRovingTabindex(initialActive);

  // ================================================================
  // VIDEO CARD RENDERER
  // Reads JSON from assets/data/ and builds card DOM dynamically.
  // Adding a new video = edit the JSON. No HTML changes needed.
  // ================================================================

  /**
   * Escape a string for safe interpolation into HTML text content or
   * attribute values. Covers the five characters that can break markup
   * or allow attribute injection: & < > " '
   * Run every JSON-sourced value through this before placing it in
   * innerHTML, including href values (guards against " onmouseover=... escapes).
   * @param {unknown} s
   * @returns {string}
   */
  const escapeHtml = (s) =>
    String(s === null || s === undefined ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
    );

  /**
   * Build the lang chips HTML for a video card.
   * @param {Array<{chip: string, label: string, title?: string}>} langs
   * @returns {string}
   */
  const buildLangs = (langs) =>
    langs
      .map((l) => {
        const titleAttr = l.title ? ` title="${escapeHtml(l.title)}"` : '';
        return `<span class="lang-chip lang-chip--${escapeHtml(l.chip)}"${titleAttr}>${escapeHtml(l.label)}</span>`;
      })
      .join('\n            ');

  /**
   * Build the keypoints list HTML (only for featured cards).
   * @param {string[] | undefined} keypoints
   * @returns {string}
   */
  const buildKeypoints = (keypoints) => {
    if (!keypoints || keypoints.length === 0) return '';
    const items = keypoints.map((kp) => `<li>${escapeHtml(kp)}</li>`).join('\n            ');
    return `
          <ul class="video-card__keypoints">
            ${items}
          </ul>`;
  };

  /**
   * Render a single video card article element.
   * @param {Object} v - video data object from JSON
   * @returns {HTMLElement}
   */
  const renderCard = (v) => {
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

  /**
   * Fetch a JSON file and render its video cards into a grid container.
   * @param {string} jsonPath - relative path to the JSON data file
   * @param {string} gridId   - id of the target .video-grid element
   */
  const renderVideoCards = (jsonPath, gridId) => {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    fetch(jsonPath)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${jsonPath}: ${res.status}`);
        return res.json();
      })
      .then((videos) => {
        const fragment = document.createDocumentFragment();
        videos.forEach((/** @type {Object} */ v) => fragment.appendChild(renderCard(v)));
        grid.appendChild(fragment);
      })
      .catch((err) => {
        console.error('[plandemismo]', err);
        grid.innerHTML = `<p class="tab-footer"><em>Error cargando el inventario de vídeos. Intenta recargar la página.</em></p>`;
      });
  };

  // Load both tabs
  renderVideoCards('assets/data/plandemismo-actualidad.json', 'grid-actualidad');
  renderVideoCards('assets/data/plandemismo-sida-covid.json', 'grid-sida-covid');
});
