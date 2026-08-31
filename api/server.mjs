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
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createAuditLogger } from './lib/audit-logger.mjs';
import { createRequireSharedSecret } from './lib/auth.mjs';
import { sanitizeInput } from './lib/util/sanitize-input.mjs';
import { sendDraftError, splitFieldErrors } from './lib/http-errors.mjs';
import { generateSuggestions } from './lib/services/ai-improve-service.mjs';
import { VALID_STATUSES, isValidStatus } from './lib/command-validators.mjs';
import statusRouter from './routes/status.mjs';
import jobsRouter from './routes/jobs.mjs';
import { createAuditLogRouter } from './routes/audit-log.mjs';
import { createCreateArticleRouter } from './routes/create-article.mjs';
import { startCommandJob } from './lib/command-job-runner.mjs';
import {
  createDraft,
  getDraft,
  getReadyDraft,
  listDrafts,
  updateDraft,
  approveDraft,
  listReady,
  revertDraft,
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
// Shared-secret protection for sensitive endpoints
// - Requires `KILO_SHARED_SECRET` to be set in .env or environment
// - Logs failed auth attempts to live-write-audit.log.jsonl
// ------------------------------------------------------------
const SHARED_SECRET = process.env.KILO_SHARED_SECRET || '';
const auditLog = createAuditLogger(path.join(KILOMBO_DIR, 'live-write-audit.log.jsonl'));
const requireSharedSecret = createRequireSharedSecret({ secret: SHARED_SECRET, auditLogger: auditLog });

// Protect sensitive routes: job control, audit log, command endpoints and drafts
app.use('/api/jobs', requireSharedSecret);
app.use('/api/audit-log', requireSharedSecret);
app.use('/api/commands', requireSharedSecret);
app.use('/api/drafts', requireSharedSecret);
app.use('/api/ready-drafts', requireSharedSecret);

// ============================================================
// PUBLIC STATUS ROUTES (GET /api/health, GET /api/env-status)
// Extracted to api/routes/status.mjs — see docs/TO_FIX.md #80.
// ============================================================
app.use('/api', statusRouter);

// ============================================================
// JOB STATUS ROUTES (GET /api/jobs/:jobId/status, GET /api/jobs)
// Extracted to api/routes/jobs.mjs — see docs/TO_FIX.md #80.
// Mounted after the /api/jobs auth middleware registered above, so
// protection is unchanged.
// ============================================================

app.use('/api/jobs', jobsRouter);

// ============================================================
// CREATE ARTICLE ROUTE (POST /api/commands/create-article)
// Extracted to api/routes/create-article.mjs — see docs/TO_FIX.md #80.
// The shared startCommandJob helper also moved, to
// api/lib/command-job-runner.mjs (still used by the two commands below
// that haven't been extracted yet).
// ============================================================

app.use('/api/commands/create-article', createCreateArticleRouter({ cwd: KILOMBO_DIR }));

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
  
  if (!isValidStatus(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
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

  startCommandJob(res, args, {
    message: 'Status management job started',
    warning: status === 'publie' ? 'This will publish the article to production' : undefined,
    cwd: KILOMBO_DIR,
  });
});

// ============================================================
// PUBLISH READY ARTICLE ENDPOINT
// ============================================================

/**
 * POST /api/commands/publish-ready-article
 *
 * Publish a READY article directly to SPIP via Playwright.
 * Moves article from READY/ to published state in SPIP.
 *
 * Body:
 *   {
 *     "slug": "article-slug",
 *     "dryRun": false
 *   }
 *
 * Returns: { jobId, startTime }
 */
app.post('/api/commands/publish-ready-article', (req, res) => {
  const { slug, dryRun = false } = req.body;
  
  // Validation
  if (!slug || typeof slug !== 'string' || slug.length === 0) {
    return res.status(400).json({
      error: 'Missing or invalid required field: slug',
    });
  }
  
  // Sanitize input
  const sanitizedSlug = sanitizeInput(String(slug), 200);
  if (!sanitizedSlug) {
    return res.status(400).json({
      error: 'Slug cannot be empty',
    });
  }
  
  // Build args for the script — spawn publish-to-actualidad.mjs
  // (or create a dedicated publish-ready-article.mjs if needed)
  const args = [
    'scripts/publish-to-actualidad.mjs',
    '--slug', sanitizedSlug,
  ];
  
  if (dryRun) args.push('--dry-run');

  startCommandJob(res, args, {
    message: 'Article publication job started',
    warning: 'This will publish the article to kilombo.top',
    errorMessage: 'Failed to start publish job',
    cwd: KILOMBO_DIR,
  });
});

// ============================================================
// AUDIT LOG ROUTE (GET /api/audit-log)
// Extracted to api/routes/audit-log.mjs — see docs/TO_FIX.md #80.
// Factory takes the shared `auditLog` instance constructed above.
// ============================================================

app.use('/api/audit-log', createAuditLogRouter(auditLog));

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
    return res.status(400).json({
      ok: false,
      error: err.message || 'Failed to create draft',
      code: 'INVALID_FIELDS',
      details: splitFieldErrors(err),
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
 * GET /api/ready-drafts/:slug — Read a single READY article
 *
 * Response 200:
 *   { ok: true, data: { draft, previewHtml } }
 *
 * Response 404:
 *   { ok: false, error, code: "READY_DRAFT_NOT_FOUND" }
 */
app.get('/api/ready-drafts/:slug', (req, res) => {
  const slug = req.params.slug;
  try {
    // Read from READY/ directly (not getDraft(), which prefers a same-slug
    // IN_PROGRESS file if one happens to still exist — see getReadyDraft()
    // JSDoc). Using getDraft() here made this endpoint 404 for any READY
    // article that still had a stale IN_PROGRESS duplicate on disk.
    const draftFull = getReadyDraft(slug);

    const location = draftFull._location;
    delete draftFull._location;

    const previewHtml = reduceToAllowlist(String(draftFull.contentHtml || ''));

    return res.json({
      ok: true,
      data: { draft: draftFull, previewHtml, location },
    });
  } catch (err) {
    if (err && err.code === 'DRAFT_NOT_FOUND') {
      return res.status(404).json({
        ok: false,
        error: `Ready draft "${slug}" not found`,
        code: 'READY_DRAFT_NOT_FOUND',
      });
    }
    return res.status(500).json({
      ok: false,
      error: 'Failed to fetch ready draft',
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
    return sendDraftError(res, err, 'Failed to read draft');
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
    return sendDraftError(res, err, 'Failed to update draft', {
      status: 400,
      code: 'INVALID_FIELDS',
      includeDetails: true,
    });
  }
});

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
    return sendDraftError(res, err, 'Failed to read draft');
  }

  try {
    const { suggestions, model } = await generateSuggestions({
      contentHtml: draft.contentHtml || '',
      apiKey: process.env.GROQ_API_KEY,
    });
    return res.json({ ok: true, data: { suggestions, model, slug } });
  } catch (err) {
    if (err.code === 'AI_PARSE_ERROR') {
      return res.status(422).json({ ok: false, error: err.message, code: err.code, raw: err.raw });
    }
    console.warn(`[improve] Groq API error for slug=${slug}:`, err.message);
    return res.status(500).json({
      ok: false,
      error: 'Groq API call failed',
      code: 'AI_ERROR',
      internal: err.internal || err.message,
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
      return sendDraftError(res, err, 'Failed to read draft');
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
    return sendDraftError(res, err, 'Failed to apply suggestion');
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
    return sendDraftError(res, err, 'Failed to approve draft');
  }
});

/**
 * POST /api/drafts/:slug/revert — ↩️ Move READY draft back to IN_PROGRESS
 *
 * Reverses approveDraft() for when you need significant re-edits.
 *
 * Responses:
 *   200 { ok: true, data: { reverted, slug, path, revertedAt } }
 *   404 { ok: false, error, code: "DRAFT_NOT_FOUND" }
 *   400 { ok: false, error, code: "DRAFT_ALREADY_IN_PROGRESS" }
 */
app.post('/api/drafts/:slug/revert', (req, res) => {
  try {
    const slug = req.params.slug;
    const result = revertDraft(slug);
    return res.json({ ok: true, data: result });
  } catch (err) {
    return sendDraftError(res, err, 'Failed to revert draft');
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
