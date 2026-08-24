/**
 * scripts/lib/spip-client.mjs
 * ═══════════════════════════════════════════════════════════════════════
 * Abstraction layer over sandbox/create-article.mjs and sandbox/delete-article.mjs
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
const SANDBOX_DIR = path.join(__dirname, '..', '..', 'sandbox');

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

    const args = [
      path.join(SANDBOX_DIR, 'create-article.mjs'),
      '--create',
      '--title', title,
      '--body', body,
      '--section', section,
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
   * Change article status in SPIP via delete-article.mjs
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
      path.join(SANDBOX_DIR, 'delete-article.mjs'),
      '--change',
      '--id', String(articleId),
      '--status', status,
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
    const idMatch = output.match(/Article ID (\d+) created/i) ||
                    output.match(/id_article=(\d+)/);
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
   * Parse output from delete-article.mjs (status change)
   * @private
   */
  parseStatusChangeOutput(output, articleId, status) {
    // Look for "Final status after change:" or "Publicado"
    if (output.includes('Final status after change') ||
        output.includes('Publicado') ||
        output.includes('publie')) {
      return {
        success: true,
        articleId,
        status,
        message: `Article ${articleId} status changed to ${status}`,
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
