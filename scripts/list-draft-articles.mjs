#!/usr/bin/env node
/**
 * scripts/list-draft-articles.mjs
 * ═══════════════════════════════════════════════════════════════════════
 * Query and list all draft articles awaiting approval in SPIP
 *
 * SPIP uses status codes:
 *   prepa      - En curso de redacción (DRAFT — awaiting approval)
 *   prop       - Propuesto a la evaluación (proposed for review)
 *   publie     - Publicado (published)
 *   refuse     - Rechazado (refused)
 *   poubelle   - A la papelera (trash)
 *
 * USAGE:
 *   # List all drafts in all sections
 *   node scripts/list-draft-articles.mjs --all
 *
 *   # List drafts in specific section
 *   node scripts/list-draft-articles.mjs --section "Tierra y Libertad"
 *   node scripts/list-draft-articles.mjs --section 1
 *
 *   # Include articles by other statuses
 *   node scripts/list-draft-articles.mjs --section 1 --status prepa,prop
 *
 *   # Verbose output with article URLs
 *   node scripts/list-draft-articles.mjs --all --verbose
 *
 * SESSION/LOGIN:
 * Uses scripts/lib/spip-session.mjs (TO_FIX #68) instead of a local
 * login() copy. The old local copy here was the least defensive of the
 * three that existed pre-refactor — it only checked for a generic
 * `form[method="post"]` to detect SSO and never re-navigated if login
 * landed somewhere unexpected, unlike create-article.mjs's version.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, loadEnv, getPassword, login } from './lib/spip-session.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

// SPIP status names (Spanish)
const STATUS_NAMES = {
  prepa: 'En curso de redacción',
  prop: 'Propuesto a la evaluación',
  publie: 'Publicado',
  refuse: 'Rechazado',
  poubelle: 'A la papelera',
};

const STATUS_DISPLAY = {
  prepa: '📝 Draft',
  prop: '🔍 Review',
  publie: '✅ Published',
  refuse: '❌ Refused',
  poubelle: '🗑️  Trash',
};

// SPIP section IDs (common sections)
const SECTIONS = {
  1: 'Root (Kilombo)',
  2: 'Proletarios Internacionalistas',
  3: 'GCI/ICG',
  4: 'Plandemismo',
  5: 'Nuevo Orden Plandemismo',
  6: 'Fundamentos Científicos',
  7: 'Imágenes',
  8: 'Tierra y Libertad (MAIN)',
};

function parseArgs(argv) {
  const args = {
    all: false,
    section: null,
    status: ['prepa'], // default: show only drafts
    verbose: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all') args.all = true;
    else if (arg === '--section') args.section = argv[++i];
    else if (arg === '--status') args.status = argv[++i].split(',');
    else if (arg === '--verbose') args.verbose = true;
  }

  return args;
}

async function extractArticles(page, statuses) {
  console.log(`📊 Extracting articles with status: ${statuses.join(', ')}...\n`);

  const articles = await page.evaluate((statusCodes) => {
    const results = [];

    // Get all article rows from the admin table
    const rows = document.querySelectorAll('table tbody tr, [role="row"]');

    rows.forEach((row) => {
      const text = row.innerText || row.textContent;
      const cells = row.querySelectorAll('td, [role="gridcell"]');

      if (cells.length === 0) return;

      // Try to extract article data from cells
      let title = '';
      let status = '';
      let date = '';
      let section = '';
      let author = '';
      let id = '';

      // Common patterns: title, status, date, section, author
      cells.forEach((cell, idx) => {
        const cellText = cell.textContent.trim();

        // Status indicators
        if (cellText.includes('En curso') || cellText.includes('prepa')) {
          status = 'prepa';
        } else if (cellText.includes('Propuesto') || cellText.includes('prop')) {
          status = 'prop';
        } else if (cellText.includes('Publicado') || cellText.includes('publie')) {
          status = 'publie';
        } else if (cellText.includes('Rechazado') || cellText.includes('refuse')) {
          status = 'refuse';
        } else if (cellText.includes('papelera') || cellText.includes('poubelle')) {
          status = 'poubelle';
        }

        // Title (usually first meaningful cell with length > 20)
        if (!title && cellText.length > 20 && cellText.length < 150 && !cellText.includes('/')) {
          title = cellText;
        }

        // Date pattern (YYYY-MM-DD or similar)
        if (!date && cellText.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/)) {
          date = cellText;
        }

        // ID (numbers in parentheses or hash)
        if (!id && cellText.match(/^#?\d+$/)) {
          id = cellText.replace('#', '');
        }
      });

      // Only include if we found a status and title
      if (status && statusCodes.includes(status) && title) {
        results.push({
          title: title.substring(0, 100),
          status,
          date: date || 'N/A',
          id: id || '?',
          fullText: text.substring(0, 200),
        });
      }
    });

    return results;
  }, statuses);

  return articles;
}

async function main() {
  const env = loadEnv(ENV_PATH);
  const password = getPassword(env);

  if (!password) {
    console.error('❌ KILOMBOTOP_PASSWORD not found in .env');
    process.exit(1);
  }

  const args = parseArgs(process.argv);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('\n' + '═'.repeat(80));
    console.log('📋 SPIP Draft Articles Viewer');
    console.log('═'.repeat(80) + '\n');

    await login(page, {
      password,
      targetUrl: `${BASE_URL}/ecrire/?exec=articles`,
      expectedUrlIncludes: 'exec=articles',
    });

    // Extract articles
    const articles = await extractArticles(page, args.status);

    if (articles.length === 0) {
      console.log('ℹ️  No articles found matching the criteria.');
      console.log(`   Searched for status: ${args.status.join(', ')}\n`);
    } else {
      console.log(`✅ Found ${articles.length} article(s):\n`);
      console.log('ID'.padEnd(6), 'STATUS'.padEnd(12), 'TITLE'.padEnd(60), 'DATE');
      console.log('─'.repeat(100));

      articles.forEach((article) => {
        const statusIcon = STATUS_DISPLAY[article.status] || article.status;
        console.log(
          article.id.padEnd(6),
          statusIcon.padEnd(12),
          article.title.substring(0, 60).padEnd(60),
          article.date
        );
      });

      if (args.verbose) {
        console.log('\n' + '─'.repeat(100));
        console.log('📌 Detailed View:\n');
        articles.forEach((article) => {
          console.log(`[${article.id}] ${article.title}`);
          console.log(`    Status: ${STATUS_NAMES[article.status]} (${article.status})`);
          console.log(`    Date: ${article.date}`);
          console.log(`    URL: ${BASE_URL}/ecrire/?exec=article_edit&id_article=${article.id}\n`);
        });
      }
    }

    console.log('\n' + '─'.repeat(100));
    console.log('💡 Next steps:');
    if (articles.some((a) => a.status === 'prepa')) {
      console.log('   • Review draft articles above');
      console.log(
        '   • To publish: node scripts/manage-article-status.mjs --change --id <ID> --status publie'
      );
      console.log(
        '   • To move to trash: node scripts/manage-article-status.mjs --change --id <ID> --status poubelle'
      );
    }
    console.log(
      '   • To inspect article details: node scripts/manage-article-status.mjs --inspect --id <ID>\n'
    );

    console.log('═'.repeat(80) + '\n');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
