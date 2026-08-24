/**
 * render.mjs — backwards-compatible re-export of refactored render utilities.
 *
 * This module now acts as a public API that re-exports from:
 * - render-utils.mjs (escapeHtml, sanitizeHtml, buildLangs, buildKeypoints, renderCard, etc.)
 *
 * This maintains compatibility with existing imports (articles.js, plandemismo.js, tests)
 * while allowing the internal implementation to be split into focused modules.
 */

export * from './render-utils.mjs';
