#!/usr/bin/env node
/**
 * scripts/migrate-to-spip.mjs
 * ═══════════════════════════════════════════════════════════════════════
 * Main orchestrator for migrating articles from articles.json to SPIP
 *
 * ARCHITECTURE:
 *   - CLI interface (this file)
 *   - Uses decoupled library modules:
 *     • article-extractor.mjs — reads articles.json
 *     • spip-client.mjs — manages SPIP interactions
 *     • migration-reporter.mjs — logs progress
 *   - No direct file I/O or Playwright calls
 *
 * DESIGN PRINCIPLES:
 *   1. Separation of concerns (each module has one responsibility)
 *   2. Testable (all dependencies are injectable/mockable)
 *   3. Reusable (modules can be used independently)
 *   4. Documented (clear interfaces, error messages)
 *
 * USAGE:
 *   # Migrate single article (draft status, awaiting review)
 *   node scripts/migrate-to-spip.mjs --article-id terrorismo-estado-mundial
 *
 *   # Migrate and publish immediately (live)
 *   node scripts/migrate-to-spip.mjs --article-id terrorismo-estado-mundial --publish
 *
 *   # Dry-run preview (no SPIP changes)
 *   node scripts/migrate-to-spip.mjs --article-id terrorismo-estado-mundial --dry-run
 *
 *   # Batch migrate all pending-review articles (to draft queue)
 *   node scripts/migrate-to-spip.mjs --migrate-all pending-review
 *
 *   # Batch migrate and publish all
 *   node scripts/migrate-to-spip.mjs --migrate-all pending-review --publish
 *
 *   # List articles ready for migration
 *   node scripts/migrate-to-spip.mjs --list
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArticleExtractor } from './lib/article-extractor.mjs';
import { SPIPClient } from './lib/spip-client.mjs';
import { MigrationReporter } from './lib/migration-reporter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const ARTICLES_JSON_PATH = path.join(PROJECT_ROOT, 'site/assets/content/articles.json');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');

// ──────────────────────────────────────────────────────────────────────
// CLI Argument Parsing
// ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    mode: null,
    articleId: null,
    status: null,
    section: '1',
    dryRun: false,
    verbose: true,
    reportPath: null,
    publish: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--article-id') args.articleId = argv[++i];
    else if (arg === '--migrate-all') args.status = argv[++i];
    else if (arg === '--list') args.mode = 'list';
    else if (arg === '--section') args.section = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--publish') args.publish = true;
    else if (arg === '--report') args.reportPath = argv[++i];
    else if (arg === '--quiet') args.verbose = false;
  }

  // Infer mode from arguments
  if (args.mode === null) {
    if (args.articleId) args.mode = 'migrate-single';
    else if (args.status) args.mode = 'migrate-batch';
    else args.mode = 'list'; // default
  }

  // SECURITY: Require KILO_APPROVE_PUBLISHING before any --publish run,
  // regardless of mode. Without this, batch mode would create draft articles
  // for every item in the batch before discovering publishing is blocked —
  // wasting writes and printing misleading ✅ lines for partial successes.
  if (args.publish && !process.env.KILO_APPROVE_PUBLISHING) {
    console.error('\n⚠️  SECURITY CHECK: Direct publishing requires explicit approval.\n');
    console.error('To publish directly (bypass moderation queue):');
    console.error(
      '  KILO_APPROVE_PUBLISHING=true node scripts/migrate-to-spip.mjs ...\n'
    );
    console.error('Better practice: Use default mode (draft for review):');
    console.error('  node scripts/migrate-to-spip.mjs --article-id <slug>\n');
    process.exit(1);
  }

  return args;
}

// ──────────────────────────────────────────────────────────────────────
// Migration Logic
// ──────────────────────────────────────────────────────────────────────

async function migrateSingleArticle(articleId, opts = {}) {
  const { section, dryRun, publish, verbose } = opts;
  const reporter = new MigrationReporter({ verbose });
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const client = new SPIPClient({ envPath: ENV_PATH, timeout: 120000 });

  try {
    // Load article
    reporter.startMigration(articleId);
    const article = extractor.findById(articleId);
    const migrationData = extractor.extractMigrationData(article);

    if (verbose) {
      console.log(`\n📄 Article: ${migrationData.title}`);
      console.log(`   ID: ${migrationData.id}`);
      console.log(`   Section: ${migrationData.section}`);
      console.log(`   Status: ${migrationData.status}`);
    }

    // Create in SPIP
    const modeText = dryRun
      ? ' (dry-run)'
      : publish
        ? ' (will be published)'
        : ' (draft, awaiting review)';
    if (verbose) {
      console.log(`\n📤 Creating in SPIP${modeText}...`);
    }

    const createResult = await client.createArticle({
      title: migrationData.title,
      body: migrationData.contentHtml,
      section: section || migrationData.section,
      dryRun,
    });

    if (dryRun) {
      reporter.dryRun(articleId);
      console.log('✅ Dry-run preview completed (no article created)');
      reporter.printSummary();
      return { success: true, dryRun: true };
    }

    if (!createResult.success) {
      reporter.failure(articleId, createResult.error);
      console.error(`❌ Creation failed: ${createResult.error}`);
      reporter.printSummary();
      return { success: false };
    }

    const spipArticleId = createResult.articleId;
    const statusText = publish ? 'and will be published' : 'awaiting editorial review';
    console.log(`✅ Article created with SPIP ID: ${spipArticleId}`);
    console.log(`   Status: ${statusText}`);
    console.log(`   URL: ${createResult.url}`);

    // Publish if requested
    if (publish) {
      if (verbose) {
        console.log(`\n📤 Publishing (status → publie)...`);
      }

      const statusResult = await client.changeArticleStatus({
        articleId: spipArticleId,
        status: 'publie',
      });

      if (!statusResult.success) {
        reporter.success(articleId, spipArticleId); // partial success
        console.warn(`⚠️  Article created but publication failed: ${statusResult.error}`);
        reporter.printSummary();
        return { success: true, published: false, articleId: spipArticleId };
      }

      console.log(`✅ Article published (status: ${statusResult.status})`);
      console.log(`   Live at: https://www.kilombo.top/spip.php?article${spipArticleId}`);
    } else {
      console.log(`\n💡 Article is in draft status. To publish it, run:`);
      console.log(`   node scripts/migrate-to-spip.mjs --article-id ${articleId} --publish`);
    }

    reporter.success(articleId, spipArticleId);
    reporter.printSummary();

    return { success: true, published: publish, articleId: spipArticleId };
  } catch (error) {
    reporter.failure(articleId, error);
    console.error(`❌ Migration failed: ${error.message}`);
    reporter.printSummary();
    return { success: false, error: error.message };
  }
}

async function migrateBatchArticles(status, opts = {}) {
  const { section, dryRun, publish, verbose } = opts;
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const reporter = new MigrationReporter({ verbose });

  try {
    const articles = extractor.findByStatus(status);

    if (articles.length === 0) {
      console.log(`ℹ️  No articles found with status: ${status}`);
      return { success: true, count: 0 };
    }

    const modeText = publish ? 'and publishing' : 'to draft (awaiting review)';
    console.log(`\n📋 Found ${articles.length} article(s) with status: ${status}`);
    console.log(`   Processing ${modeText}...`);

    for (const article of articles) {
      // eslint-disable-next-line no-await-in-loop
      const result = await migrateSingleArticle(article.id, {
        section,
        dryRun,
        publish,
        verbose: false,
      });

      if (!result.success) {
        console.log(`  ❌ ${article.id}: ${result.error}`);
      } else if (publish && !result.published) {
        console.log(`  ⚠️  ${article.id}: created as draft but publication failed`);
      } else {
        console.log(`  ✅ ${article.id}`);
      }
    }

    reporter.printSummary();
    return { success: true, count: articles.length };
  } catch (error) {
    console.error(`❌ Batch migration failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function listArticles() {
  const extractor = new ArticleExtractor(ARTICLES_JSON_PATH);
  const articles = extractor.load();

  console.log('\n📚 Articles in articles.json:\n');
  console.log('ID'.padEnd(35), 'TITLE'.padEnd(40), 'STATUS'.padEnd(15), 'SECTION');
  console.log('─'.repeat(90));

  articles.forEach((article) => {
    const id = article.id.padEnd(35);
    const title = article.title.substring(0, 40).padEnd(40);
    const st = (article.status || 'unknown').padEnd(15);
    const section = article.section || '?';
    console.log(`${id}${title}${st}${section}`);
  });

  console.log('\n✏️  MIGRATION MODES:');
  console.log('  • Default (no --publish): Article created in SPIP as draft');
  console.log('    Status: "En curso de redacción" (awaiting editorial review)');
  console.log('  • With --publish flag: Article created AND immediately published');
  console.log('    Status: "Publicado" (live on www.kilombo.top)\n');
}

// ──────────────────────────────────────────────────────────────────────
// Main Entry Point
// ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  try {
    switch (args.mode) {
      case 'list':
        listArticles();
        process.exit(0);
        break;

      case 'migrate-single':
        if (!args.articleId) {
          console.error('❌ --article-id is required for migrate-single mode');
          process.exit(1);
        }
        // eslint-disable-next-line no-await-in-loop
        await migrateSingleArticle(args.articleId, {
          section: args.section,
          dryRun: args.dryRun,
          publish: args.publish,
          verbose: args.verbose,
        });
        process.exit(0);
        break;

      case 'migrate-batch':
        // eslint-disable-next-line no-await-in-loop
        await migrateBatchArticles(args.status, {
          section: args.section,
          dryRun: args.dryRun,
          publish: args.publish,
          verbose: args.verbose,
        });
        process.exit(0);
        break;

      default:
        listArticles();
        process.exit(0);
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Run
// ──────────────────────────────────────────────────────────────────────

main().catch((error) => {
  console.error(`Fatal: ${error.message}`);
  process.exit(1);
});

export { migrateSingleArticle, migrateBatchArticles, listArticles };
