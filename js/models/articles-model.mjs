/**
 * site/js/models/articles-model.mjs
 *
 * Article data model: loading, filtering, and relationship logic.
 * Decoupled from rendering and page initialization.
 * No DOM access — pure data transformation.
 */

import { parseJson } from '../decrypt.mjs';

/**
 * @typedef {Object} ArticleEntry
 * @property {string} id
 * @property {string} title
 * @property {string} [date]         // YYYY-MM-DD (opcional)
 * @property {string} section        // e.g. tierra|gci|pi|nom|general
 * @property {string[]} topics
 * @property {string} sourceSite
 * @property {string} sourceUrl
 * @property {string} status         // imported|adapted|translated|pending-review|external-only
 * @property {string} contentHtml
 * @property {string[]} [relatedArticles]  // optional, IDs of variant presentations of the same content
 * @property {Object} [metadata]
 * @property {Array} [externalLinks]
 * @property {string} [language]
 * @property {string} [author]
 */

const DATA_PATH = 'assets/content/articles.json';

/**
 * Load articles from JSON data file.
 * @returns {Promise<ArticleEntry[]>}
 */
export async function loadArticles() {
  const res = await fetch(DATA_PATH);
  if (!res.ok) throw new Error(`Failed to load ${DATA_PATH}: ${res.status}`);
  const data = await parseJson(await res.text());
  if (!Array.isArray(data)) throw new Error(`${DATA_PATH} must be an array`);
  return /** @type {ArticleEntry[]} */ (data);
}

/**
 * Get human-readable label for section code.
 * @param {string} section
 */
export function sectionLabel(section) {
  const labels = {
    tierra: 'Tierra y Libertad',
    gci: 'GCI',
    pi: 'Proletarios Internacionalistas',
    nom: 'NOM / Plandemismo',
    actualidad: 'Actualidad',
    general: 'Artículos',
  };
  return labels[section] || section || 'Artículos';
}

/**
 * Collect every distinct topic across a set of articles, sorted alphabetically.
 * @param {ArticleEntry[]} articles
 * @returns {string[]}
 */
export function getAllTopics(articles) {
  const set = new Set();
  for (const a of articles) {
    for (const t of a.topics || []) set.add(t);
  }
  return [...set].sort((x, y) => x.localeCompare(y, 'es'));
}

/**
 * Filter articles by topic.
 * @param {ArticleEntry[]} articles
 * @param {string|null} topic  null/'' means "no filter, show all"
 * @returns {ArticleEntry[]}
 */
export function filterArticlesByTopic(articles, topic) {
  if (!topic) return articles;
  return articles.filter((a) => (a.topics || []).includes(topic));
}

/**
 * Filter articles by section.
 * @param {ArticleEntry[]} articles
 * @param {string|null} section  null/'' means "no filter, show all"
 * @returns {ArticleEntry[]}
 */
export function filterArticlesBySection(articles, section) {
  if (!section) return articles;
  return articles.filter((a) => a.section === section);
}

/**
 * Filter articles by search query (case-insensitive substring match on title + topics).
 * @param {ArticleEntry[]} articles
 * @param {string} query
 * @returns {ArticleEntry[]}
 */
export function filterArticlesByQuery(articles, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return articles;
  return articles.filter((a) => {
    const haystack = [a.title, ...(a.topics || [])].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Find related articles for a given article.
 *
 * Ranks other articles by shared topics, with explicit `relatedArticles` IDs prioritized.
 * Ties broken by most recent date first.
 *
 * @param {ArticleEntry} current
 * @param {ArticleEntry[]} all
 * @param {number} [limit]
 * @returns {ArticleEntry[]}
 */
export function findRelatedArticles(current, all, limit = 3) {
  const byId = new Map(all.map((a) => [a.id, a]));

  // Explicit cross-links (editorial decision, exempt from "must share topic" rule)
  /** @type {ArticleEntry[]} */
  const explicit = (current.relatedArticles || [])
    .map((id) => byId.get(id))
    .filter((a) => a && a.id !== current.id);

  const currentTopics = new Set(current.topics || []);
  const explicitIds = new Set(explicit.map((a) => a.id));

  // Topic-based scoring
  const scored =
    currentTopics.size === 0
      ? []
      : all
          .filter((a) => a.id !== current.id && !explicitIds.has(a.id))
          .map((a) => {
            const shared = (a.topics || []).filter((t) => currentTopics.has(t)).length;
            return { article: a, shared };
          })
          .filter((x) => x.shared > 0)
          .sort((x, y) => {
            if (y.shared !== x.shared) return y.shared - x.shared;
            // Most recent first; articles without a date sort last
            return (y.article.date || '').localeCompare(x.article.date || '');
          })
          .map((x) => x.article);

  return [...explicit, ...scored].slice(0, limit);
}
