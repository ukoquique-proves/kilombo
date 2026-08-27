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

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeUrl, isAbsoluteOrExempt } from '../site/js/shared/url-safety.mjs';
import { hasEnoughBreaksToAnalyze } from '../site/js/shared/dewrap.mjs';
import { validateArticleEntry } from './lib/article-validator.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIDEO_DATA_DIR = resolve(__dirname, '../site/assets/data');
const CONTENT_DIR = resolve(__dirname, '../site/assets/content');

// ================================================================
// Schema definition — VIDEOS (Plandemismo)
// ================================================================

/** @typedef {{ name: string, type: string, required: boolean, validate?: (v: unknown) => string | null }} FieldRule */

/** @type {FieldRule[]} */
const BASE_RULES = [
  {
    name: 'id',
    type: 'string',
    required: true,
    validate: (v) => (String(v).trim() ? null : 'id must be non-empty'),
  },
  { name: 'country', type: 'string', required: true },
  { name: 'countryLabel', type: 'string', required: true },
  {
    name: 'year',
    type: 'number',
    required: true,
    validate: (v) => (v >= 1900 && v <= 2100 ? null : `year ${v} is out of range`),
  },
  {
    name: 'tags',
    type: 'array',
    required: true,
    validate: (v) => (Array.isArray(v) && v.length > 0 ? null : 'tags must be a non-empty array'),
  },
  { name: 'category', type: 'string', required: true },
  {
    name: 'title',
    type: 'string',
    required: true,
    validate: (v) => (String(v).trim() ? null : 'title must be non-empty'),
  },
  {
    name: 'desc',
    type: 'string',
    required: true,
    validate: (v) => (String(v).trim() ? null : 'desc must be non-empty'),
  },
  {
    name: 'langs',
    type: 'array',
    required: true,
    validate: (v) => {
      if (!Array.isArray(v) || v.length === 0) return 'langs must be a non-empty array';
      for (const chip of v) {
        if (typeof chip !== 'object' || chip === null) return 'each lang entry must be an object';
        if (typeof chip.chip !== 'string' || !chip.chip.trim())
          return 'each lang must have a non-empty chip string';
        if (typeof chip.label !== 'string' || !chip.label.trim())
          return 'each lang must have a non-empty label string';
        if ('title' in chip && typeof chip.title !== 'string')
          return 'lang.title must be a string if present';
      }
      return null;
    },
  },
  {
    name: 'ctaUrl',
    type: 'string',
    required: true,
    validate: (v) => {
      if (!isSafeUrl(v))
        return `ctaUrl "${v}" uses a forbidden scheme (javascript:/data:/vbscript:)`;
      if (!isAbsoluteOrExempt(v))
        return `ctaUrl "${v}" must be an absolute https?:// URL (or # / mailto:)`;
      return null;
    },
  },
  {
    name: 'ctaLabel',
    type: 'string',
    required: true,
    validate: (v) => (String(v).trim() ? null : 'ctaLabel must be non-empty'),
  },
];

/** Optional fields with type checks */
/** @type {FieldRule[]} */
const OPTIONAL_RULES = [
  { name: 'idAlt', type: 'string', required: false },
  { name: 'subtitlesFr', type: 'string', required: false },
  { name: 'featured', type: 'boolean', required: false },
  { name: 'cornerLabel', type: 'string', required: false },
  { name: 'ctaPlaceholder', type: 'boolean', required: false },
  {
    name: 'keypoints',
    type: 'array',
    required: false,
    validate: (v) => {
      if (!Array.isArray(v)) return 'keypoints must be an array';
      for (const kp of v) {
        if (typeof kp !== 'string' || !kp.trim()) return 'each keypoint must be a non-empty string';
      }
      return null;
    },
  },
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
function validateVideoEntry(entry, file, index) {
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
// Validator
// ================================================================
// Uses the same MIN_BR_COUNT signal as dewrap.mjs (via the shared
// hasEnoughBreaksToAnalyze() export) plus a local short-line check, so an
// "imported" article that somehow bypassed the import-article.mjs
// dewrapHardBreaks() step (step 3.5) — e.g. a manual JSON edit — gets
// flagged for review instead of silently shipping as unreadable walls of
// text. Deliberately a warning, not an error: flagging is a prompt for a
// human to check `status`, not proof the content is actually broken.

/** Local mirror of dewrap.mjs's LONG_LINE_THRESHOLD — see that module for
 * the full rationale. Duplicated (not imported) so this warning stays a
 * simple, independent read of dewrap.mjs's public signal rather than
 * reaching into its internal reflow logic. */
const HARD_WRAP_LONG_LINE_THRESHOLD = 180;

/**
 * @param {string} contentHtml
 * @returns {{ brCount: number, minLineLength: number } | null}
 */
function detectHardWrapWarning(contentHtml) {
  const paragraphs = contentHtml.match(/<p>([\s\S]*?)<\/p>/gi) || [];
  for (const block of paragraphs) {
    const inner = block.replace(/^<p>/i, '').replace(/<\/p>$/i, '');
    if (!hasEnoughBreaksToAnalyze(inner)) continue;

    const lines = inner
      .split(/<br\s*\/?>/i)
      .map((l) => l.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const minLineLength = Math.min(...lines.map((l) => l.length));
    if (minLineLength < HARD_WRAP_LONG_LINE_THRESHOLD) {
      const brCount = (inner.match(/<br\s*\/?>/gi) || []).length;
      return { brCount, minLineLength };
    }
  }
  return null;
}

/**
 * Scans already-validated article entries for likely hard-wrapped content
 * and prints a warning (never fails the build). Kept separate from
 * validateArticleEntry()/ARTICLE_RULES so a warning can never accidentally
 * become a blocking error just by editing the rules list.
 * @param {unknown[]} entries
 * @param {string} label
 */
function warnHardWrappedArticles(entries, label) {
  let warned = 0;
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    const obj = /** @type {Record<string, unknown>} */ (entry);
    if (obj.status !== 'imported' || typeof obj.contentHtml !== 'string') continue;

    const hit = detectHardWrapWarning(obj.contentHtml);
    if (hit) {
      warned++;
      console.warn(
        `⚠️  ${label}/${obj.id} — posible hard-wrapped content: ${hit.brCount} breaks ` +
          `en párrafo de ${hit.minLineLength} chars. Considerar status='pending-review' ` +
          `o re-ejecutar dewrapHardBreaks() (ver scripts/backfill-dewrap.mjs).`
      );
    }
  }
  return warned;
}

// ================================================================
// Main — scan JSON files (multi-schema)
// ================================================================

/**
 * @param {{ dir: string, label: string, validateEntry: (entry: unknown, file: string, index: number) => string[] }} cfg
 * @returns {{ entries: number, errors: number, files: number }}
 */
function scanDir(cfg) {
  if (!existsSync(cfg.dir)) {
    // Directorio opcional: si no existe, no falla el build.
    return { entries: 0, errors: 0, files: 0 };
  }

  let files;
  try {
    files = readdirSync(cfg.dir).filter((f) => f.endsWith('.json'));
  } catch (e) {
    console.error(`❌  Could not read ${cfg.label} directory: ${cfg.dir} — ${e.message}`);
    return { entries: 0, errors: 1, files: 0 };
  }

  if (files.length === 0) return { entries: 0, errors: 0, files: 0 };

  let totalEntries = 0;
  let totalErrors = 0;

  for (const file of files) {
    const filePath = join(cfg.dir, file);
    let data;

    try {
      data = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error(`❌  ${cfg.label}/${file}: invalid JSON — ${e.message}`);
      totalErrors++;
      continue;
    }

    if (!Array.isArray(data)) {
      console.error(`❌  ${cfg.label}/${file}: top-level value must be an array`);
      totalErrors++;
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
    }
  }

  return { entries: totalEntries, errors: totalErrors, files: files.length };
}

const videoScan = scanDir({
  dir: VIDEO_DATA_DIR,
  label: 'data',
  validateEntry: validateVideoEntry,
});

const contentScan = scanDir({
  dir: CONTENT_DIR,
  label: 'content',
  validateEntry: validateArticleEntry,
});

// ================================================================
// id uniqueness (per file) — ARTICLES.schema.md documents id as "unique"
// but per-entry validateArticleEntry() has no visibility across entries to
// enforce that. A collision was previously only prevented by
// scripts/import-article.mjs's checkDedup(), and only for the explicit
// --id flag — an auto-slugified id was never checked at all (see
// checkFinalIdCollision() in import-article.mjs). This is the CI-time
// safety net: it catches a collision regardless of how the JSON got
// edited (script or by hand), before deploy.yml runs `npm test`.
// ================================================================
let idUniquenessErrors = 0;
if (existsSync(CONTENT_DIR)) {
  for (const file of readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(CONTENT_DIR, file), 'utf8'));
    } catch {
      continue; // already reported as a JSON parse error above
    }
    if (!Array.isArray(data)) continue;

    const seen = new Map(); // id -> first index seen
    for (let i = 0; i < data.length; i++) {
      const entry = data[i];
      if (typeof entry !== 'object' || entry === null || typeof entry.id !== 'string') continue;
      if (seen.has(entry.id)) {
        console.error(
          `❌  content/${file}[${i}].id: duplicate id "${entry.id}" ` +
            `(first seen at index ${seen.get(entry.id)}) — ids must be unique, ` +
            `see ARTICLES.schema.md`
        );
        idUniquenessErrors++;
      } else {
        seen.set(entry.id, i);
      }
    }
  }
}

// ================================================================
// sourceUrl uniqueness (global, across all files) — ARTICLES.schema.md
// documents sourceUrl as "unique per article" to ensure each source is
// attributed to exactly one article. A duplicate sourceUrl suggests either:
// 1. Editorial error (same article imported twice)
// 2. Intentional re-import without updating sourceUrl
// 3. Multiple articles from same source (should use different URLs if possible)
// This CI-time safety net catches duplicates before deploy.
// ================================================================
let sourceUrlUniquenessErrors = 0;
const seenSourceUrls = new Map(); // sourceUrl -> { file, index }
if (existsSync(CONTENT_DIR)) {
  for (const file of readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(CONTENT_DIR, file), 'utf8'));
    } catch {
      continue; // already reported as a JSON parse error above
    }
    if (!Array.isArray(data)) continue;
    for (let i = 0; i < data.length; i++) {
      const entry = data[i];
      if (typeof entry !== 'object' || entry === null || typeof entry.sourceUrl !== 'string')
        continue;
      const url = entry.sourceUrl;
      if (seenSourceUrls.has(url)) {
        const first = seenSourceUrls.get(url);
        console.error(
          `❌  content/${file}[${i}].sourceUrl: duplicate sourceUrl "${url}" ` +
            `(first seen in ${first.file}[${first.index}]) — sourceUrls must be unique, ` +
            `see ARTICLES.schema.md`
        );
        sourceUrlUniquenessErrors++;
      } else {
        seenSourceUrls.set(url, { file, index: i });
      }
    }
  }
}

// Hard-wrap warning pass (TO_FIX #48) — separate from scanDir/validateEntry
// on purpose: this must never affect totalErrors/exit code, so it reads the
// content files independently rather than piggybacking on the pass/fail
// validation loop above.
let hardWrapWarnings = 0;
if (existsSync(CONTENT_DIR)) {
  for (const file of readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      const data = JSON.parse(readFileSync(join(CONTENT_DIR, file), 'utf8'));
      if (Array.isArray(data)) {
        hardWrapWarnings += warnHardWrappedArticles(data, `content/${file}`);
      }
    } catch {
      // Malformed JSON is already reported as an error by scanDir above.
    }
  }
}
if (hardWrapWarnings > 0) {
  console.log(
    `\n${hardWrapWarnings} article(s) flagged for manual formatting review (warning only, does not fail the build).`
  );
}

const totalEntries = videoScan.entries + contentScan.entries;
const totalErrors =
  videoScan.errors + contentScan.errors + idUniquenessErrors + sourceUrlUniquenessErrors;
const totalFiles = videoScan.files + contentScan.files;

if (totalFiles === 0) {
  console.log(
    '⚠️   No JSON files found under site/assets/data/ or site/assets/content/ — nothing to validate.'
  );
  process.exit(0);
}

console.log('');
console.log(`Checked ${totalEntries} entries across ${totalFiles} file(s).`);

if (totalErrors > 0) {
  console.error(`${totalErrors} error(s) found — fix before deploying.`);
  process.exit(1);
}

console.log('All data files are valid.');
process.exit(0);
