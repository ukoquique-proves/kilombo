// @ts-check
/**
 * Job status/listing routes. Extracted from api/server.mjs — see
 * docs/TO_FIX.md #80 (step: GET /api/jobs/:jobId/status, GET /api/jobs).
 *
 * Auth note: this router is mounted at '/api/jobs' in server.mjs, AFTER
 * `app.use('/api/jobs', requireSharedSecret)` is registered there. The
 * auth middleware itself stays in server.mjs — it is not duplicated here —
 * so protection for these routes depends on mount order in server.mjs,
 * not on anything in this file. Behavior is otherwise unchanged from the
 * original inline definitions.
 */

import express from 'express';
import { getJob, listJobs } from '../lib/job-manager.mjs';

const router = express.Router();

/**
 * GET /api/jobs/:jobId/status
 * Query the status of a running or completed job
 */
router.get('/:jobId/status', (req, res) => {
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
router.get('/', (req, res) => {
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

export default router;
