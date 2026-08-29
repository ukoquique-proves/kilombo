/**
 * api/lib/audit-logger.mjs
 *
 * Infrastructure adapter for the append-only audit trail
 * (live-write-audit.log.jsonl). This is the ONLY module that touches that
 * file directly — server.mjs and api/lib/auth.mjs depend on the small
 * `append`/`read` interface below, not on the filesystem shape, so the
 * storage mechanism could change (e.g. to a database) without touching
 * callers.
 *
 * @module
 */

import fs from 'node:fs';

/**
 * @param {string} logPath - Absolute path to the .jsonl audit log file
 * @returns {{ append: (entry: object) => void, read: (limit: number) => object[] }}
 */
export function createAuditLogger(logPath) {
  /**
   * Append one JSON line to the audit log. Never throws — a logging
   * failure must not break the request it's auditing.
   * @param {object} entry
   */
  function append(entry) {
    try {
      fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
    } catch (err) {
      console.warn('[AUDIT] Failed to write audit log:', err && err.message);
    }
  }

  /**
   * Read the most recent `limit` entries (most recent first).
   * Malformed lines are silently skipped rather than failing the whole read.
   * @param {number} limit
   * @returns {object[]}
   */
  function read(limit) {
    if (!fs.existsSync(logPath)) return [];
    const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter((line) => line.trim());
    const entries = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // skip malformed line
      }
    }
    return entries.reverse().slice(0, limit);
  }

  return { append, read, exists: () => fs.existsSync(logPath) };
}
