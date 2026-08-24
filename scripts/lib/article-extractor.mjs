/**
 * scripts/lib/article-extractor.mjs
 * ═══════════════════════════════════════════════════════════════════════
 * Pure data layer: reads articles.json and extracts article metadata.
 * 
 * RESPONSIBILITIES:
 *   - Load articles.json from file
 *   - Find article by ID
 *   - Validate required fields
 *   - Return standardized article object
 * 
 * NO SIDE EFFECTS:
 *   - Does not create/modify files
 *   - Does not call external services
 *   - Does not perform I/O beyond reading articles.json
 * 
 * USAGE:
 *   import { ArticleExtractor } from './article-extractor.mjs';
 *   const extractor = new ArticleExtractor('./path/to/articles.json');
 *   const article = extractor.findById('article-slug');
 *   // → { id, title, section, contentHtml, ... }
 */

import fs from 'node:fs';
import path from 'node:path';

export class ArticleExtractor {
  constructor(articlesJsonPath) {
    if (!fs.existsSync(articlesJsonPath)) {
      throw new Error(`articles.json not found: ${articlesJsonPath}`);
    }
    this.articlesJsonPath = articlesJsonPath;
    this.articles = null;
  }

  /**
   * Load articles.json from disk (lazy-load, cached)
   */
  load() {
    if (this.articles === null) {
      const content = fs.readFileSync(this.articlesJsonPath, 'utf8');
      try {
        this.articles = JSON.parse(content);
      } catch (err) {
        throw new Error(`Failed to parse articles.json: ${err.message}`);
      }
    }
    return this.articles;
  }

  /**
   * Find article by ID
   * @param {string} articleId - The article slug/id
   * @returns {Object} Article object with validated fields
   * @throws {Error} If article not found or missing required fields
   */
  findById(articleId) {
    const articles = this.load();
    const article = articles.find(a => a.id === articleId);

    if (!article) {
      throw new Error(`Article not found: ${articleId}`);
    }

    this.validateArticle(article);
    return article;
  }

  /**
   * Find all articles with given status
   * @param {string} status - Article status (e.g., 'pending-review', 'imported')
   * @returns {Array} Array of article objects
   */
  findByStatus(status) {
    const articles = this.load();
    return articles.filter(a => a.status === status);
  }

  /**
   * Validate that article has all required fields for SPIP migration
   * @param {Object} article - Article object from JSON
   * @throws {Error} If validation fails
   */
  validateArticle(article) {
    const required = ['id', 'title', 'contentHtml', 'section'];
    const missing = required.filter(field => !article[field]);

    if (missing.length > 0) {
      throw new Error(
        `Article "${article.id}" missing required fields: ${missing.join(', ')}`
      );
    }

    // Validate section is a number (SPIP rubrique ID)
    if (typeof article.section !== 'string' && typeof article.section !== 'number') {
      throw new Error(
        `Article "${article.id}" section must be a string or number, got: ${typeof article.section}`
      );
    }

    // Validate contentHtml is not empty
    if (!article.contentHtml.trim()) {
      throw new Error(`Article "${article.id}" contentHtml is empty`);
    }
  }

  /**
   * Extract only the fields needed for SPIP migration
   * @param {Object} article - Full article object
   * @returns {Object} Migrationable article subset
   */
  extractMigrationData(article) {
    return {
      id: article.id,
      title: article.title,
      contentHtml: article.contentHtml,
      section: String(article.section), // Normalize to string
      status: article.status,
      date: article.date || new Date().toISOString().split('T')[0],
      sourceSite: article.sourceSite || 'Internal',
    };
  }

  /**
   * Get migration status report for an article
   * @param {string} articleId - The article ID
   * @returns {Object} Status info
   */
  getMigrationStatus(articleId) {
    const article = this.findById(articleId);
    return {
      articleId,
      title: article.title,
      currentStatus: article.status,
      hasMigrated: article.status === 'imported',
      section: article.section,
    };
  }
}

export default ArticleExtractor;
