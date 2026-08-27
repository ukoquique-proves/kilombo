/**
 * scripts/lib/migration-reporter.mjs
 * ═══════════════════════════════════════════════════════════════════════
 * Logging and progress reporting for migrations
 *
 * RESPONSIBILITIES:
 *   - Format and display migration progress
 *   - Track success/failure counts
 *   - Generate migration reports
 *   - Write results to file if needed
 *
 * NO SIDE EFFECTS (by default):
 *   - Writes to stdout/stderr only
 *   - File writing is optional via writeReport()
 *
 * USAGE:
 *   import { MigrationReporter } from './migration-reporter.mjs';
 *   const reporter = new MigrationReporter();
 *   reporter.startMigration('article-id');
 *   reporter.success('article-id', 90);
 *   reporter.printSummary();
 */

import fs from 'node:fs';
import path from 'node:path';

export class MigrationReporter {
  constructor(options = {}) {
    this.verbose = options.verbose ?? true;
    this.silent = options.silent ?? false;
    this.migrations = new Map(); // articleId → { status, articleId?, error?, timestamp }
    this.startTime = Date.now();
  }

  /**
   * Record migration started
   */
  startMigration(articleId) {
    this.migrations.set(articleId, {
      status: 'in-progress',
      articleId,
      startTime: Date.now(),
    });
    this.log(`⏳ Starting migration: ${articleId}`);
  }

  /**
   * Record successful migration
   */
  success(articleId, spipArticleId) {
    const migration = this.migrations.get(articleId) || {};
    this.migrations.set(articleId, {
      ...migration,
      status: 'success',
      articleId: spipArticleId,
      endTime: Date.now(),
    });
    this.log(`✅ Success: ${articleId} → SPIP ID ${spipArticleId}`);
  }

  /**
   * Record failed migration
   */
  failure(articleId, error) {
    const migration = this.migrations.get(articleId) || {};
    this.migrations.set(articleId, {
      ...migration,
      status: 'failure',
      error: error instanceof Error ? error.message : String(error),
      endTime: Date.now(),
    });
    this.log(`❌ Failed: ${articleId} — ${error}`, 'error');
  }

  /**
   * Record dry-run preview
   */
  dryRun(articleId) {
    const migration = this.migrations.get(articleId) || {};
    this.migrations.set(articleId, {
      ...migration,
      status: 'dry-run',
      articleId,
      endTime: Date.now(),
    });
    this.log(`🔍 Dry-run preview completed: ${articleId}`);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const entries = Array.from(this.migrations.values());
    return {
      total: entries.length,
      success: entries.filter((m) => m.status === 'success').length,
      failure: entries.filter((m) => m.status === 'failure').length,
      dryRun: entries.filter((m) => m.status === 'dry-run').length,
      inProgress: entries.filter((m) => m.status === 'in-progress').length,
      duration: Date.now() - this.startTime,
    };
  }

  /**
   * Print formatted summary to console
   */
  printSummary() {
    const summary = this.getSummary();
    const durationSec = (summary.duration / 1000).toFixed(2);

    this.log('\n' + '='.repeat(60));
    this.log('📊 MIGRATION REPORT');
    this.log('='.repeat(60));
    this.log(`Total:     ${summary.total}`);
    this.log(`✅ Success: ${summary.success}`);
    this.log(`❌ Failed:  ${summary.failure}`);
    this.log(`🔍 Dry-run: ${summary.dryRun}`);
    this.log(`Duration:  ${durationSec}s`);
    this.log('='.repeat(60) + '\n');

    // Print details for each migration
    if (this.verbose && this.migrations.size > 0) {
      this.log('DETAILS:');
      for (const [articleId, migration] of this.migrations) {
        const status = this.statusEmoji(migration.status);
        const info = migration.error
          ? `${status} ${articleId}: ${migration.error}`
          : migration.status === 'dry-run'
            ? `${status} ${articleId} (preview)`
            : `${status} ${articleId} → SPIP ID ${migration.articleId}`;
        this.log(info);
      }
      this.log('');
    }
  }

  /**
   * Get emoji for status
   * @private
   */
  statusEmoji(status) {
    const emojis = {
      success: '✅',
      failure: '❌',
      'dry-run': '🔍',
      'in-progress': '⏳',
    };
    return emojis[status] || '❓';
  }

  /**
   * Write report to file
   */
  writeReport(filePath) {
    const summary = this.getSummary();
    const timestamp = new Date().toISOString();

    const report = {
      timestamp,
      summary,
      migrations: Array.from(this.migrations.entries()).map(([articleId, migration]) => ({
        articleId,
        ...migration,
      })),
    };

    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    this.log(`📝 Report written to: ${filePath}`);
  }

  /**
   * Log message (respects silent mode)
   */
  log(message, level = 'info') {
    if (this.silent) return;

    if (level === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  }

  /**
   * Get all migrations as array
   */
  getAll() {
    return Array.from(this.migrations.entries()).map(([articleId, migration]) => ({
      articleId,
      ...migration,
    }));
  }
}

export default MigrationReporter;
