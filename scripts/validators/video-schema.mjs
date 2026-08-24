/**
 * scripts/validators/video-schema.mjs
 *
 * Schema and validator for video/plandemismo entries.
 * Validates videos from site/assets/data/*.json
 */

import { isSafeUrl, isAbsoluteOrExempt } from '../../site/js/shared/url-safety.mjs';

/** @typedef {{ name: string, type: string, required: boolean, validate?: (v: unknown) => string | null }} FieldRule */

/** Required fields for video entries */
/** @type {FieldRule[]} */
export const VIDEO_BASE_RULES = [
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

/** Optional fields for video entries */
/** @type {FieldRule[]} */
export const VIDEO_OPTIONAL_RULES = [
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

/**
 * Validate a single video entry.
 * @param {unknown} entry
 * @param {string} file
 * @param {number} index
 * @returns {string[]} list of error messages
 */
export function validateVideoEntry(entry, file, index) {
  const errors = [];
  const prefix = `${file}[${index}]`;

  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return [`${prefix}: entry must be a plain object`];
  }

  const obj = /** @type {Record<string, unknown>} */ (entry);

  for (const rule of [...VIDEO_BASE_RULES, ...VIDEO_OPTIONAL_RULES]) {
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
