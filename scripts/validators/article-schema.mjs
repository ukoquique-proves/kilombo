/**
 * scripts/validators/article-schema.mjs
 *
 * Schema and validator for article entries (site/assets/content/*.json).
 * Validates article metadata, HTML content, and data integrity.
 */

import { isSafeUrl, isAbsoluteOrExempt } from '../../site/js/shared/url-safety.mjs';
import { hasEnoughBreaksToAnalyze } from '../../site/js/shared/dewrap.mjs';

const ARTICLE_STATUS = new Set([
  'imported',
  'adapted',
  'translated',
  'pending-review',
  'external-only',
]);

const ID_FORMAT_RE = /^[a-z0-9-]+$/;
const ID_MAX_LENGTH = 80;
const HARD_WRAP_LONG_LINE_THRESHOLD = 180;
const URL_ATTR_RE = /(?:href|src)=['"]([^'"]+)['"]/gi;

/** @typedef {{ name: string, type: string, required: boolean, validate?: (v: unknown) => string | null }} FieldRule */

/** Required fields for articles */
/** @type {FieldRule[]} */
export const ARTICLE_BASE_RULES = [
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
    validate: (v) => validateContentHtml(String(v)),
  },
];

/** Optional fields for articles */
/** @type {FieldRule[]} */
export const ARTICLE_OPTIONAL_RULES = [
  {
    name: 'date',
    type: 'string',
    required: false,
    validate: (v) => {
      const s = String(v).trim();
      if (!s) return null;
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? null : 'date must be YYYY-MM-DD (or empty)';
    },
  },
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
    validate: validateExternalLinks,
  },
  {
    name: 'metadata',
    type: 'object',
    required: false,
    validate: validateMetadata,
  },
];

/**
 * Validate contentHtml for XSS and formatting issues.
 * @param {string} html
 * @returns {string|null}
 */
function validateContentHtml(html) {
  if (!html.trim()) return 'contentHtml must be non-empty';

  // Check for script tags
  if (/<script[\s>]/i.test(html)) return 'contentHtml must not contain <script> tags';

  // Check for event handlers
  if (/\son\w+\s*=/i.test(html))
    return 'contentHtml must not contain inline event-handler attributes (on...=)';

  // Check for javascript/data/vbscript URLs
  if (
    /(?:href|src)\s*=\s*["']?\s*(?:javascript|data|vbscript):/i.test(
      // eslint-disable-next-line no-control-regex
      html.replace(/[\x00-\x1F\x7F]+/g, '')
    )
  ) {
    return 'contentHtml must not contain javascript:/data:/vbscript: URLs';
  }

  // Check for unsafe URLs in attributes
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
 * Validate externalLinks array.
 * @param {unknown} v
 * @returns {string|null}
 */
function validateExternalLinks(v) {
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
}

/**
 * Validate metadata object.
 * @param {unknown} v
 * @returns {string|null}
 */
function validateMetadata(v) {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return 'metadata must be an object';

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
}

/**
 * Validate a single article entry.
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

  for (const rule of [...ARTICLE_BASE_RULES, ...ARTICLE_OPTIONAL_RULES]) {
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

/**
 * Detect hard-wrapped content (warning only, non-fatal).
 * @param {string} contentHtml
 * @returns {{ brCount: number, minLineLength: number } | null}
 */
export function detectHardWrapWarning(contentHtml) {
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
 * Scan articles for hard-wrapped content and emit warnings.
 * @param {unknown[]} entries
 * @param {string} label
 * @returns {number} count of warnings emitted
 */
export function warnHardWrappedArticles(entries, label) {
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
