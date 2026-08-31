// @ts-check
/**
 * POST /api/commands/create-article. Extracted from api/server.mjs — see
 * docs/TO_FIX.md #80. Factory takes `cwd` (was KILOMBO_DIR via closure in
 * server.mjs) since this route spawns a script relative to the repo root.
 * Behavior is unchanged from the original inline definition.
 */

import express from 'express';
import { isValidSection, VALID_SECTIONS } from '../lib/command-validators.mjs';
import { sanitizeInput } from '../lib/util/sanitize-input.mjs';
import { slugToRubriquId } from '../../scripts/lib/spip-client.mjs';
import { startCommandJob } from '../lib/command-job-runner.mjs';

/**
 * @param {{ cwd: string }} deps
 * @returns {import('express').Router}
 */
export function createCreateArticleRouter({ cwd }) {
  const router = express.Router();

  /**
   * POST /api/commands/create-article
   *
   * Spawn: node scripts/create-article.mjs --create --title "..." --body "..." --section "..."
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
  router.post('/', (req, res) => {
    const { title, body, section = 'general', dryRun = false } = req.body;

    // Validation
    if (!title || !body) {
      return res.status(400).json({
        error: 'Missing required fields: title, body',
      });
    }

    if (!isValidSection(section)) {
      return res.status(400).json({
        error: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')} (or a numeric SPIP rubrique ID)`,
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
      'scripts/create-article.mjs',
      '--create',
      '--title', sanitizedTitle,
      '--body', sanitizedBody,
      '--section', rubriquId,
    ];

    if (dryRun) args.push('--dry-run');

    startCommandJob(res, args, { message: 'Article creation job started', cwd });
  });

  return router;
}
