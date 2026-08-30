// @ts-check
/**
 * Validation for command-endpoint fields shared across api/server.mjs
 * command routes. Extracted from inline checks that were duplicated
 * per-route — behavior is unchanged, this only centralizes it.
 */

export const VALID_SECTIONS = ['general', 'actualidad', 'tierra', 'nom', 'pi', 'gci'];

export const VALID_STATUSES = ['publie', 'prepa', 'prop', 'refuse', 'poubelle'];

/**
 * A section is valid if it's one of the known slugs, OR a bare numeric
 * string (a SPIP rubrique ID passed directly).
 * @param {string} section
 * @returns {boolean}
 */
export function isValidSection(section) {
  return VALID_SECTIONS.includes(section) || /^\d+$/.test(section);
}

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isValidStatus(status) {
  return VALID_STATUSES.includes(status);
}
