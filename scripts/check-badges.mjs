import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Window } from 'happy-dom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '../site/index.html');

const html = fs.readFileSync(indexPath, 'utf-8');
const window = new Window();
window.document.write(html);

const cards = window.document.querySelectorAll('.card');
let hasError = false;

cards.forEach((card, i) => {
  const isExternal = card.querySelector('.card-status--external');
  const isMirrored = card.querySelector('.card-status--mirrored');

  if (!isExternal && !isMirrored) {
    const title = card.querySelector('.card-title')?.textContent.trim() || 'Unknown card';
    console.error(`❌ Error: Card "${title}" (index ${i}) missing Level 1 / Level 2 badge.`);
    console.error(
      `   It must include either <span class="card-status card-status--external">↗ Externo</span> or <span class="card-status card-status--mirrored">⬡ Espejo</span>`
    );
    hasError = true;
  }
});

if (hasError) {
  process.exit(1);
} else {
  console.log(`✅ All ${cards.length} cards in index.html have a Level 1 / Level 2 badge.`);
}
