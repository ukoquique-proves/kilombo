#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scrapedDir = path.join(__dirname, '../scraped-full');

// Already imported articles from articles.json
const importedIds = [
  'represion-plandemica-1',
  'represion-plandemica-2',
  'represion-plandemica-3',
  'represion-plandemica-4',
  '1-mayo-2023-contra-militarizacion',
  'plandemismo-y-domesticacion',
  'plandemismo-y-domesticacion-11',
  'el-fraude-de-los-pcr',
  'la-pandemie-n-existe-pas',
  'la-pandemie-n-8217-existe-pas',
  'le-covidisme-nbsp-une-nouvelle-religion',
  'contre-genocide-guerres-infinites-pi',
  'contre-l-esclavage-et-la-fausse-critique-du-capitalisme-en-general-i',
  'contre-l-esclavage-et-la-fausse-critique-du-capitalisme-en-general-ii',
  'contre-l-8217-esclavage-et-la-fausse-critique-du-capitalisme-en-general-iii',
  'falsos-internacionalistas-1',
  'falsos-internacionalistas-2',
  'falsos-internacionalistas-3',
  'falsos-internacionalistas-4',
  'falsos-internacionalistas-5',
  'falsos-internacionalistas-6',
  'quilombo-pelicula',
  'kilombo-quilombo-pelicula',
  'terrain-the-film',
  'el-negacionista-cortometraje',
  'futuras-generaciones',
  'gouverner-par-le-chaos',
  '1er-mai-2023-tierra-fr',
  'curso-salud-holistica',
  'imagenes',
  'transformacion-registros-akashicos',
  'israel-mohamad-safa-siempre-victimas',
  'contra-genocidio-guerras-infinitas-pi'
];

const files = fs.readdirSync(scrapedDir)
  .filter(f => f.endsWith('.html'))
  .sort();

const results = [];

for (const file of files) {
  const filePath = path.join(scrapedDir, file);
  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  // Extract article ID from spip.php?article=XXX
  const articleMatch = html.match(/spip\.php\?article(\d+)/);
  if (!articleMatch) continue;
  
  const articleId = articleMatch[1];
  
  // Extract title from id="titre-article"
  const titleEl = doc.getElementById('titre-article');
  const title = titleEl ? titleEl.textContent.trim() : '(no title)';
  
  // Extract content from id="texte-article" (SPIP format for Tierra)
  let contentEl = doc.getElementById('texte-article');
  
  // Fallback: check for class-based selectors for PI articles
  if (!contentEl) {
    const div = doc.querySelector('.texte.surlignable.clearfix');
    if (div) contentEl = div;
  }
  
  // Fallback: id="descriptif-article"
  if (!contentEl) {
    contentEl = doc.getElementById('descriptif-article');
  }
  
  // If still no content, try generic article container
  if (!contentEl) {
    const divs = doc.querySelectorAll('div[id*="article"], div[class*="article"]');
    for (const d of divs) {
      const text = d.textContent.trim();
      if (text.length > 50) {
        contentEl = d;
        break;
      }
    }
  }
  
  // Extract plaintext length
  let bodyText = '';
  if (contentEl) {
    bodyText = contentEl.textContent
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const textLength = bodyText.length;
  
  // Count images
  const imgCount = (contentEl ? contentEl.querySelectorAll('img').length : 0) +
                   (doc.querySelectorAll('img[src*="local"]').length || 0);
  
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
  
  const nomKeywords = ['plandemismo', 'vacunas', 'covid', 'plandemia', 'control', 'oms', 'grafeno', 'terror', 'represión', 'represion', 'plandémica', 'plandémica'];
  const piKeywords = ['proletarios', 'internacionalistas', 'capitalismo', 'clase', 'imperialismo', 'genocidio', 'falsos internacionalistas', 'guerra'];
  const tierraKeywords = ['tierra', 'libertad', 'quilombo', 'película', 'film', 'cine', 'película', 'terrain', 'land'];
  
  if (nomKeywords.some(k => titleLower.includes(k))) {
    section = 'nom';
  } else if (piKeywords.some(k => titleLower.includes(k))) {
    section = 'pi';
  } else if (tierraKeywords.some(k => titleLower.includes(k))) {
    section = 'tierra';
  }
  
  const isImported = importedIds.includes(articleId);
  
  // Only collect missing articles
  if (!isImported) {
    results.push({
      articleId,
      title,
      textLength,
      imgCount,
      readiness,
      section,
      file,
      bodyPreview: bodyText.substring(0, 150)
    });
  }
}

// Sort by article ID (numeric)
results.sort((a, b) => parseInt(a.articleId) - parseInt(b.articleId));

// Output as markdown table
console.log('| ID | Title | Text (chars) | Images | Status | Section | Preview |');
console.log('|---|---|---|---|---|---|---|');

for (const r of results) {
  const title = r.title.replace(/\|/g, '\\|').substring(0, 60);
  const preview = r.bodyPreview.replace(/\|/g, '\\|').substring(0, 40);
  console.log(`| ${r.articleId} | ${title}... | ${r.textLength} | ${r.imgCount} | ${r.readiness} | ${r.section} | ${preview}... |`);
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
Object.entries(bySection).forEach(([section, count]) => {
  console.log(`- **${section}**: ${count}`);
});
