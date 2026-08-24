/**
 * scripts/validators/data-integrity.mjs
 *
 * Data integrity checks: uniqueness constraints, cross-file consistency.
 * Runs after schema validation to catch logical errors.
 */

/**
 * Check for duplicate IDs within a file.
 * @param {unknown[]} entries
 * @param {string} file
 * @returns {{ duplicates: number, errors: string[] }}
 */
export function checkIdUniqueness(entries, file) {
  const errors = [];
  const seen = new Map(); // id -> first index

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (typeof entry !== 'object' || entry === null || typeof entry.id !== 'string') continue;

    if (seen.has(entry.id)) {
      errors.push(
        `${file}[${i}].id: duplicate id "${entry.id}" ` +
          `(first seen at index ${seen.get(entry.id)}) — ids must be unique, ` +
          `see ARTICLES.schema.md`
      );
    } else {
      seen.set(entry.id, i);
    }
  }

  return { duplicates: errors.length, errors };
}

/**
 * Check for duplicate sourceUrls across all files.
 * @param {Map<string, unknown[]>} fileEntries - Map of filename -> entries
 * @returns {{ duplicates: number, errors: string[] }}
 */
export function checkSourceUrlUniqueness(fileEntries) {
  const errors = [];
  const seenSourceUrls = new Map(); // sourceUrl -> { file, index }

  for (const [file, entries] of fileEntries.entries()) {
    if (!Array.isArray(entries)) continue;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (typeof entry !== 'object' || entry === null || typeof entry.sourceUrl !== 'string')
        continue;

      const url = entry.sourceUrl;
      if (seenSourceUrls.has(url)) {
        const first = seenSourceUrls.get(url);
        errors.push(
          `${file}[${i}].sourceUrl: duplicate sourceUrl "${url}" ` +
            `(first seen in ${first.file}[${first.index}]) — sourceUrls must be unique, ` +
            `see ARTICLES.schema.md`
        );
      } else {
        seenSourceUrls.set(url, { file, index: i });
      }
    }
  }

  return { duplicates: errors.length, errors };
}
