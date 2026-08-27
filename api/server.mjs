/**
 * KILOMBO Management Dashboard — Express.js Backend
 *
 * Phase 1 MVP (Weeks 1-2)
 * - Core command endpoints (create-article, manage-article-status)
 * - Job status polling
 * - Security gates (KILO_APPROVE_PUBLISHING)
 * - Audit logging
 * - Minimal web UI (polling-based)
 *
 * Architecture:
 * - Routes spawn scripts in api/lib/job-manager.mjs
 * - Routes all mutations through scripts/lib/live-write-gateway.mjs
 * - Respects environment variable gates
 * - Preserves human-in-the-loop confirmations
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import { createJob, getJob, listJobs } from './lib/job-manager.mjs';
import { slugToRubriquId } from '../scripts/lib/spip-client.mjs';
import {
  createDraft,
  getDraft,
  listDrafts,
  updateDraft,
  approveDraft,
  listReady,
} from '../scripts/lib/drafts-store.mjs';
import { reduceToAllowlist } from '../scripts/import-article.mjs';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KILOMBO_DIR = path.join(__dirname, '..');

// Load environment variables using dotenv for robust parsing
try {
  dotenv.config({ path: path.join(KILOMBO_DIR, '.env') });
} catch (err) {
  console.warn('⚠️  Failed to load .env via dotenv:', err && err.message);
}

// No env indirection: use `process.env` directly

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------
// Simple shared-secret protection for sensitive endpoints
// - Requires `KILO_SHARED_SECRET` to be set in .env or environment
// - Logs failed auth attempts to live-write-audit.log.jsonl
// ------------------------------------------------------------
const SHARED_SECRET = process.env.KILO_SHARED_SECRET || '';
// Pre-encoded once at startup so the per-request comparison is allocation-free.
const SHARED_SECRET_BUF = Buffer.from(SHARED_SECRET, 'utf8');

const auditLogPath = path.join(KILOMBO_DIR, 'live-write-audit.log.jsonl');
function appendAuditLine(obj) {
  try {
    const line = JSON.stringify(obj) + '\n';
    fs.appendFileSync(auditLogPath, line, { encoding: 'utf8' });
  } catch (err) {
    // Non-fatal: warn but continue
    console.warn('[AUDIT] Failed to write audit log:', err && err.message);
  }
}

function requireSharedSecret(req, res, next) {
  // Always require the shared secret header
  const supplied = (req.get('x-kilo-secret') || '').trim();
  if (!SHARED_SECRET) {
    // This should be guarded at startup; defensive fallback here
    console.error('[SECURITY] KILO_SHARED_SECRET not configured — refusing request');
    appendAuditLine({ ts: new Date().toISOString(), event: 'auth_config_missing', path: req.path, method: req.method });
    return res.status(500).json({ error: 'Server misconfigured', message: 'KILO_SHARED_SECRET not configured on server' });
  }

  // Constant-time comparison — prevents timing side-channels that could leak
  // the secret one byte at a time. `timingSafeEqual` requires equal-length
  // buffers, so we encode the supplied value and check lengths first (the
  // length check itself leaks no secret bytes — the attacker already controls
  // the supplied value).
  const suppliedBuf = Buffer.from(supplied, 'utf8');
  const secretMatch =
    supplied.length === SHARED_SECRET.length &&
    crypto.timingSafeEqual(suppliedBuf, SHARED_SECRET_BUF);
  if (!supplied || !secretMatch) {
    const entry = {
      ts: new Date().toISOString(),
      event: 'auth_failed',
      path: req.path,
      method: req.method,
      ip: req.ip || (req.connection && req.connection.remoteAddress) || null,
      supplied: !!supplied,
      ua: req.get('user-agent') || null,
    };
    appendAuditLine(entry);
    console.warn('[SECURITY] Missing or invalid x-kilo-secret for', req.path, 'from', entry.ip);
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid x-kilo-secret header' });
  }

  return next();
}

// Protect sensitive routes: job control, audit log, command endpoints and drafts
app.use('/api/jobs', requireSharedSecret);
app.use('/api/audit-log', requireSharedSecret);
app.use('/api/commands', requireSharedSecret);
app.use('/api/drafts', requireSharedSecret);
app.use('/api/ready-drafts', requireSharedSecret);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.47.0-MVP',
    uptime: process.uptime(),
  });
});

// ============================================================
// JOB STATUS ENDPOINT
// ============================================================

/**
 * GET /api/jobs/:jobId/status
 * Query the status of a running or completed job
 */
app.get('/api/jobs/:jobId/status', (req, res) => {
  const job = getJob(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      jobId: req.params.jobId,
    });
  }
  
  res.json(job);
});

/**
 * GET /api/jobs
 * List recent jobs (most recent first)
 * Query param: ?limit=N (default 20, max 100)
 */
app.get('/api/jobs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const jobs = listJobs(limit);
    res.json({
      jobs,
      total: jobs.length,
      limit,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to list jobs',
      details: err.message,
    });
  }
});

/**
 * Sanitize user input — remove/escape potentially dangerous characters
 * Used as defense-in-depth; primary protection is spawn() without shell: true
 *
 * @param {string} str - Input string to sanitize
 * @param {number} maxLength - Maximum allowed length (defense-in-depth against DoS)
 */
function sanitizeInput(str, maxLength = 200000) {
  if (typeof str !== 'string') return '';
  // Remove control characters (keep printable + extended UTF-8)
  return str
    // eslint-disable-next-line no-control-regex -- Intentional security sanitization to prevent XSS via control-character injection
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // Control characters
    .substring(0, maxLength); // Limit length to prevent DoS
}

// ============================================================
// CREATE ARTICLE ENDPOINT
// ============================================================

/**
 * POST /api/commands/create-article
 *
 * Spawn: node sandbox/create-article.mjs --create --title "..." --body "..." --section "..."
 *
 * Body:
 *   {
 *     "title": "Article Title",
 *     "body": "Article body (HTML or plain text)",
 *     "section": "general|actualidad|tierra|nom|pi|gci",
 *     "dryRun": false
 *   }
 *
 * Returns: { jobId, startTime }
 */
app.post('/api/commands/create-article', (req, res) => {
  const { title, body, section = 'general', dryRun = false } = req.body;
  
  // Validation
  if (!title || !body) {
    return res.status(400).json({
      error: 'Missing required fields: title, body',
    });
  }

  const validSections = ['general', 'actualidad', 'tierra', 'nom', 'pi', 'gci'];
  if (!validSections.includes(section) && !/^\d+$/.test(section)) {
    return res.status(400).json({
      error: `Invalid section. Must be one of: ${validSections.join(', ')} (or a numeric SPIP rubrique ID)`,
    });
  }
  
  // Sanitize input (defense-in-depth; spawn() without shell: true is primary protection)
  // Title: reasonable limit (SPIP titles rarely exceed a few hundred chars)
  const sanitizedTitle = sanitizeInput(String(title), 2000);
  // Body: articles can be very long; 200KB limit is generous but prevents DoS
  const sanitizedBody = sanitizeInput(String(body), 200000);
  
  if (!sanitizedTitle || !sanitizedBody) {
    return res.status(400).json({
      error: 'Title and body cannot be empty',
    });
  }
  
  // Build args for the script — translate slug to numeric rubrique ID at the boundary
  let rubriquId;
  try {
    rubriquId = slugToRubriquId(section);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const args = [
    'sandbox/create-article.mjs',
    '--create',
    '--title', sanitizedTitle,
    '--body', sanitizedBody,
    '--section', rubriquId,
  ];
  
  if (dryRun) args.push('--dry-run');
  
  try {
    const jobId = createJob('node', args, { cwd: KILOMBO_DIR });
    const job = getJob(jobId);
    
    res.json({
      jobId,
      startTime: job.startTime,
      message: 'Article creation job started',
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to start job',
      details: err.message,
    });
  }
});

// ============================================================
// MANAGE ARTICLE STATUS ENDPOINT (WITH SECURITY GATE)
// ============================================================

/**
 * POST /api/commands/manage-article-status
 *
 * Spawn: node scripts/manage-article-status.mjs --id <id> --status <status> [--change]
 *
 * Body:
 *   {
 *     "id": 90,
 *     "status": "publie|prepa|prop|refuse|poubelle",
 *     "change": true,
 *     "dryRun": false
 *   }
 *
 * SECURITY GATE:
 *   If status === "publie" and change === true:
 *   - Check KILO_APPROVE_PUBLISHING environment variable
 *   - Return 403 if not set or false
 *   - Log the attempted publication
 *
 * Returns: { jobId, startTime }
 */
app.post('/api/commands/manage-article-status', (req, res) => {
  const { id, status, change = false, dryRun = false } = req.body;
  
  // Validation
  if (!id || !status) {
    return res.status(400).json({
      error: 'Missing required fields: id, status',
    });
  }
  
  const validStatuses = ['publie', 'prepa', 'prop', 'refuse', 'poubelle'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }
  
  // SECURITY GATE: Check KILO_APPROVE_PUBLISHING for direct publication
  if (status === 'publie' && change === true) {
    if (!process.env.KILO_APPROVE_PUBLISHING || process.env.KILO_APPROVE_PUBLISHING !== 'true') {
      console.warn(`[SECURITY] Blocked publication attempt for article ${id}. KILO_APPROVE_PUBLISHING not set.`);
      return res.status(403).json({
        error: 'Direct publication requires KILO_APPROVE_PUBLISHING=true',
        risk: 'KILO-001',
        alternative: 'Change status to "prop" (proposed for review) instead. Admin can publish from there.',
        blocked: true,
      });
    }
    console.info(`[AUDIT] Article ${id} published via API (KILO_APPROVE_PUBLISHING enabled)`);
  }
  
  // Build args for the script
  const args = [
    'scripts/manage-article-status.mjs',
    '--id', String(id),
    '--status', status,
  ];
  
  if (change) args.push('--change');
  if (dryRun) args.push('--dry-run');
  
  try {
    const jobId = createJob('node', args, { cwd: KILOMBO_DIR });
    const job = getJob(jobId);
    
    res.json({
      jobId,
      startTime: job.startTime,
      message: 'Status management job started',
      warning: status === 'publie' ? 'This will publish the article to production' : undefined,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to start job',
      details: err.message,
    });
  }
});

// ============================================================
// AUDIT LOG ENDPOINT (read-only)
// ============================================================

/**
 * GET /api/audit-log
 * Returns entries from live-write-audit.log.jsonl (most recent first)
 */
app.get('/api/audit-log', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const auditLogPath = path.join(KILOMBO_DIR, 'live-write-audit.log.jsonl');
  
  try {
    if (!fs.existsSync(auditLogPath)) {
      return res.json({ entries: [], message: 'No audit log entries yet' });
    }
    
    const content = fs.readFileSync(auditLogPath, 'utf8');
    const entries = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse() // Most recent first
      .slice(0, limit);
    
    res.json({ entries, total: entries.length });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to read audit log',
      details: err.message,
    });
  }
});

// ============================================================
// ENV STATUS ENDPOINT (non-secret vars only)
// ============================================================

/**
 * GET /api/env-status
 * Returns status of environment variables (public info only)
 */
app.get('/api/env-status', (req, res) => {
  res.json({
    KILO_APPROVE_PUBLISHING: process.env.KILO_APPROVE_PUBLISHING === 'true',
    hasEnv: Object.keys(process.env).length > 0,
  });
});

// ============================================================
// DRAFTS API — editorial pipeline IN_PROGRESS → READY
// All endpoints use scripts/lib/drafts-store.mjs for fs access.
// ============================================================

/**
 * POST /api/drafts — Create a new draft in IN_PROGRESS/
 *
 * Body (required fields):
 *   { title, contentHtml, section, topics[], sourceSite?, sourceUrl?,
 *     status?, date?, notes?, language?, author?, relatedArticles?,
 *     externalLinks?, metadata? }
 *
 * Responses:
 *   201 { ok: true, data: { slug, path, createdAt } }
 *   400 { ok: false, error, code: "INVALID_FIELDS", details: [...] }
 */
app.post('/api/drafts', (req, res) => {
  try {
    const fields = req.body || {};
    const result = createDraft(fields);
    return res.status(201).json({ ok: true, data: result });
  } catch (err) {
    const details = err.message ? err.message.split('; ').map((s) => s.trim()).filter(Boolean) : [];
    return res.status(400).json({
      ok: false,
      error: err.message || 'Failed to create draft',
      code: 'INVALID_FIELDS',
      details,
    });
  }
});

/**
 * GET /api/drafts — List drafts in IN_PROGRESS/
 *
 * Query params:
 *   ?limit=N   (default 50, max 200)
 *   ?section=  (filter by section slug)
 *
 * Response 200:
 *   { ok: true, data: { drafts: [...], total, limit } }
 */
app.get('/api/drafts', (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
    const sectionFilter = req.query.section ? String(req.query.section) : null;

    let drafts = listDrafts();
    if (sectionFilter) {
      drafts = drafts.filter((d) => d.section === sectionFilter);
    }
    const total = drafts.length;
    drafts = drafts.slice(0, limit);

    return res.json({
      ok: true,
      data: { drafts, total, limit },
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to list drafts',
      internal: err.message,
    });
  }
});

/**
 * GET /api/ready-drafts — List approved drafts in READY/
 *
 * Query params: ?limit=N (default 50, max 200)
 *
 * Response 200:
 *   { ok: true, data: { drafts: [...], total, limit } }
 */
app.get('/api/ready-drafts', (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
    let drafts = listReady();
    const total = drafts.length;
    drafts = drafts.slice(0, limit);

    return res.json({
      ok: true,
      data: { drafts, total, limit },
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to list ready drafts',
      internal: err.message,
    });
  }
});

/**
 * GET /api/drafts/:slug — Read a single draft + sanitized preview HTML
 *
 * Response 200:
 *   { ok: true, data: { draft, previewHtml, location } }
 *
 * Response 404:
 *   { ok: false, error, code: "DRAFT_NOT_FOUND" }
 */
app.get('/api/drafts/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    const draft = getDraft(slug);
    const location = draft._location;
    delete draft._location;

    const previewHtml = reduceToAllowlist(String(draft.contentHtml || ''));

    return res.json({
      ok: true,
      data: { draft, previewHtml, location },
    });
  } catch (err) {
    if (err && err.code === 'DRAFT_NOT_FOUND') {
      return res.status(404).json({
        ok: false,
        error: err.message || 'Draft not found',
        code: 'DRAFT_NOT_FOUND',
      });
    }
    if (err && err.code === 'INVALID_SLUG') {
      return res.status(400).json({
        ok: false,
        error: err.message || 'Invalid slug',
        code: 'INVALID_SLUG',
      });
    }
    return res.status(500).json({
      ok: false,
      error: 'Failed to read draft',
      internal: err.message,
    });
  }
});

/**
 * PUT /api/drafts/:slug — Update an existing draft (shallow merge)
 *
 * Body: any subset of POST /api/drafts fields (all optional)
 *
 * Responses:
 *   200 { ok: true, data: { slug, updatedAt } }
 *   400 { ok: false, error, code: "DRAFT_ALREADY_APPROVED" | "INVALID_FIELDS" }
 *   404 { ok: false, error, code: "DRAFT_NOT_FOUND" }
 */
app.put('/api/drafts/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    const fields = req.body || {};
    const result = updateDraft(slug, fields);
    return res.json({ ok: true, data: result });
  } catch (err) {
    if (err && err.code === 'DRAFT_NOT_FOUND') {
      return res.status(404).json({
        ok: false,
        error: err.message || 'Draft not found',
        code: 'DRAFT_NOT_FOUND',
      });
    }
    if (err && err.code === 'DRAFT_ALREADY_APPROVED') {
      return res.status(400).json({
        ok: false,
        error: err.message || 'Cannot update already-approved draft',
        code: 'DRAFT_ALREADY_APPROVED',
      });
    }
    if (err && err.code === 'INVALID_SLUG') {
      return res.status(400).json({
        ok: false,
        error: err.message || 'Invalid slug',
        code: 'INVALID_SLUG',
      });
    }
    const details = err.message ? err.message.split('; ').map((s) => s.trim()).filter(Boolean) : [];
    return res.status(400).json({
      ok: false,
      error: err.message || 'Failed to update draft',
      code: 'INVALID_FIELDS',
      details,
    });
  }
});

// ============================================================
// AI IMPROVEMENT — Groq
// ============================================================

const GROQ_MODEL = 'qwen/qwen3.6-27b';

/**
 * Extract plain URLs from raw content (href= attributes + bare https?:// links).
 * Returns at most 3 to avoid prompt bloat.
 * @param {string} contentHtml
 * @returns {string[]}
 */
function extractUrls(contentHtml) {
  const found = new Set();
  // href="..." attributes
  for (const m of contentHtml.matchAll(/href=['"]?(https?:\/\/[^\s'"<>]+)/gi)) found.add(m[1]);
  // bare URLs in text
  for (const m of contentHtml.matchAll(/(?<!['"=])(https?:\/\/[^\s<>"']+)/g)) found.add(m[1]);
  return [...found].slice(0, 3);
}

/**
 * Fetch plain text from a URL (best-effort, 5s timeout, max 3000 chars).
 * Returns null on any error — never throws.
 * @param {string} url
 * @returns {Promise<string|null>}
 */
async function fetchUrlText(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KilomboBot/1.0)' },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) return null;
    const html = await resp.text();
    // Strip tags, collapse whitespace
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
  } catch {
    return null;
  }
}

/**
 * Build the system prompt for article improvement, optionally with fetched URL content.
 * @param {string} contentHtml
 * @param {Array<{url: string, text: string|null}>} urlPreviews
 * @returns {string}
 */
function buildImprovePrompt(contentHtml, urlPreviews = []) {
  const articleText = contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);

  const urlSection = urlPreviews.length > 0
    ? '\n\nCONTENIDO DE ENLACES EXTERNOS (extraído automáticamente):\n' +
      urlPreviews.map(({ url, text }) =>
        text
          ? `URL: ${url}\nContenido: ${text}`
          : `URL: ${url}\nContenido: [no disponible — URL inaccesible o sin texto]`
      ).join('\n\n')
    : '';

  const summaryRule = urlPreviews.some(({ text }) => text)
    ? '\n6. Si hay contenido de enlaces externos disponible, UNA de las sugerencias debe ser de kind="add" con un resumen en español del artículo enlazado, para enriquecer el contexto del borrador.'
    : '';

  return `Eres un editor de textos políticos para un portal de izquierda internacionalista en español/francés.
Tu tarea es revisar el siguiente artículo en HTML y devolver una lista de sugerencias de mejora concretas.

REGLAS ESTRICTAS:
1. Responde SOLO con un array JSON válido, sin texto extra antes ni después.
2. Cada sugerencia tiene exactamente esta forma:
   { "id": "sug-N", "kind": "rewrite"|"add"|"remove"|"metadata", "selector": "descripción del párrafo o campo", "original": "texto original (vacío si kind=add)", "proposed": "texto propuesto", "rationale": "por qué" }
3. Máximo 5 sugerencias. Prioriza: claridad, precisión política, fluidez.
4. No alteres el HTML — trabaja sobre el texto visible solamente.
5. PROHIBIDO INVENTAR HECHOS. No atribuyas identidades, profesiones, nacionalidades, cargos, motivaciones o interpretaciones a personas mencionadas si no están explícitas en el texto. Nunca redactes una cita o paráfrasis que suene a hecho verificado si no lo es.
6. Si el artículo es demasiado breve o carece de contexto para "mejorarlo" sin inventar información, NO generes una sugerencia "add" que rellene ese vacío con contenido inventado. En su lugar, usa "metadata" para señalar al editor humano qué información falta y debe verificar por su cuenta (ej: "Falta verificar quién es la persona citada y el contexto de la publicación").
7. Cuando sugieras "remove", el campo "proposed" debe ser exactamente la cadena vacía "" — nunca una explicación en prosa dentro de ese campo (usa "rationale" para eso).
8. Ante la duda entre inventar contenido o dejar el artículo sin cambios en ese punto, elige NO sugerir nada.${summaryRule}

ARTÍCULO:
${articleText}${urlSection}`;
}

/**
 * POST /api/drafts/:slug/improve — AI improvement suggestions via Groq
 *
 * Requires GROQ_API_KEY in environment. Falls back to 501 if not set.
 *
 * Response 200:
 *   { ok: true, data: { suggestions: [...], model, slug } }
 * Response 501:
 *   { ok: false, code: "NOT_IMPLEMENTED" }   — GROQ_API_KEY missing
 * Response 422:
 *   { ok: false, code: "AI_PARSE_ERROR" }    — Groq returned unparseable JSON
 * Response 500:
 *   { ok: false, code: "AI_ERROR" }          — Groq API call failed
 */
app.post('/api/drafts/:slug/improve', requireSharedSecret, async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(501).json({
      ok: false,
      error: 'GROQ_API_KEY not set — AI improvement unavailable',
      code: 'NOT_IMPLEMENTED',
      hint: 'Add GROQ_API_KEY to your .env and restart the server.',
    });
  }

  const { slug } = req.params;

  let draft;
  try {
    draft = await getDraft(slug);
  } catch (err) {
    if (err.code === 'INVALID_SLUG')
      return res.status(400).json({ ok: false, error: err.message, code: 'INVALID_SLUG' });
    if (err.code === 'DRAFT_NOT_FOUND')
      return res.status(404).json({ ok: false, error: err.message, code: 'DRAFT_NOT_FOUND' });
    return res
      .status(500)
      .json({ ok: false, error: 'Failed to read draft', internal: err.message });
  }

  try {
    // Fetch external URL content in parallel (best-effort, non-blocking)
    const urls = extractUrls(draft.contentHtml || '');
    const urlPreviews = await Promise.all(
      urls.map(async (url) => ({ url, text: await fetchUrlText(url) }))
    );

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: buildImprovePrompt(draft.contentHtml || '', urlPreviews) }],
      temperature: 0.4,
      max_tokens: 1500,
      reasoning_effort: 'none', // disable <think> block on Qwen3 models
    });

    const raw = completion.choices?.[0]?.message?.content ?? '';

    // Strip <think>...</think> reasoning block (some models emit this before the answer).
    // Only strip incomplete block (no closing tag) as a fallback.
    let stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (stripped.length === 0 && raw.includes('<think>') && !raw.includes('</think>')) {
      // Entire response was inside an unclosed <think> — nothing useful, treat as empty
      stripped = '';
    }

    // Extract JSON array from response (model sometimes wraps in markdown)
    const match = stripped.match(/\[[\s\S]*\]/);
    if (!match) {
      return res.status(422).json({
        ok: false,
        error: 'AI returned unparseable response',
        code: 'AI_PARSE_ERROR',
        raw: stripped.slice(0, 500),
      });
    }

    let suggestions;
    try {
      suggestions = JSON.parse(match[0]);
    } catch {
      return res.status(422).json({
        ok: false,
        error: 'AI response was not valid JSON',
        code: 'AI_PARSE_ERROR',
        raw: stripped.slice(0, 500),
      });
    }

    return res.json({
      ok: true,
      data: { suggestions, model: GROQ_MODEL, slug },
    });
  } catch (err) {
    console.warn(`[improve] Groq API error for slug=${slug}:`, err.message);
    return res.status(500).json({
      ok: false,
      error: 'Groq API call failed',
      code: 'AI_ERROR',
      internal: err.message,
    });
  }
});

/**
 * POST /api/drafts/:slug/apply-suggestion — Patch draft with a specific AI suggestion
 *
 * Body: { suggestionId: "sug-N", suggestions: [...] }
 * The client must pass back the suggestions array it received from /improve
 * so the server can look up the proposed text without re-calling Groq.
 *
 * Response 200:
 *   { ok: true, data: { slug, updatedAt, applied: { id, kind, selector } } }
 */
app.post('/api/drafts/:slug/apply-suggestion', requireSharedSecret, async (req, res) => {
  const { slug } = req.params;
  const { suggestionId, suggestions } = req.body ?? {};

  if (!suggestionId || typeof suggestionId !== 'string') {
    return res
      .status(400)
      .json({ ok: false, error: 'suggestionId is required', code: 'INVALID_FIELDS' });
  }
  if (!Array.isArray(suggestions)) {
    return res
      .status(400)
      .json({ ok: false, error: 'suggestions array is required', code: 'INVALID_FIELDS' });
  }

  const suggestion = suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) {
    return res.status(404).json({
      ok: false,
      error: `Suggestion "${suggestionId}" not found in provided suggestions array`,
      code: 'SUGGESTION_NOT_FOUND',
    });
  }

  // For rewrite/add/remove kinds: patch contentHtml by replacing original with proposed.
  // For metadata kind: patch the named metadata field.
  let patch = {};
  if (suggestion.kind === 'metadata') {
    patch = { notes: suggestion.proposed }; // surface as editorial notes
  } else if (suggestion.proposed) {
    // Attempt a simple text substitution inside contentHtml
    let result;
    try {
      result = await getDraft(slug);
    } catch (err) {
      if (err.code === 'DRAFT_NOT_FOUND')
        return res.status(404).json({ ok: false, error: err.message, code: 'DRAFT_NOT_FOUND' });
      return res
        .status(500)
        .json({ ok: false, error: 'Failed to read draft', internal: err.message });
    }

    const current = result.contentHtml ?? '';
    const updated = suggestion.original
      ? current.replace(suggestion.original, suggestion.proposed)
      : current + `\n<p>${suggestion.proposed}</p>`;

    patch = { contentHtml: updated };
  }

  try {
    const updated = await updateDraft(slug, patch);
    return res.json({
      ok: true,
      data: {
        slug,
        updatedAt: updated.updatedAt,
        applied: { id: suggestion.id, kind: suggestion.kind, selector: suggestion.selector },
      },
    });
  } catch (err) {
    if (err.code === 'DRAFT_NOT_FOUND')
      return res.status(404).json({ ok: false, error: err.message, code: 'DRAFT_NOT_FOUND' });
    if (err.code === 'DRAFT_ALREADY_APPROVED')
      return res
        .status(400)
        .json({ ok: false, error: err.message, code: 'DRAFT_ALREADY_APPROVED' });
    return res
      .status(500)
      .json({ ok: false, error: 'Failed to apply suggestion', internal: err.message });
  }
});

/**
 * POST /api/drafts/:slug/approve — ⭐ Validate + move draft to READY/
 *
 * Runs the SAME validateArticleEntry() rules used by CI (npm test).
 *
 * Responses:
 *   200 { ok: true, data: { approved, slug, path, approvedAt, validationErrors: [] } }
 *   400 { ok: false, error, code: "DRAFT_ALREADY_APPROVED" }
 *   404 { ok: false, error, code: "DRAFT_NOT_FOUND" }
 *   422 { ok: false, error, code: "VALIDATION_FAILED", details: { validationErrors: [...] } }
 */
app.post('/api/drafts/:slug/approve', (req, res) => {
  try {
    const slug = req.params.slug;
    const result = approveDraft(slug);
    return res.json({ ok: true, data: result });
  } catch (err) {
    if (err && err.code === 'DRAFT_NOT_FOUND') {
      return res.status(404).json({
        ok: false,
        error: err.message || 'Draft not found',
        code: 'DRAFT_NOT_FOUND',
      });
    }
    if (err && err.code === 'DRAFT_ALREADY_APPROVED') {
      return res.status(400).json({
        ok: false,
        error: err.message || 'Draft already approved',
        code: 'DRAFT_ALREADY_APPROVED',
      });
    }
    if (err && err.code === 'INVALID_SLUG') {
      return res.status(400).json({
        ok: false,
        error: err.message || 'Invalid slug',
        code: 'INVALID_SLUG',
      });
    }
    if (err && err.code === 'VALIDATION_FAILED') {
      return res.status(422).json({
        ok: false,
        error: 'Validation failed — same rules as CI. Fix issues and retry.',
        code: 'VALIDATION_FAILED',
        details: {
          validationErrors: Array.isArray(err.validationErrors) ? err.validationErrors : [],
        },
      });
    }
    return res.status(500).json({
      ok: false,
      error: 'Failed to approve draft',
      internal: err.message,
    });
  }
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ============================================================
// STARTUP
// ============================================================

// Export `app` at module scope so tests can import it without triggering
// auto-start. The server only binds to a port when NOT in test mode.
export default app;

if (process.env.NODE_ENV !== 'test') {
  // Fail loud at startup if secret is not configured
  if (!SHARED_SECRET) {
    console.error('\nFATAL: KILO_SHARED_SECRET is not set. Refusing to start.\n\nSet KILO_SHARED_SECRET in .env or environment and restart.\n');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  KILOMBO Management Dashboard — Phase 2 Drafts UI          ║
║  ✅ Server running on http://localhost:${PORT}             ║
║                                                            ║
║  Core API Endpoints:                                       ║
║  - GET  /api/health                                        ║
║  - GET  /api/jobs/:jobId/status                            ║
║  - GET  /api/audit-log                                     ║
║  - GET  /api/env-status                                    ║
║  - POST /api/commands/create-article                       ║
║  - POST /api/commands/manage-article-status ⚠️ GATED       ║
║                                                            ║
║  Drafts API Endpoints (IN_PROGRESS → READY):              ║
║  - POST /api/drafts                        [crear]         ║
║  - GET  /api/drafts                        [listar]        ║
║  - GET  /api/drafts/:slug                  [leer + preview]║
║  - PUT  /api/drafts/:slug                  [actualizar]    ║
║  - POST /api/drafts/:slug/approve ⭐       [validar → READY]║
║  - GET  /api/ready-drafts                  [aprobados]     ║
║  - POST /api/drafts/:slug/improve          [IA · Groq]     ║
║  - POST /api/drafts/:slug/apply-suggestion [IA · Groq]     ║
║                                                            ║
║  Frontend: http://localhost:${PORT}/dashboard.html        ║
║                                                            ║
║  Security:                                                 ║
║  - KILO_APPROVE_PUBLISHING gate: ${process.env.KILO_APPROVE_PUBLISHING === 'true' ? '✅ ENABLED' : '❌ DISABLED (direct publication blocked)'}        ║
║  - All operations audit-logged                             ║
║  - Credentials isolated (not exposed to frontend)          ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}
