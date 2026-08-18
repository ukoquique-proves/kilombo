#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scrapedDir = path.join(__dirname, '../scraped-full');

// Ready articles to extract
const readyIds = ['21', '23', '32', '38', '39', '42', '47', '78'];

const results = [];

for (const file of fs.readdirSync(scrapedDir).filter(f => f.endsWith('.html')).sort()) {
  const filePath = path.join(scrapedDir, file);
  const html = fs.readFileSync(filePath, 'utf-8');
  
  // Extract article ID
  const articleMatch = html.match(/spip\.php\?article(\d+)/);
  if (!articleMatch) continue;
  
  const articleId = articleMatch[1];
  if (!readyIds.includes(articleId)) continue;
  
  // Extract title
  let title = '';
  const titleMatch = html.match(/id="titre-article"[^>]*>([^<]*)</);
  if (titleMatch) {
    title = titleMatch[1].trim().replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }
  
  // Extract content
  let contentHtml = '';
  let contentMatch = html.match(/id="texte-article"[^>]*>([\s\S]*?)<\/div>/);
  if (!contentMatch) {
    contentMatch = html.match(/class="texte[^"]*surlignable[^"]*clearfix[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  }
  if (!contentMatch) {
    contentMatch = html.match(/id="descriptif-article"[^>]*>([\s\S]*?)<\/div>/);
  }
  if (contentMatch) {
    contentHtml = contentMatch[1];
  }
  
  // Extract plain text
  const bodyText = contentHtml
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Count images
  const imgMatches = html.match(/<img[^>]*>/g) || [];
  const imgCount = imgMatches.length;
  
  // Infer section
  const titleLower = title.toLowerCase();
  let section = 'general';
  const nomKeywords = ['plandemismo', 'vacunas', 'covid', 'plandemia'];
  if (nomKeywords.some(k => titleLower.includes(k))) {
    section = 'nom';
  }
  
  results.push({
    id: articleId,
    title,
    textLength: bodyText.length,
    imgCount,
    section,
    bodyPreview: bodyText.substring(0, 200)
  });
}

// Sort by ID
results.sort((a, b) => parseInt(a.id) - parseInt(b.id));

console.log('| ID | Title | Text Length | Images | Section | One-line Summary |');
console.log('|---|---|---|---|---|---|');

for (const r of results) {
  const titleDisplay = r.title.replace(/\|/g, '\\|').substring(0, 60);
  const summary = r.bodyPreview.replace(/\|/g, '\\|').substring(0, 80);
  console.log(`| ${r.id} | ${titleDisplay}${r.title.length > 60 ? '…' : ''} | ${r.textLength} | ${r.imgCount} | ${r.section} | ${summary}… |`);
}

// Export detailed JSON for import script
const jsonPath = path.join(__dirname, '../ready-articles.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
console.log(`\n## Exported to ready-articles.json\n`);
