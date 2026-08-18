#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scrapedDir = path.join(__dirname, '../scraped-full');

// Already imported articles from articles.json
const importedIds = new Set([
  '2', '12', '20', '24', '25', '26', '27', '33', '34', '36', '37', '40', '41', '43', '44', '46', '48', '49', '50', '51', '52', '53', '54', '76', '79', '80', '81', '82', '84', '85', '86'
]);

const files = fs.readdirSync(scrapedDir)
  .filter(f => f.endsWith('.html'))
  .sort();

const results = [];

for (const file of files) {
  const filePath = path.join(scrapedDir, file);
  const html = fs.readFileSync(filePath, 'utf-8');
  
  // Extract article ID from spip.php?article=XXX
  const articleMatch = html.match(/spip\.php\?article(\d+)/);
  if (!articleMatch) continue;
  
  const articleId = articleMatch[1];
  
  // Skip if already imported
  if (importedIds.has(articleId)) continue;
  
  // Extract title from id="titre-article"
  let title = '';
  const titleMatch = html.match(/id="titre-article"[^>]*>([^<]*)</);
  if (titleMatch) {
    title = titleMatch[1].trim().replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }
  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([^<]*)</);
    if (h1Match) title = h1Match[1].trim();
  }
  
  // Extract content - try multiple selectors
  let bodyText = '';
  
  // Try id="texte-article" (SPIP Tierra format)
  let contentMatch = html.match(/id="texte-article"[^>]*>([\s\S]*?)<\/div>/);
  if (!contentMatch) {
    // Try class-based selector for PI articles
    contentMatch = html.match(/class="texte[^"]*surlignable[^"]*clearfix[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  }
  if (!contentMatch) {
    // Try id="descriptif-article"
    contentMatch = html.match(/id="descriptif-article"[^>]*>([\s\S]*?)<\/div>/);
  }
  if (!contentMatch) {
    // Try generic article divs
    contentMatch = html.match(/id="[^"]*article[^"]*"[^>]*>([\s\S]{0,10000}?)<\/div>/);
  }
  
  if (contentMatch) {
    bodyText = contentMatch[1]
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }
  
  const textLength = bodyText.length;
  
  // Count images in the whole document
  const imgMatches = html.match(/<img[^>]*>/g) || [];
  const imgCount = imgMatches.length;
  
  // Determine readiness
  let readiness = 'skip';
  if (textLength > 500) {
    readiness = 'ready';
  } else if (textLength >= 50 && textLength <= 500) {
    readiness = 'stub';
  } else if (textLength < 50 && imgCount > 3) {
    readiness = 'image-only';
  } else if (textLength < 50 && textLength > 0) {
    readiness = 'stub';
  }
  
  // Infer section from title keywords
  const titleLower = title.toLowerCase();
  let section = 'general';
  
  const nomKeywords = ['plandemismo', 'vacunas', 'covid', 'plandemia', 'control', 'oms', 'grafeno', 'terror', 'represión', 'represion', 'plandémica'];
  const piKeywords = ['proletarios', 'internacionalistas', 'capitalismo', 'clase', 'imperialismo', 'genocidio', 'falsos', 'guerra'];
  const tierraKeywords = ['tierra', 'libertad', 'quilombo', 'película', 'film', 'cine', 'terrain', 'terrain', 'documental'];
  
  if (nomKeywords.some(k => titleLower.includes(k))) {
    section = 'nom';
  } else if (piKeywords.some(k => titleLower.includes(k))) {
    section = 'pi';
  } else if (tierraKeywords.some(k => titleLower.includes(k))) {
    section = 'tierra';
  }
  
  results.push({
    articleId,
    title,
    textLength,
    imgCount,
    readiness,
    section,
    file,
    bodyPreview: bodyText.substring(0, 120)
  });
}

// Sort by article ID (numeric)
results.sort((a, b) => parseInt(a.articleId) - parseInt(b.articleId));

// Output as markdown table
console.log('| ID | Title | Text (chars) | Images | Status | Section | Preview |');
console.log('|---|---|---|---|---|---|---|');

for (const r of results) {
  const title = r.title.replace(/\|/g, '\\|').substring(0, 55);
  const preview = r.bodyPreview.replace(/\|/g, '\\|').substring(0, 50);
  console.log(`| ${r.articleId} | ${title}${title.length > 55 ? '…' : ''} | ${r.textLength} | ${r.imgCount} | ${r.readiness} | ${r.section} | ${preview}${preview.length > 50 ? '…' : ''} |`);
}

// Summary stats
const readyCount = results.filter(r => r.readiness === 'ready').length;
const stubCount = results.filter(r => r.readiness === 'stub').length;
const imageOnlyCount = results.filter(r => r.readiness === 'image-only').length;
const skipCount = results.filter(r => r.readiness === 'skip').length;

console.log('\n## Summary\n');
console.log(`- **Total missing**: ${results.length}`);
console.log(`- **Ready**: ${readyCount}`);
console.log(`- **Stub**: ${stubCount}`);
console.log(`- **Image-only**: ${imageOnlyCount}`);
console.log(`- **Skip**: ${skipCount}`);
console.log(`\n**Section breakdown:**`);
const bySection = {};
results.forEach(r => {
  bySection[r.section] = (bySection[r.section] || 0) + 1;
});
Object.entries(bySection).sort().forEach(([section, count]) => {
  console.log(`- **${section}**: ${count}`);
});

console.log('\n---\n## Detailed Results\n');
console.log(JSON.stringify(results.map(r => ({
  id: r.articleId,
  title: r.title,
  chars: r.textLength,
  imgs: r.imgCount,
  status: r.readiness,
  section: r.section
})), null, 2));
