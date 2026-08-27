#!/usr/bin/env node
/**
 * scripts/lib/live-write-gateway.mjs
 * ═══════════════════════════════════════════════════════════════════════
 * Single chokepoint for every action that mutates state on the live SPIP
 * site (www.kilombo.top).
 *
 * WHY THIS EXISTS:
 * Four separate CLI scripts (scripts/create-article.mjs,
 * scripts/manage-article-status.mjs, scripts/customize-escal-theme.mjs, and
 * indirectly scripts/migrate-to-spip.mjs via SPIPClient, which spawns the
 * first two as subprocesses) each independently drive a Playwright browser
 * against the live admin credentials. Without a shared seam, hardening any
 * one of them means hardening all of them separately — and it's easy for a
 * fifth script to be added later that quietly bypasses whatever controls
 * got bolted on. See docs/RISK-REGISTER.json for the specific risks this
 * is meant to eventually close (KILO-001, KILO-002).
 *
 * WHAT THIS DOES TODAY (v1 — deliberately permissive):
 *   - Every mutating call is routed through guardedWrite().
 *   - Every attempt (allowed, dry-run, success, or error) is appended to a
 *     structured JSONL audit log.
 *   - checkPolicy() is a pass-through: nothing is blocked yet.
 *
 * WHAT THIS SEAM ENABLES LATER, WITHOUT TOUCHING CALL SITES:
 *   - Policy checks (e.g. require an explicit env var / confirmation before
 *     "publie" or before any live write at all).
 *   - Per-action credential scoping (e.g. theme edits use a narrower SPIP
 *     role than article publishing).
 *   - Rate limiting / cooldown windows.
 *   - Human confirmation prompts before executing.
 *
 * All of the above is a change to checkPolicy() (and possibly the .env
 * lookup) in THIS file only. No other script needs to change again.
 *
 * NOT IN SCOPE FOR v1:
 *   This module does not itself add security. It is the seam that makes
 *   adding security a localized change instead of a scattered one. Treat
 *   every currently-open entry in docs/RISK-REGISTER.json as still open
 *   after this lands.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');
const AUDIT_LOG_PATH = path.join(REPO_ROOT, 'live-write-audit.log.jsonl');

/**
 * @typedef {Object} LiveWriteRequest
 * @property {string} action        - machine-readable action name, e.g.
 *                                     'article.create', 'article.status.change',
 *                                     'theme.field.update'.
 * @property {string} [script]      - defaults to the invoking CLI script's basename.
 * @property {Record<string, unknown>} [target] - identifying info, e.g. { id, status } or { field }.
 * @property {boolean} [dryRun]     - whether the underlying script is in dry-run mode.
 *                                     NOTE: dry-run safety (blocking POSTs at the
 *                                     network layer) is still the calling script's
 *                                     responsibility — this flag only affects logging
 *                                     and is available for future policy checks.
 * @property {() => Promise<unknown>} execute - the actual write step. Only called
 *                                     if checkPolicy() allows the request.
 * @property {string[]} [relatedRisks] - docs/RISK-REGISTER.json ids this call site
 *                                     is tracked under, for traceability.
 */

/**
 * Policy hook. v1 is intentionally a pass-through: every request is allowed.
 * This is the ONLY function that needs to change to add gating logic later
 * (env var checks, role checks, confirmation prompts, time-of-day rules,
 * etc.) — every mutating call site in the project already routes through
 * guardedWrite(), so a change here applies everywhere at once.
 *
 * @param {LiveWriteRequest} req
 * @returns {{allowed: boolean, reason?: string}}
 */
function checkPolicy(req) {
  return { allowed: true };
}

/**
 * @param {Record<string, unknown>} entry
 */
function appendAuditEntry(entry) {
  try {
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    // Audit logging must never be the reason a script crashes.
    console.error(`[live-write-gateway] failed to write audit log: ${err.message}`);
  }
}

/**
 * Single chokepoint for any script that mutates the live SPIP site.
 * Every script that does so MUST call this instead of driving the final
 * Playwright submit/click step directly.
 *
 * @param {LiveWriteRequest} req
 * @returns {Promise<unknown>} the return value of req.execute(), if permitted
 */
export async function guardedWrite(req) {
  const {
    action,
    script = path.basename(process.argv[1] || 'unknown'),
    target = {},
    dryRun = false,
    execute,
    relatedRisks = [],
  } = req;

  if (!action) throw new Error('guardedWrite requires an action name');
  if (typeof execute !== 'function') {
    throw new Error('guardedWrite requires an execute() function');
  }

  const timestamp = new Date().toISOString();
  const decision = checkPolicy(req);
  const baseEntry = { timestamp, action, script, target, dryRun, relatedRisks };

  if (!decision.allowed) {
    appendAuditEntry({ ...baseEntry, result: 'blocked', reason: decision.reason });
    throw new Error(`[live-write-gateway] blocked "${action}": ${decision.reason}`);
  }

  if (dryRun) {
    appendAuditEntry({ ...baseEntry, result: 'dry-run' });
    return execute();
  }

  try {
    const result = await execute();
    appendAuditEntry({ ...baseEntry, result: 'success' });
    return result;
  } catch (err) {
    appendAuditEntry({ ...baseEntry, result: 'error', error: err.message });
    throw err;
  }
}

export default { guardedWrite };
