#!/usr/bin/env node
/**
 * scripts/validate-data.mjs
 *
 * Validates the shape of all JSON data files under site/assets/data/.
 * Fails loudly (exit 1) if any required field is missing, has the wrong
 * type, or has a clearly invalid value — so a malformed entry is caught
 * before it silently renders blank or breaks the grid.
 *
 * Run with:   node scripts/validate-data.mjs
 * Or via:     ./scripts/test.sh
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../site/assets/data');

// ================================================================
// Schema definition
// ================================================================

/** @typedef {{ name: string, type: string, required: boolean, validate?: (v: unknown) => string | null }} FieldRule */

/** @type {FieldRule[]} */
const BASE_RULES = [
  { name: 'id',           type: 'string',  required: true,
    validate: (v) => String(v).trim() ? null : 'id must be non-empty' },
  { name: 'country',      type: 'string',  required: true },
  { name: 'countryLabel', type: 'string',  required: true },
  { name: 'year',         type: 'number',  required: true,
    validate: (v) => (v >= 1900 && v <= 2100) ? null : `year ${v} is out of range` },
  { name: 'tags',         type: 'array',   required: true,
    validate: (v) => Array.isArray(v) && v.length > 0 ? null : 'tags must be a non-empty array' },
  { name: 'category',     type: 'string',  required: true },
  { name: 'title',        type: 'string',  required: true,
    validate: (v) => String(v).trim() ? null : 'title must be non-empty' },
  { name: 'desc',         type: 'string',  required: true,
    validate: (v) => String(v).trim() ? null : 'desc must be non-empty' },
  { name: 'langs',        type: 'array',   required: true,
    validate: (v) => {
      if (!Array.isArray(v) || v.length === 0) return 'langs must be a non-empty array';
      for (const chip of v) {
        if (typeof chip !== 'object' || chip === null) return 'each lang entry must be an object';
        if (typeof chip.chip !== 'string' || !chip.chip.trim()) return 'each lang must have a non-empty chip string';
        if (typeof chip.label !== 'string' || !chip.label.trim()) return 'each lang must have a non-empty label string';
        if ('title' in chip && typeof chip.title !== 'string') return 'lang.title must be a string if present';
      }
      return null;
    }},
  { name: 'ctaUrl',       type: 'string',  required: true,
    validate: (v) => {
      try { new URL(String(v)); return null; }
      catch { return `ctaUrl "${v}" is not a valid URL`; }
    }},
  { name: 'ctaLabel',     type: 'string',  required: true,
    validate: (v) => String(v).trim() ? null : 'ctaLabel must be non-empty' },
];

/** Optional fields with type checks */
/** @type {FieldRule[]} */
const OPTIONAL_RULES = [
  { name: 'idAlt',        type: 'string',  required: false },
  { name: 'subtitlesFr',  type: 'string',  required: false },
  { name: 'featured',     type: 'boolean', required: false },
  { name: 'cornerLabel',  type: 'string',  required: false },
  { name: 'ctaPlaceholder', type: 'boolean', required: false },
  { name: 'keypoints',    type: 'array',   required: false,
    validate: (v) => {
      if (!Array.isArray(v)) return 'keypoints must be an array';
      for (const kp of v) {
        if (typeof kp !== 'string' || !kp.trim()) return 'each keypoint must be a non-empty string';
      }
      return null;
    }},
];

// ================================================================
// Validator
// ================================================================

/**
 * @param {unknown} entry
 * @param {string} file
 * @param {number} index
 * @returns {string[]} list of error messages
 */
function validateEntry(entry, file, index) {
  const errors = [];
  const prefix = `${file}[${index}]`;

  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return [`${prefix}: entry must be a plain object`];
  }

  const obj = /** @type {Record<string, unknown>} */ (entry);

  for (const rule of [...BASE_RULES, ...OPTIONAL_RULES]) {
    const value = obj[rule.name];
    const present = rule.name in obj;

    if (rule.required && !present) {
      errors.push(`${prefix}: missing required field "${rule.name}"`);
      continue;
    }
    if (!present) continue;

    // Type check (loose: 'array' is typeof 'object')
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      errors.push(`${prefix}.${rule.name}: expected ${rule.type}, got ${actualType}`);
      continue;
    }

    // Custom validation
    if (rule.validate) {
      const msg = rule.validate(value);
      if (msg) errors.push(`${prefix}.${rule.name}: ${msg}`);
    }
  }

  return errors;
}

// ================================================================
// Main — scan all JSON files in data dir
// ================================================================

let jsonFiles;
try {
  jsonFiles = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
} catch {
  console.error(`❌  Could not read data directory: ${DATA_DIR}`);
  console.error('    Run from the project root, or check that site/assets/data/ exists.');
  process.exit(1);
}

if (jsonFiles.length === 0) {
  console.log('⚠️   No JSON files found in site/assets/data/ — nothing to validate.');
  process.exit(0);
}

let totalEntries = 0;
let totalErrors = 0;

for (const file of jsonFiles) {
  const filePath = join(DATA_DIR, file);
  let data;

  try {
    data = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`❌  ${file}: invalid JSON — ${e.message}`);
    totalErrors++;
    continue;
  }

  if (!Array.isArray(data)) {
    console.error(`❌  ${file}: top-level value must be an array`);
    totalErrors++;
    continue;
  }

  const fileErrors = [];
  for (let i = 0; i < data.length; i++) {
    const errs = validateEntry(data[i], file, i);
    fileErrors.push(...errs);
  }

  totalEntries += data.length;

  if (fileErrors.length === 0) {
    console.log(`✅  ${file} — ${data.length} entr${data.length === 1 ? 'y' : 'ies'} valid`);
  } else {
    fileErrors.forEach((e) => console.error(`❌  ${e}`));
    totalErrors += fileErrors.length;
  }
}

console.log('');
console.log(`Checked ${totalEntries} entries across ${jsonFiles.length} file(s).`);

if (totalErrors > 0) {
  console.error(`${totalErrors} error(s) found — fix before deploying.`);
  process.exit(1);
} else {
  console.log('All data files are valid.');
  process.exit(0);
}
