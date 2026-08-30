#!/usr/bin/env node
/**
 * scripts/cleanup-stale-in-progress-duplicates.mjs
 *
 * Data-hygiene fix accompanying the getReadyDraft() bugfix in
 * scripts/lib/drafts-store.mjs (see CHANGELOG.md / docs/TO_FIX.md).
 *
 * Root cause: some past migration/import wrote the same slug into both
 * data/articulos_en_trabajo/IN_PROGRESS/ and data/articulos_en_trabajo/READY/
 * directly, instead of going through approveDraft() (which writes to READY/
 * and then deletes the IN_PROGRESS/ copy). Because getDraft() checked
 * IN_PROGRESS/ before READY/, this made GET /api/ready-drafts/:slug 404 for
 * every affected article — the dashboard's "✏️ Editar" button silently
 * failed for 27 of 30 READY articles.
 *
 * The code bug is fixed separately (server.mjs now uses getReadyDraft(),
 * which only ever reads READY/). This script cleans up the leftover data:
 * for every slug present in *both* directories, READY/ is treated as
 * canonical (same assumption approveDraft() already makes — see its
 * "READY is canonical" comment) and the stale IN_PROGRESS/ copy is removed.
 *
 * Articles that exist ONLY in IN_PROGRESS/ (genuine drafts still being
 * worked on, never approved) are left untouched.
 *
 * Dry-run by default — prints what would be deleted and writes nothing.
 * Pass --commit to actually delete the stale files.
 *
 * Usage:
 *   node scripts/cleanup-stale-in-progress-duplicates.mjs            (dry-run)
 *   node scripts/cleanup-stale-in-progress-duplicates.mjs --commit   (deletes)
 */

import { readdirSync, existsSync, unlinkSync, appendFileSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const WORK_DIR = join(REPO_ROOT, 'data', 'articulos_en_trabajo');
const IN_PROGRESS_DIR = join(WORK_DIR, 'IN_PROGRESS');
const READY_DIR = join(WORK_DIR, 'READY');
const AUDIT_LOG_PATH = join(REPO_ROOT, 'live-write-audit.log.jsonl');

const commit = process.argv.includes('--commit');

function listSlugs(dir) {
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => basename(f, '.json'))
  );
}

function appendAudit(action, target, success, errorMsg) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      actor: 'cleanup-stale-in-progress-duplicates-script',
      action,
      target,
      result: success ? 'success' : 'error',
      ...(errorMsg ? { error: errorMsg } : null),
    };
    appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.error(`[audit FAILED] ${String(err)}`);
  }
}

const readySlugs = listSlugs(READY_DIR);
const inProgressSlugs = listSlugs(IN_PROGRESS_DIR);

const staleSlugs = [...inProgressSlugs].filter((slug) => readySlugs.has(slug)).sort();

if (!staleSlugs.length) {
  console.log('No stale IN_PROGRESS duplicates found — nothing to do.');
  process.exit(0);
}

console.log(
  `Found ${staleSlugs.length} slug(s) present in BOTH IN_PROGRESS/ and READY/ ` +
    `(READY/ total: ${readySlugs.size}, IN_PROGRESS/ total: ${inProgressSlugs.size}):\n`
);
for (const slug of staleSlugs) {
  console.log(`  - ${slug}`);
}

if (!commit) {
  console.log(
    `\nDry-run — no files deleted. Re-run with --commit to remove these ` +
      `${staleSlugs.length} stale copies from IN_PROGRESS/ (READY/ is canonical).`
  );
  process.exit(0);
}

let deleted = 0;
for (const slug of staleSlugs) {
  const p = join(IN_PROGRESS_DIR, `${slug}.json`);
  try {
    unlinkSync(p);
    deleted += 1;
    appendAudit('draft.cleanup_stale_duplicate', { slug, path: p }, true);
    console.log(`Deleted: ${p}`);
  } catch (err) {
    appendAudit('draft.cleanup_stale_duplicate', { slug, path: p }, false, err.message);
    console.error(`Failed to delete ${p}: ${err.message}`);
  }
}

console.log(`\nDone — removed ${deleted}/${staleSlugs.length} stale IN_PROGRESS duplicate(s).`);
