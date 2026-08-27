// @ts-check
/**
 * scripts/lib/drafts-store.mjs
 *
 * Filesystem access layer for the editorial draft pipeline:
 *   articulos_en_trabajo/IN_PROGRESS/*.json  →  drafts-store  →  READY/*.json
 *
 * All API endpoints in api/server.mjs that mutate or read drafts go through
 * this module — nothing in server.mjs touches fs directly for draft content.
 *
 * Exports (see each JSDoc for shape):
 *   createDraft(fields)         -> { slug, path, createdAt }
 *   getDraft(slug)              -> article object (throws if missing)
 *   listDrafts()                -> [{ slug, title, date, section, status, topics, createdAt, updatedAt }, ...]
 *   updateDraft(slug, fields)   -> { slug, updatedAt }
 *   approveDraft(slug)          -> { approved: true, slug, path, approvedAt, validationErrors: [] }
 *                                     or throws { validationErrors: [...] }
 *   listReady()                 -> [{ slug, title, date, section, topics, createdAt, updatedAt, approvedAt }, ...]
 *
 * Every mutation (create/update/approve) writes a structured JSONL entry to
 * live-write-audit.log.jsonl so it shows up in the Dashboard's Audit tab.
 * The format follows what scripts/lib/live-write-gateway.mjs already writes,
 * but we do NOT go through guardedWrite() — that chokepoint is intentionally
 * reserved for live-SPIP mutations only (CLIENT_UI.md line 96).
 *
 * @module
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
  existsSync,
  mkdirSync,
  appendFileSync,
  unlinkSync,
} from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './slugify.mjs';
import { validateArticleEntry } from './article-validator.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const WORK_DIR = join(REPO_ROOT, 'articulos_en_trabajo');
const IN_PROGRESS_DIR = join(WORK_DIR, 'IN_PROGRESS');
const READY_DIR = join(WORK_DIR, 'READY');
const ARTICLES_JSON_PATH = join(REPO_ROOT, 'site', 'assets', 'content', 'articles.json');
const AUDIT_LOG_PATH = join(REPO_ROOT, 'live-write-audit.log.jsonl');

(function ensureDirs() {
  for (const d of [WORK_DIR, IN_PROGRESS_DIR, READY_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
})();

// ---------------------------------------------------------------------------
// Audit logging (append-only; must never throw)
// ---------------------------------------------------------------------------

/**
 * @param {string} action
 * @param {Record<string, unknown>} target
 * @param {boolean} success
 * @param {string} [errorMsg]
 */
function appendAudit(action, target, success, errorMsg) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      actor: 'client-dashboard',
      action,
      target,
      result: success ? 'success' : 'error',
      ...(errorMsg ? { error: errorMsg } : null),
    };
    appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.error(`[drafts-store audit FAILED] ${String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers: slug uniqueness check (3 sources) + path builders
// ---------------------------------------------------------------------------

function collectAllTakenSlugs() {
  /** @type {Set<string>} */
  const taken = new Set();

  for (const dir of [IN_PROGRESS_DIR, READY_DIR]) {
    if (existsSync(dir)) {
      for (const f of readdirSync(dir)) {
        if (f.endsWith('.json')) taken.add(basename(f, '.json').toLowerCase());
      }
    }
  }

  try {
    if (existsSync(ARTICLES_JSON_PATH)) {
      const published = JSON.parse(readFileSync(ARTICLES_JSON_PATH, 'utf8'));
      if (Array.isArray(published)) {
        for (const a of published) {
          if (a && typeof a.id === 'string') taken.add(a.id.toLowerCase());
        }
      }
    }
  } catch {
    /* pass — pipeline validates articles.json separately */
  }

  return taken;
}

/**
 * @param {string} candidateSlug
 * @returns {string}
 */
function makeUniqueSlug(candidateSlug) {
  const taken = collectAllTakenSlugs();
  if (!taken.has(candidateSlug.toLowerCase())) return candidateSlug;

  let n = 2;
  while (true) {
    const suffixed = slugify(`${candidateSlug}-${n}`);
    if (!taken.has(suffixed.toLowerCase())) return suffixed;
    n += 1;
  }
}

const inProgressPath = (/** @type {string} */ slug) => join(IN_PROGRESS_DIR, `${slug}.json`);
const readyPath = (/** @type {string} */ slug) => join(READY_DIR, `${slug}.json`);

/**
 * Validate a supplied slug to ensure it matches the canonical slug format
 * produced by `slugify()` and therefore cannot contain path separators or
 * traversal sequences. Throws an Error with code 'INVALID_SLUG' on failure
 * and appends an audit entry.
 * @param {string} slug
 * @param {string} action - audit action name (e.g. 'draft.get')
 */
function validateSlugOrThrow(slug, action = 'draft.action') {
  if (typeof slug !== 'string' || !slug) {
    const err = Object.assign(new Error('Invalid slug'), { code: 'INVALID_SLUG' });
    appendAudit(action, { slug }, false, err.message);
    throw err;
  }

  // slugify enforces lowercase [a-z0-9-] and strips other runs; require
  // exact match so callers cannot provide '../' or other unsafe forms.
  const canonical = slugify(slug);
  if (slug !== canonical) {
    const err = Object.assign(new Error('Invalid slug format'), { code: 'INVALID_SLUG' });
    appendAudit(action, { slug, canonical }, false, err.message);
    throw err;
  }

  return slug;
}

/** @param {string} p */
function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** @param {string} p */
function unlinkIfExists(p) {
  if (existsSync(p)) unlinkSync(p);
}

// ---------------------------------------------------------------------------
// Light pre-validation for create/update — quick fail before fs-write, but
// NOT the full ARTICLE_RULES (that's approveDraft's job).
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, unknown>} fields
 * @param {boolean} [allRequired=false]
 * @returns {string[]}
 */
function preValidate(fields, allRequired = false) {
  const errors = [];
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
    return ['fields must be a plain object'];
  }

  const required = ['title', 'contentHtml', 'section', 'topics'];
  if (allRequired) {
    for (const r of required) {
      if (!(r in fields)) errors.push(`missing required field: "${r}"`);
    }
  }

  if ('title' in fields && typeof fields.title === 'string' && !fields.title.trim())
    errors.push('"title" must be non-empty');
  if ('contentHtml' in fields && typeof fields.contentHtml === 'string' && !fields.contentHtml.trim())
    errors.push('"contentHtml" must be non-empty');
  if ('section' in fields && typeof fields.section === 'string' && !fields.section.trim())
    errors.push('"section" must be non-empty');
  if ('topics' in fields) {
    if (!Array.isArray(fields.topics)) errors.push('"topics" must be an array');
    else if (allRequired && fields.topics.length === 0)
      errors.push('"topics" must be a non-empty array');
    else if (
      Array.isArray(fields.topics) &&
      fields.topics.some((t) => typeof t !== 'string' || !t.trim())
    )
      errors.push('each "topics" entry must be a non-empty string');
  }
  if ('date' in fields && fields.date !== undefined && fields.date !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fields.date)))
      errors.push('"date" must be YYYY-MM-DD (or empty/omitted)');
  }
  if ('language' in fields && fields.language) {
    const ok = ['ES', 'FR', 'EN'].includes(String(fields.language).toUpperCase());
    if (!ok) errors.push('"language" must be ES | FR | EN if present');
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef DraftCreateFields
 * @property {string} title
 * @property {string} contentHtml
 * @property {string} section
 * @property {string[]} topics
 * @property {string} [sourceSite]
 * @property {string} [sourceUrl]
 * @property {string} [status]
 * @property {string} [date]
 * @property {string} [notes]
 * @property {string} [language]
 * @property {string} [author]
 * @property {string[]} [relatedArticles]
 * @property {Array<{ type: string, url: string, title?: string }>} [externalLinks]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @param {DraftCreateFields} fields
 * @returns {{ slug: string, path: string, createdAt: string }}
 */
export function createDraft(fields) {
  const pre = preValidate(fields, true);
  if (pre.length) {
    const err = new Error(pre.join('; '));
    appendAudit('draft.create', { title: fields?.title }, false, err.message);
    throw err;
  }

  const baseSlug = slugify(String(fields.title));
  const slug = makeUniqueSlug(baseSlug);
  const path = inProgressPath(slug);

  const today = new Date();
  const createdAt = today.toISOString();
  const yyyy = String(today.getFullYear()).padStart(4, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  /** @type {Record<string, unknown>} */
  const entry = {
    id: slug,
    title: String(fields.title),
    date: fields.date || `${yyyy}-${mm}-${dd}`,
    section: String(fields.section),
    topics: [...fields.topics],
    sourceSite: fields.sourceSite || 'Kilombo Cliente Dashboard',
    sourceUrl: fields.sourceUrl || '#',
    status: fields.status || 'pending-review',
    contentHtml: String(fields.contentHtml),
    createdAt,
    updatedAt: createdAt,
    ...(fields.notes ? { notes: String(fields.notes) } : null),
    ...(fields.language ? { language: String(fields.language).toUpperCase() } : null),
    ...(fields.author ? { author: String(fields.author) } : null),
    ...(fields.relatedArticles ? { relatedArticles: [...fields.relatedArticles] } : null),
    ...(fields.externalLinks ? { externalLinks: [...fields.externalLinks] } : null),
    ...(fields.metadata ? { metadata: { ...fields.metadata } } : null),
  };

  writeFileSync(path, JSON.stringify(entry, null, 2) + '\n', 'utf8');
  appendAudit('draft.create', { slug, path }, true);
  return { slug, path, createdAt };
}

/**
 * @param {string} slug
 * @returns {Record<string, unknown> & { _location: 'IN_PROGRESS' | 'READY' }}
 */
export function getDraft(slug) {
  validateSlugOrThrow(slug, 'draft.get');
  const p1 = inProgressPath(slug);
  if (existsSync(p1)) {
    return Object.assign(readJson(p1), { _location: /** @type {const} */ ('IN_PROGRESS') });
  }
  const p2 = readyPath(slug);
  if (existsSync(p2)) {
    return Object.assign(readJson(p2), { _location: /** @type {const} */ ('READY') });
  }
  const err = new Error(`Draft "${slug}" not found in IN_PROGRESS or READY`);
  Object.assign(err, { code: 'DRAFT_NOT_FOUND' });
  throw err;
}

/**
 * @returns {Array<{ slug: string, title: string, date: string, section: string, status: string, topics: string[], createdAt?: string, updatedAt?: string }>}
 */
export function listDrafts() {
  return listDir(IN_PROGRESS_DIR);
}

/**
 * @returns {Array<{ slug: string, title: string, date: string, section: string, status: string, topics: string[], createdAt?: string, updatedAt?: string, approvedAt?: string }>}
 */
export function listReady() {
  return listDir(READY_DIR);
}

/** @param {string} dir */
function listDir(dir) {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ f, path: join(dir, f) }));

  /** @type {Array<any>} */
  const out = [];
  for (const { f, path } of files) {
    try {
      const a = readJson(path);
      out.push({
        slug: String(a.id || basename(f, '.json')),
        title: String(a.title || ''),
        date: String(a.date || ''),
        section: String(a.section || ''),
        status: String(a.status || ''),
        topics: Array.isArray(a.topics) ? [...a.topics] : [],
        ...(a.createdAt ? { createdAt: a.createdAt } : null),
        ...(a.updatedAt ? { updatedAt: a.updatedAt } : null),
        ...(a.approvedAt ? { approvedAt: a.approvedAt } : null),
      });
    } catch {
      /* pass */
    }
  }
  out.sort((a, b) => {
    const ka = a.updatedAt || a.createdAt || a.slug;
    const kb = b.updatedAt || b.createdAt || b.slug;
    return kb.localeCompare(ka);
  });
  return out;
}

/**
 * @param {string} slug
 * @param {Partial<DraftCreateFields>} fields
 * @returns {{ slug: string, updatedAt: string }}
 */
export function updateDraft(slug, fields) {
  validateSlugOrThrow(slug, 'draft.update');
  const ip = inProgressPath(slug);
  if (!existsSync(ip)) {
    const rp = readyPath(slug);
    const err = existsSync(rp)
      ? Object.assign(
          new Error(
            `Draft "${slug}" is already approved (READY). Create a new version instead of editing.`
          ),
          { code: 'DRAFT_ALREADY_APPROVED' }
        )
      : Object.assign(new Error(`Draft "${slug}" not found`), { code: 'DRAFT_NOT_FOUND' });
    appendAudit('draft.update', { slug }, false, err.message);
    throw err;
  }

  const pre = preValidate(fields, false);
  if (pre.length) {
    const err = new Error(pre.join('; '));
    appendAudit('draft.update', { slug }, false, err.message);
    throw err;
  }

  const current = readJson(ip);
  const updatedAt = new Date().toISOString();
  const merged = Object.assign({}, current, fields, { updatedAt });

  writeFileSync(ip, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  appendAudit('draft.update', { slug, path: ip }, true);
  return { slug, updatedAt };
}

/**
 * @param {string} slug
 * @returns {{ approved: true, slug: string, path: string, approvedAt: string, validationErrors: [] }}
 */
export function approveDraft(slug) {
  validateSlugOrThrow(slug, 'draft.approve');
  const ip = inProgressPath(slug);
  if (!existsSync(ip)) {
    const rp = readyPath(slug);
    const err = existsSync(rp)
      ? Object.assign(new Error(`Draft "${slug}" is already approved`), {
          code: 'DRAFT_ALREADY_APPROVED',
        })
      : Object.assign(new Error(`Draft "${slug}" not found`), { code: 'DRAFT_NOT_FOUND' });
    appendAudit('draft.approve', { slug }, false, err.message);
    throw err;
  }

  const entry = readJson(ip);
  const validationErrors = validateArticleEntry(entry, 'draft', 0);
  if (validationErrors.length) {
    const err = Object.assign(
      new Error(
        `Validation failed (${validationErrors.length} issue(s)) — fix and retry approveDraft().`
      ),
      { code: 'VALIDATION_FAILED', validationErrors }
    );
    appendAudit('draft.approve', { slug, validationErrors }, false, err.message);
    throw err;
  }

  const approvedAt = new Date().toISOString();
  const finalEntry = Object.assign({}, entry, { approved: true, approvedAt });
  const rp = readyPath(slug);

  // Write tmp → rename: atomic READY placement. renameSync itself is atomic
  // on POSIX same-FS, so we never observe a half-written READY entry.
  const tmp = join(READY_DIR, `.${slug}.tmp.${process.pid}`);
  writeFileSync(tmp, JSON.stringify(finalEntry, null, 2) + '\n', 'utf8');
  renameSync(tmp, rp);

  try {
    unlinkIfExists(ip);
  } catch {
    /* non-fatal: READY is canonical */
  }

  appendAudit('draft.approve', { slug, path: rp, approvedAt }, true);
  return {
    approved: /** @type {const} */ (true),
    slug,
    path: rp,
    approvedAt,
    validationErrors: [],
  };
}
