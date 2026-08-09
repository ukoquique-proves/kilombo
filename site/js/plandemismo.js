// @ts-check
// plandemismo.js — behaviour and rendering for plandemismo.html only.
// Guard: this script self-limits to pages with data-page="plandemismo".
//
// Rendering helpers (escapeHtml, buildLangs, buildKeypoints, renderCard)
// live in render.mjs so they can be unit-tested independently via
// test/render.test.mjs without pulling in the tab/DOM init logic.

import { renderCard } from './render.mjs';
import { parseJson } from './decrypt.mjs';

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
  // Data lives in assets/data/*.json — edit JSON to add/update videos.
  // renderCard() is defined in render.mjs (imported above).
  // ================================================================

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
        return res.text();
      })
      .then((text) => parseJson(text))
      .then((videos) => {
        const fragment = document.createDocumentFragment();
        videos.forEach((/** @type {import('./render.mjs').VideoEntry} */ v) =>
          fragment.appendChild(renderCard(v))
        );
        grid.appendChild(fragment);
      })
      .catch((err) => {
        console.error('[plandemismo]', err);
        grid.innerHTML =
          '<p class="tab-footer"><em>Error cargando el inventario de vídeos. Intenta recargar la página.</em></p>';
      });
  };

  // Load both tabs
  renderVideoCards('assets/data/plandemismo-actualidad.json', 'grid-actualidad');
  renderVideoCards('assets/data/plandemismo-sida-covid.json', 'grid-sida-covid');
});
