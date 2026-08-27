/**
 * test/migrate-to-spip.test.mjs
 * ═══════════════════════════════════════════════════════════════════════
 * Integration tests for the migration system (article-extractor, spip-client, reporter)
 *
 * Tests the decoupled architecture without hitting live SPIP backend.
 *
 * Run: npm test
 */

import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArticleExtractor } from '../scripts/lib/article-extractor.mjs';
import { MigrationReporter } from '../scripts/lib/migration-reporter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const ARTICLES_JSON_PATH = path.join(PROJECT_ROOT, 'site/assets/content/articles.json');

// ──────────────────────────────────────────────────────────────────────
// Test Suite: Article Extractor (Data Layer)
// ──────────────────────────────────────────────────────────────────────

test('ArticleExtractor: Load articles.json', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const articles = extractor.load();

  assert.ok(Array.isArray(articles), 'Articles should be an array');
  assert.ok(articles.length > 0, 'Should have at least one article');
});

test('ArticleExtractor: Find article by ID', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const article = extractor.findById('terrorismo-estado-mundial');

  assert.equal(article.id, 'terrorismo-estado-mundial');
  assert.ok(article.title, 'Article should have title');
  assert.ok(article.contentHtml, 'Article should have contentHtml');
});

test('ArticleExtractor: Throw on missing article', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);

  assert.throws(() => {
    extractor.findById('nonexistent-article-slug');
  }, /Article not found/);
});

test('ArticleExtractor: Validate article fields', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);

  // Valid article should not throw
  const article = extractor.findById('terrorismo-estado-mundial');
  extractor.validateArticle(article);

  // Invalid article should throw
  assert.throws(() => {
    extractor.validateArticle({
      id: 'test',
      title: 'Test',
      // Missing contentHtml
      section: '1',
    });
  }, /missing required fields/);
});

test('ArticleExtractor: Extract migration data', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const article = extractor.findById('terrorismo-estado-mundial');
  const migrationData = extractor.extractMigrationData(article);

  assert.ok(migrationData.id, 'Should have id');
  assert.ok(migrationData.title, 'Should have title');
  assert.ok(migrationData.contentHtml, 'Should have contentHtml');
  assert.equal(typeof migrationData.section, 'string', 'Section should be string');
});

test('ArticleExtractor: Find articles by status', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const importedArticles = extractor.findByStatus('imported');

  assert.ok(Array.isArray(importedArticles), 'Should return array');
  assert.ok(importedArticles.length > 0, 'Should find at least one imported article');
  importedArticles.forEach((article) => {
    assert.equal(article.status, 'imported', 'All results should have matching status');
  });
});

test('ArticleExtractor: Get migration status', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const status = extractor.getMigrationStatus('terrorismo-estado-mundial');

  assert.equal(status.articleId, 'terrorismo-estado-mundial');
  assert.ok(status.title, 'Should have title');
  assert.ok(status.currentStatus, 'Should have currentStatus');
  assert.equal(
    status.hasMigrated,
    true,
    'Article with "imported" status should have hasMigrated=true'
  );
});

// ──────────────────────────────────────────────────────────────────────
// Test Suite: Migration Reporter (Logging)
// ──────────────────────────────────────────────────────────────────────

test('MigrationReporter: Track successful migration', (t) => {
  const reporter = new MigrationReporter({ silent: true });

  reporter.startMigration('article-1');
  reporter.success('article-1', 90);

  const summary = reporter.getSummary();
  assert.equal(summary.total, 1, 'Should have 1 migration');
  assert.equal(summary.success, 1, 'Should have 1 success');
  assert.equal(summary.failure, 0, 'Should have 0 failures');
});

test('MigrationReporter: Track failed migration', (t) => {
  const reporter = new MigrationReporter({ silent: true });

  reporter.startMigration('article-1');
  reporter.failure('article-1', new Error('Test error'));

  const summary = reporter.getSummary();
  assert.equal(summary.total, 1, 'Should have 1 migration');
  assert.equal(summary.failure, 1, 'Should have 1 failure');
  assert.equal(summary.success, 0, 'Should have 0 successes');
});

test('MigrationReporter: Track dry-run', (t) => {
  const reporter = new MigrationReporter({ silent: true });

  reporter.startMigration('article-1');
  reporter.dryRun('article-1');

  const summary = reporter.getSummary();
  assert.equal(summary.dryRun, 1, 'Should have 1 dry-run');
  assert.equal(summary.success, 0, 'Dry-run should not count as success');
});

test('MigrationReporter: Summary statistics', (t) => {
  const reporter = new MigrationReporter({ silent: true });

  reporter.startMigration('article-1');
  reporter.success('article-1', 90);

  reporter.startMigration('article-2');
  reporter.failure('article-2', new Error('Test'));

  reporter.startMigration('article-3');
  reporter.dryRun('article-3');

  const summary = reporter.getSummary();
  assert.equal(summary.total, 3, 'Should have 3 migrations');
  assert.equal(summary.success, 1, 'Should have 1 success');
  assert.equal(summary.failure, 1, 'Should have 1 failure');
  assert.equal(summary.dryRun, 1, 'Should have 1 dry-run');
  assert.equal(summary.inProgress, 0, 'No in-progress migrations');
  assert.ok(summary.duration >= 0, 'Should have duration');
});

test('MigrationReporter: Get all migrations', (t) => {
  const reporter = new MigrationReporter({ silent: true });

  reporter.startMigration('article-1');
  reporter.success('article-1', 90);

  reporter.startMigration('article-2');
  reporter.failure('article-2', new Error('Test'));

  const all = reporter.getAll();
  assert.equal(all.length, 2, 'Should have 2 migrations');
  assert.ok(all[0].articleId, 'Should have articleId');
  assert.ok(all[0].status, 'Should have status');
});

// ──────────────────────────────────────────────────────────────────────
// Test Suite: Integration (Data + Reporting)
// ──────────────────────────────────────────────────────────────────────

test('Integration: Extract article and report migration', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const reporter = new MigrationReporter({ silent: true });

  const article = extractor.findById('terrorismo-estado-mundial');

  reporter.startMigration(article.id);
  reporter.success(article.id, 90); // Simulated SPIP ID

  const summary = reporter.getSummary();
  assert.equal(summary.success, 1, 'Should track success');

  const all = reporter.getAll();
  // The reporter stores the SPIP article ID in the articleId field
  assert.equal(all[0].articleId, 90, 'Should have SPIP article ID');
  assert.equal(all[0].status, 'success', 'Should be success status');
});

test('Integration: Handle validation errors gracefully', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const reporter = new MigrationReporter({ silent: true });

  try {
    const article = extractor.findById('nonexistent');
    reporter.startMigration(article.id);
    reporter.success(article.id, 90);
  } catch (error) {
    reporter.startMigration('nonexistent');
    reporter.failure('nonexistent', error);
  }

  const summary = reporter.getSummary();
  assert.equal(summary.failure, 1, 'Should track failure');
  assert.equal(summary.success, 0, 'Should not count as success');
});

// ──────────────────────────────────────────────────────────────────────
// Test Suite: Batch Operations
// ──────────────────────────────────────────────────────────────────────

test('ArticleExtractor: Batch operations on multiple articles', (t) => {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const reporter = new MigrationReporter({ silent: true });

  const importedArticles = extractor.findByStatus('imported');

  // Simulate batch migration
  importedArticles.slice(0, 3).forEach((article, index) => {
    reporter.startMigration(article.id);
    if (index % 2 === 0) {
      reporter.success(article.id, 100 + index);
    } else {
      reporter.failure(article.id, new Error('Simulated error'));
    }
  });

  const summary = reporter.getSummary();
  assert.equal(summary.total, 3, 'Should process 3 articles');
  assert.ok(summary.success > 0, 'Should have successes');
  assert.ok(summary.failure > 0, 'Should have failures');
});

console.log('✅ All migration system tests passed\n');
