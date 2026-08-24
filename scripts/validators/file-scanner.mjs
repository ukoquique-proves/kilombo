/**
 * scripts/validators/file-scanner.mjs
 *
 * Utility for scanning and parsing JSON files in a directory.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Scan a directory for JSON files and validate each entry.
 * @param {Object} cfg
 * @param {string} cfg.dir - directory to scan
 * @param {string} cfg.label - label for error messages
 * @param {(entry: unknown, file: string, index: number) => string[]} cfg.validateEntry - validator function
 * @returns {{ entries: number, errors: number, files: number, details: { file: string, errors: string[] }[] }}
 */
export function scanDirectory(cfg) {
  const details = [];

  if (!existsSync(cfg.dir)) {
    // Optional directory: if it doesn't exist, don't fail
    return { entries: 0, errors: 0, files: 0, details };
  }

  let files;
  try {
    files = readdirSync(cfg.dir).filter((f) => f.endsWith('.json'));
  } catch (e) {
    console.error(
      `❌  Could not read ${cfg.label} directory: ${cfg.dir} — ${e.message}`
    );
    return { entries: 0, errors: 1, files: 0, details };
  }

  if (files.length === 0) return { entries: 0, errors: 0, files: 0, details };

  let totalEntries = 0;
  let totalErrors = 0;

  for (const file of files) {
    const filePath = join(cfg.dir, file);
    let data;

    try {
      data = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error(
        `❌  ${cfg.label}/${file}: invalid JSON — ${e.message}`
      );
      totalErrors++;
      details.push({ file: `${cfg.label}/${file}`, errors: [e.message] });
      continue;
    }

    if (!Array.isArray(data)) {
      const err = `top-level value must be an array`;
      console.error(`❌  ${cfg.label}/${file}: ${err}`);
      totalErrors++;
      details.push({ file: `${cfg.label}/${file}`, errors: [err] });
      continue;
    }

    const fileErrors = [];
    for (let i = 0; i < data.length; i++) {
      const errs = cfg.validateEntry(data[i], `${cfg.label}/${file}`, i);
      fileErrors.push(...errs);
    }

    totalEntries += data.length;

    if (fileErrors.length === 0) {
      console.log(
        `✅  ${cfg.label}/${file} — ${data.length} entr${data.length === 1 ? 'y' : 'ies'} valid`
      );
    } else {
      fileErrors.forEach((e) => console.error(`❌  ${e}`));
      totalErrors += fileErrors.length;
      details.push({ file: `${cfg.label}/${file}`, errors: fileErrors });
    }
  }

  return { entries: totalEntries, errors: totalErrors, files: files.length, details };
}

/**
 * Load all JSON files from a directory.
 * @param {string} dir
 * @returns {Map<string, unknown[]>}
 */
export function loadAllJson(dir) {
  const result = new Map();

  if (!existsSync(dir)) return result;

  try {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        if (Array.isArray(data)) {
          result.set(file, data);
        }
      } catch {
        // Errors already reported during schema validation
      }
    }
  } catch {
    // Directory read errors already reported during schema validation
  }

  return result;
}
