/**
 * scripts/lib/spip-client.mjs
 * ═══════════════════════════════════════════════════════════════════════
 * Abstraction layer over sandbox/create-article.mjs and scripts/manage-article-status.mjs
 *
 * RESPONSIBILITIES:
 *   - Encapsulate Playwright-based SPIP interactions
 *   - Provide clean async/await interface
 *   - Handle errors and retries
 *   - Decouple migration logic from browser automation details
 *
 * ARCHITECTURE:
 *   - Does NOT create/modify files directly
 *   - Uses child_process to invoke sandbox scripts
 *   - Parses script output to extract results
 *   - Returns structured data (not raw stdout)
 *
 * USAGE:
 *   import { SPIPClient } from './spip-client.mjs';
 *   const client = new SPIPClient({ envPath: './.env' });
 *   const result = await client.createArticle({
 *     title: 'Article Title',
 *     body: '<p>Article content</p>',
 *     section: '1'
 *   });
 *   // → { success: true, articleId: 90, url: 'https://...' }
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.join(__dirname, '..');
const SANDBOX_DIR = path.join(__dirname, '..', '..', 'sandbox');

// ─────────────────────────────────────────────────────────────────────────────
// Slug → SPIP rubrique ID lookup table
//
// IMPORTANT: these IDs must be verified against the live SPIP instance at
// kilombo.top BEFORE this table is used in production. Run:
//
//   node sandbox/create-article.mjs --inspect
//
// and read the <select name="id_parent"> option values from the output.
// Update the values below with the real IDs, then remove the TODO comment.
//
// The only confirmed data point so far is rubrique6 = a sub-section of tierra
// (MIRROR_GROWING.md), NOT the top-level tierra rubrique. Top-level IDs unknown.
//
// Until verified, slugToRubriquId() throws for any slug — forcing callers to
// pass an explicit numeric ID rather than silently using a wrong one.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
const SLUG_TO_RUBRIQUE_ID = {
  // Verified against live SPIP on kilombo.top via sandbox/probe-rubriques.mjs
  // Full rubrique tree:
  //   0  (none / root)
  //   20 Home
  //     21 Actualités       ← actualidad
  //     22 News
  //   3  icg                ← gci
  //   10 INTERNATIONAL
  //   1  kilombo            ← general, tierra (no dedicated rubrique for tierra)
  //   9  NOUVEL ORDRE/PLANDÉMISME (FR)
  //     7  IMAGENES
  //   19 NUEVO ORDEN/PLANDEMISMO Y DOMESTICACIÓN (ES) ← nom
  //     6  FUNDAMENTOS CIENTÍFICOS
  //     25 LINKS ÚTILES
  //     4  Plandemia
  //       24 MATERIALES PARA LA ACCIÓN DIRECTA
  //   2  Proletarios internationalistas ← pi
  //   8  Rúbrica oculta
  general:    '1',   // kilombo root — catch-all for uncategorised content
  tierra:     '1',   // no dedicated rubrique; tierra content lives at root (kilombo)
  gci:        '3',   // icg
  pi:         '2',   // Proletarios internationalistas
  nom:        '19',  // NUEVO ORDEN/PLANDEMISMO Y DOMESTICACIÓN (ES)
  actualidad: '21',  // Actualités (the news/current-affairs section)
};

/**
 * Translate a category slug (used in articles.json) to a SPIP numeric rubrique ID.
 * Passes numeric strings through unchanged.
 *
 * Rubrique map verified against live SPIP on kilombo.top (sandbox/probe-rubriques.mjs).
 * To re-verify: node sandbox/probe-rubriques.mjs
 *
 * @param {string} section - slug (e.g. 'tierra') or numeric ID (e.g. '6')
 * @returns {string} numeric rubrique ID
 * @throws if the slug is not in the verified map
 */
export function slugToRubriquId(section) {
  if (/^\d+$/.test(section)) return section; // already numeric, pass through
  const id = SLUG_TO_RUBRIQUE_ID[section];
  if (!id) {
    throw new Error(
      `Unknown section slug: "${section}". ` +
      `Run \`node sandbox/create-article.mjs --inspect\` to discover the live ` +
      `SPIP rubrique IDs, then update SLUG_TO_RUBRIQUE_ID in scripts/lib/spip-client.mjs.`
    );
  }
  return id;
}

export class SPIPClient {
  constructor(options = {}) {
    this.envPath = options.envPath || path.join(__dirname, '..', '..', '.env');
    this.timeout = options.timeout || 120000; // 2 minutes default
    this.cwd = options.cwd || path.join(__dirname, '..', '..');
  }

  /**
   * Create article in SPIP via create-article.mjs
   * @param {Object} params
   *   - title {string} Article title
   *   - body {string} Article body (HTML)
   *   - section {string} SPIP rubrique ID (defaults to '1')
   *   - dryRun {boolean} If true, preview without creating (default: false)
   * @returns {Object} { success, articleId?, error?, dryRun }
   */
  async createArticle(params) {
    const { title, body, section = '1', dryRun = false } = params;

    if (!title || !body) {
      throw new Error('createArticle requires title and body');
    }

    // Translate slug → numeric rubrique ID at the boundary.
    // This is the single place where the translation happens; the Playwright
    // script (sandbox/create-article.mjs) only accepts numeric IDs.
    const rubriquId = slugToRubriquId(section);

    const args = [
      path.join(SANDBOX_DIR, 'create-article.mjs'),
      '--create',
      '--title',
      title,
      '--body',
      body,
      '--section',
      rubriquId,
    ];

    if (dryRun) {
      args.push('--dry-run');
    }

    try {
      const output = await this.runScript('node', args);
      return this.parseCreateArticleOutput(output, dryRun);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        dryRun,
      };
    }
  }

  /**
   * Change article status in SPIP via manage-article-status.mjs
   * @param {Object} params
   *   - articleId {string|number} SPIP article ID
   *   - status {string} Target status (e.g., 'publie')
   * @returns {Object} { success, articleId, status?, error? }
   */
  async changeArticleStatus(params) {
    const { articleId, status } = params;

    if (!articleId || !status) {
      throw new Error('changeArticleStatus requires articleId and status');
    }

    const args = [
      path.join(SCRIPTS_DIR, 'manage-article-status.mjs'),
      '--change',
      '--id',
      String(articleId),
      '--status',
      status,
    ];

    try {
      const output = await this.runScript('node', args);
      return this.parseStatusChangeOutput(output, articleId, status);
    } catch (error) {
      return {
        success: false,
        articleId,
        error: error.message,
      };
    }
  }

  /**
   * Run a Node.js script and return stdout
   * @private
   */
  runScript(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.timeout,
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to run ${command}: ${error.message}`));
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Script exited with code ${code}: ${stderr || stdout}`));
        }
      });

      // Handle timeout
      setTimeout(() => {
        process.kill();
        reject(new Error(`Script timeout after ${this.timeout}ms`));
      }, this.timeout);
    });
  }

  /**
   * Parse output from create-article.mjs
   * @private
   */
  parseCreateArticleOutput(output, dryRun) {
    if (dryRun) {
      // Dry-run outputs: "--dry-run completed successfully!"
      if (output.includes('--dry-run completed successfully')) {
        return {
          success: true,
          dryRun: true,
          message: 'Dry-run preview completed',
        };
      }
    }

    // Look for "Article ID X created" pattern
    const idMatch = output.match(/Article ID (\d+) created/i) || output.match(/id_article=(\d+)/);
    if (idMatch) {
      const articleId = parseInt(idMatch[1], 10);
      return {
        success: true,
        articleId,
        dryRun: false,
        url: `https://www.kilombo.top/ecrire/?exec=article&id_article=${articleId}`,
      };
    }

    // Check for "CONFIRMED: Article appears in SPIP article list"
    if (output.includes('CONFIRMED') || output.includes('appears in SPIP')) {
      const idMatch = output.match(/id[_=](\d+)/);
      if (idMatch) {
        const articleId = parseInt(idMatch[1], 10);
        return {
          success: true,
          articleId,
          dryRun: false,
          url: `https://www.kilombo.top/ecrire/?exec=article&id_article=${articleId}`,
        };
      }
    }

    return {
      success: false,
      error: 'Could not determine article ID from script output',
      output,
    };
  }

  /**
   * Parse output from manage-article-status.mjs (status change)
   * @private
   */
  parseStatusChangeOutput(output, articleId, status) {
    // STATUS_CHANGE_CONFIRMED is emitted only when the SPIP confirmation
    // dialog was actually accepted — i.e. the change genuinely went through.
    // 'Final status after change' prints unconditionally (DOM read), so it
    // cannot be used as a success signal on its own.
    if (output.includes('STATUS_CHANGE_CONFIRMED')) {
      return {
        success: true,
        articleId,
        status,
        message: `Article ${articleId} status changed to ${status}`,
      };
    }

    // Dialog was never accepted — the change was not saved.
    if (output.includes('STATUS_CHANGE_UNCONFIRMED')) {
      return {
        success: false,
        articleId,
        status,
        error: 'Status change not confirmed: SPIP confirmation dialog was never accepted. The article status was not changed.',
        output,
      };
    }

    return {
      success: false,
      articleId,
      error: 'Could not verify status change',
      output,
    };
  }
}

export default SPIPClient;
