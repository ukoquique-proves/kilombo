// @ts-check
/**
 * scripts/lib/slugify.mjs
 *
 * Single source of truth for the slug-generation algorithm used across the
 * publishing pipeline. Extracted from scripts/import-article.mjs so that
 * scripts/lib/drafts-store.mjs can import it without transitively pulling in
 * happy-dom, render.mjs, or any other heavy dependency.
 *
 * Rules (same as ARTICLES.schema.md "id" field):
 *   - Lowercase
 *   - NFD-normalized (accents stripped)
 *   - Only [a-z0-9-] — any other run replaced with a single hyphen
 *   - No leading or trailing hyphens
 *   - Max 80 characters
 */

/**
 * Generate a URL-safe slug from a title string.
 * Output always matches /^[a-z0-9-]+$/ and is at most 80 chars.
 *
 * @param {string} title
 * @returns {string}
 */
export function slugify(title) {
  return String(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics (accents)
    .replace(/[^a-z0-9]+/g, '-') // collapse non-alphanumeric runs to hyphens
    .replace(/(^-|-$)/g, '') // strip leading/trailing hyphens
    .slice(0, 80);
}
