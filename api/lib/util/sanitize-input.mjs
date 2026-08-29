/**
 * api/lib/util/sanitize-input.mjs
 *
 * Pure string utility — no I/O, no framework dependency. Kept separate from
 * server.mjs so it can be unit-tested and reused without importing Express.
 *
 * Defense-in-depth only: the primary protection against injection is that
 * scripts are spawned via `child_process.spawn()` without `shell: true`
 * (see api/lib/job-manager.mjs), so argv entries are never shell-interpreted.
 * This sanitizer additionally strips control characters and caps length to
 * guard against log/DoS issues, not against shell injection.
 */

/**
 * Remove control characters and cap length.
 * @param {string} str - Input string to sanitize
 * @param {number} [maxLength=200000] - Maximum allowed length
 * @returns {string}
 */
export function sanitizeInput(str, maxLength = 200000) {
  if (typeof str !== 'string') return '';
  return str
    // eslint-disable-next-line no-control-regex -- Intentional: strips control characters, not a typo
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .substring(0, maxLength);
}
