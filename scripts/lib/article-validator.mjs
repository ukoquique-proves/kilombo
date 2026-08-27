/**
 * scripts/lib/article-validator.mjs
 *
 * Validates the shape of article entries (JSON → contentHtml).
 * Extracted from scripts/validate-data.mjs (TO_FIX #78) so the validation
 * logic can be reused by the dashboard draft pipeline without pulling in
 * validate-data.mjs's file-scanning loop and process.exit() side effects.
 *
 * @module
 */

import { isSafeUrl, isAbsoluteOrExempt } from '../../site/js/shared/url-safety.mjs';

// ================================================================
// Schema definition — ARTÍCULOS (JSON → contentHtml)
// ================================================================

export const ARTICLE_STATUS = new Set([
  'imported',
  'adapted',
  'translated',
  'pending-review',
  'external-only',
]);

// ARTICLES.schema.md documents id as "lowercase alphanumeric + hyphens, max
// 80 chars" — matches scripts/import-article.mjs's slugify() output exactly,
// so a well-formed id here should always be producible by the same pipeline
// that generates it. Catches manual JSON edits that don't go through slugify().
export const ID_FORMAT_RE = /^[a-z0-9-]+$/;
export const ID_MAX_LENGTH = 80;

/** @typedef {{ name: string, type: string, required: boolean, validate?: (v: unknown) => string | null }} FieldRule */

/** @type {FieldRule[]} */
export const ARTICLE_RULES = [
  {
    name: 'id',
    type: 'string',
    required: true,
    validate: (v) => {
      const s = String(v);
      if (!s.trim()) return 'id must be non-empty';
      if (s.length > ID_MAX_LENGTH)
        return `id must be at most ${ID_MAX_LENGTH} chars (got ${s.length})`;
      if (!ID_FORMAT_RE.test(s))
        return 'id must be lowercase alphanumeric + hyphens only (matches scripts/import-article.mjs slugify() output)';
      return null;
    },
  },
  {
    name: 'title',
    type: 'string',
    required: true,
    validate: (v) => (String(v).trim() ? null : 'title must be non-empty'),
  },
  {
    name: 'date',
    type: 'string',
    required: false,
    validate: (v) => {
      // Permite vacío, pero si hay contenido, exige YYYY-MM-DD.
      const s = String(v).trim();
      if (!s) return null;
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? null : 'date must be YYYY-MM-DD (or empty)';
    },
  },
  {
    name: 'section',
    type: 'string',
    required: true,
    validate: (v) => (String(v).trim() ? null : 'section must be non-empty'),
  },
  {
    name: 'topics',
    type: 'array',
    required: true,
    validate: (v) => {
      if (!Array.isArray(v)) return 'topics must be an array';
      for (const t of v) {
        if (typeof t !== 'string' || !t.trim()) return 'each topic must be a non-empty string';
      }
      return null;
    },
  },
  {
    name: 'sourceSite',
    type: 'string',
    required: true,
    validate: (v) => (String(v).trim() ? null : 'sourceSite must be non-empty'),
  },
  {
    name: 'sourceUrl',
    type: 'string',
    required: true,
    validate: (v) => {
      if (!isSafeUrl(v))
        return `sourceUrl "${v}" uses a forbidden scheme (javascript:/data:/vbscript:)`;
      if (!isAbsoluteOrExempt(v))
        return `sourceUrl "${v}" must be an absolute https?:// URL (or # / mailto:)`;
      return null;
    },
  },
  {
    name: 'status',
    type: 'string',
    required: true,
    validate: (v) =>
      ARTICLE_STATUS.has(String(v))
        ? null
        : `status must be one of: ${Array.from(ARTICLE_STATUS).join(', ')}`,
  },
  {
    name: 'contentHtml',
    type: 'string',
    required: true,
    validate: (v) => {
      const s = String(v);
      if (!s.trim()) return 'contentHtml must be non-empty';
      // Defense in depth: site/js/render.mjs sanitizeHtml() strips these at
      // render time regardless, but flagging them here blocks a bad import
      // at CI time (npm test, run by deploy.yml before every publish)
      // instead of relying solely on the runtime sanitizer.
      if (/<script[\s>]/i.test(s)) return 'contentHtml must not contain <script> tags';
      if (/\son\w+\s*=/i.test(s))
        return 'contentHtml must not contain inline event-handler attributes (on...=)';
      // Normalized the same way isSafeUrl() does: browsers strip control
      // characters (tab/newline/CR) from anywhere in a URL before parsing
      // its scheme, so "jav\tascript:" resolves to "javascript:" at
      // render time even though it doesn't match this pattern literally.
      if (
        /(?:href|src)\s*=\s*["']?\s*(?:javascript|data|vbscript):/i.test(
          // eslint-disable-next-line no-control-regex -- Intentional control-character stripping to defend against XSS via hidden schemes
          s.replace(/[\x00-\x1F\x7F]+/g, '')
        )
      ) {
        return 'contentHtml must not contain javascript:/data:/vbscript: URLs';
      }
      const urlError = validateContentHtmlUrls(s);
      if (urlError) return urlError;
      return null;
    },
  },
];

// Optional media fields (TO_FIX #39.x / v0.39.1): documented in
// ARTICLES.schema.md and rendered by site/js/articles.js's initDetailPage(),
// but previously never validated here — a malformed metadata/externalLinks
// value could pass `npm test` and only surface at render time. Added as a
// CI-time safety net so a bad import is caught before deploy, not after.
/** @type {FieldRule[]} */
export const ARTICLE_OPTIONAL_RULES = [
  {
    name: 'language',
    type: 'string',
    required: false,
    validate: (v) => {
      const valid = ['ES', 'FR', 'EN'];
      return valid.includes(String(v).toUpperCase())
        ? null
        : `language must be one of: ${valid.join(', ')} (got "${v}")`;
    },
  },
  {
    name: 'author',
    type: 'string',
    required: false,
    validate: (v) => (String(v).trim() ? null : 'author must be non-empty if present'),
  },
  {
    name: 'relatedArticles',
    type: 'array',
    required: false,
    validate: (v) => {
      if (!Array.isArray(v)) return 'relatedArticles must be an array';
      for (const id of v) {
        if (typeof id !== 'string' || !id.trim())
          return 'each relatedArticles entry must be a non-empty string (article id)';
      }
      return null;
    },
  },
  {
    name: 'externalLinks',
    type: 'array',
    required: false,
    validate: (v) => {
      if (!Array.isArray(v)) return 'externalLinks must be an array';
      for (const link of v) {
        if (typeof link !== 'object' || link === null || Array.isArray(link)) {
          return 'each externalLinks entry must be an object';
        }
        if (typeof link.type !== 'string' || !link.type.trim()) {
          return 'each externalLinks entry must have a non-empty "type" string';
        }
        if (typeof link.url !== 'string' || !link.url.trim()) {
          return 'each externalLinks entry must have a non-empty "url" string';
        }
        if (!isSafeUrl(link.url)) {
          return `externalLinks url "${link.url}" uses a forbidden scheme (javascript:/data:/vbscript:)`;
        }
        if (!isAbsoluteOrExempt(link.url)) {
          return `externalLinks url "${link.url}" must be an absolute https?:// URL (or # / mailto:)`;
        }
        if ('title' in link && typeof link.title !== 'string') {
          return 'externalLinks.title must be a string if present';
        }
      }
      return null;
    },
  },
  // metadata is a free-form bag per ARTICLES.schema.md ([key: string]: any),
  // but the fields it documents by name (year in particular) are rendered
  // unescaped-adjacent in articles.js, so their *type* is worth pinning down
  // even though the object as a whole stays open-ended.
  {
    name: 'metadata',
    type: 'object',
    required: false,
    validate: (v) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v))
        return 'metadata must be an object';
      const obj = /** @type {Record<string, unknown>} */ (v);
      const stringFields = [
        'mediaType',
        'director',
        'country',
        'duration',
        'language',
        'subtitles',
        'source',
        'filmFestival',
      ];
      for (const f of stringFields) {
        if (f in obj && typeof obj[f] !== 'string')
          return `metadata.${f} must be a string if present`;
      }
      if ('year' in obj) {
        const y = obj.year;
        if (typeof y !== 'number' || !Number.isFinite(y) || y < 1800 || y > 2100) {
          return `metadata.year must be a number between 1800 and 2100 if present (got ${JSON.stringify(y)})`;
        }
      }
      return null;
    },
  },
];

const URL_ATTR_RE = /(?:href|src)=['"]([^'"]+)['"]/gi;

/** @param {string} html */
export function validateContentHtmlUrls(html) {
  for (const match of html.matchAll(URL_ATTR_RE)) {
    const url = match[1];
    if (!isSafeUrl(url)) {
      return `contentHtml must not contain unsafe URL scheme: ${url}`;
    }
    if (!isAbsoluteOrExempt(url)) {
      return `contentHtml must not contain relative URLs — found: ${url} (rewrite to absolute using sourceUrl before importing)`;
    }
  }
  return null;
}

/**
 * @param {unknown} entry
 * @param {string} file
 * @param {number} index
 * @returns {string[]} list of error messages
 */
export function validateArticleEntry(entry, file, index) {
  const errors = [];
  const prefix = `${file}[${index}]`;

  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return [`${prefix}: entry must be a plain object`];
  }

  const obj = /** @type {Record<string, unknown>} */ (entry);

  for (const rule of [...ARTICLE_RULES, ...ARTICLE_OPTIONAL_RULES]) {
    const value = obj[rule.name];
    const present = rule.name in obj;

    if (rule.required && !present) {
      errors.push(`${prefix}: missing required field "${rule.name}"`);
      continue;
    }
    if (!present) continue;

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      errors.push(`${prefix}.${rule.name}: expected ${rule.type}, got ${actualType}`);
      continue;
    }

    if (rule.validate) {
      const msg = rule.validate(value);
      if (msg) errors.push(`${prefix}.${rule.name}: ${msg}`);
    }
  }

  return errors;
}
