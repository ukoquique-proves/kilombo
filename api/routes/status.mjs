// @ts-check
/**
 * Public status routes — no auth required, no external dependencies.
 * Extracted from api/server.mjs as the first step of splitting that file
 * into per-family routers (see docs/TO_FIX.md #80). Deliberately the
 * smallest possible first move: these two routes have zero middleware and
 * zero state, so this step proves the mounting mechanism works before any
 * route with a security implication gets touched.
 *
 * Behavior is unchanged from the original inline definitions.
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.47.0-MVP',
    uptime: process.uptime(),
  });
});

/**
 * GET /api/env-status
 * Returns status of environment variables (public info only)
 */
router.get('/env-status', (req, res) => {
  res.json({
    KILO_APPROVE_PUBLISHING: process.env.KILO_APPROVE_PUBLISHING === 'true',
    hasEnv: Object.keys(process.env).length > 0,
  });
});

export default router;
