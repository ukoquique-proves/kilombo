/**
 * api/routes/commands.mjs
 *
 * Router for /api/commands/manage-article-status and /api/commands/publish-ready-article.
 * (POST /api/commands/create-article is handled by api/routes/create-article.mjs and
 * mounted separately in server.mjs before this router.)
 *
 * Security:
 * - All endpoints protected by /api/commands middleware (requireSharedSecret in server.mjs)
 * - manage-article-status has additional gate: KILO_APPROVE_PUBLISHING for direct publication
 * - Input sanitization via sanitizeInput() to prevent script injection (defense-in-depth)
 */

import express from 'express';

/**
 * Create commands router.
 * @param {{ startCommandJob, VALID_STATUSES, isValidStatus, sanitizeInput }} deps
 */
export function createCommandsRouter({
  startCommandJob,
  VALID_STATUSES,
  isValidStatus,
  sanitizeInput,
}) {
  const router = express.Router();

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
  router.post('/manage-article-status', (req, res) => {
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
      '--id',
      String(id),
      '--status',
      status,
    ];

    if (change) args.push('--change');
    if (dryRun) args.push('--dry-run');

    startCommandJob(res, args, {
      message: 'Status management job started',
      warning: status === 'publie' ? 'This will publish the article to production' : undefined,
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
  router.post('/publish-ready-article', (req, res) => {
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
    const args = ['scripts/publish-to-actualidad.mjs', '--slug', sanitizedSlug];

    if (dryRun) args.push('--dry-run');

    startCommandJob(res, args, {
      message: 'Article publication job started',
      warning: 'This will publish the article to kilombo.top',
      errorMessage: 'Failed to start publish job',
    });
  });

  return router;
}

export default createCommandsRouter;
