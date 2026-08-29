/**
 * api/lib/auth.mjs
 *
 * Shared-secret authentication for sensitive endpoints. Depends only on the
 * small `auditLogger` interface (see audit-logger.mjs), not on the filesystem
 * directly — this middleware doesn't know or care how audit entries are
 * persisted.
 *
 * @module
 */

import crypto from 'node:crypto';

/**
 * @param {object} deps
 * @param {string} deps.secret - Expected value of the x-kilo-secret header
 * @param {{ append: (entry: object) => void }} deps.auditLogger
 * @returns {import('express').RequestHandler}
 */
export function createRequireSharedSecret({ secret, auditLogger }) {
  const secretBuf = Buffer.from(secret, 'utf8');

  return function requireSharedSecret(req, res, next) {
    const supplied = (req.get('x-kilo-secret') || '').trim();

    if (!secret) {
      // Should be guarded at startup (server.mjs refuses to boot without a
      // secret) — this is a defensive fallback in case that check is bypassed.
      console.error('[SECURITY] KILO_SHARED_SECRET not configured — refusing request');
      auditLogger.append({
        ts: new Date().toISOString(),
        event: 'auth_config_missing',
        path: req.path,
        method: req.method,
      });
      return res
        .status(500)
        .json({ error: 'Server misconfigured', message: 'KILO_SHARED_SECRET not configured on server' });
    }

    // Constant-time comparison — prevents timing side-channels that could
    // leak the secret one byte at a time. timingSafeEqual requires
    // equal-length buffers, so the length check must happen first; that
    // check itself leaks no secret bytes (the attacker already controls the
    // supplied value's length).
    const suppliedBuf = Buffer.from(supplied, 'utf8');
    const secretMatch = supplied.length === secret.length && crypto.timingSafeEqual(suppliedBuf, secretBuf);

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
      auditLogger.append(entry);
      console.warn('[SECURITY] Missing or invalid x-kilo-secret for', req.path, 'from', entry.ip);
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid x-kilo-secret header' });
    }

    return next();
  };
}
