import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) vars[match[1]] = match[2];
  });
  return vars;
}

async function probeEscalSubpages() {
  const env = loadEnv();
  const password = env.KILOMBOTOP_PASSWORD || env.KILOMBOTOP_FUTURE_PASSWORD;

  if (!password) {
    console.error('❌ NO CREDENTIALS FOUND');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    console.log('Navigating and logging in...');
    await page.goto('https://www.kilombo.top/ecrire/?exec=configurer_escal', { waitUntil: 'domcontentloaded' });

    let currentUrl = page.url();
    if (currentUrl.includes('page=login') || currentUrl.includes('exec=login')) {
      await page.fill('input[type="text"]', 'kilombo');
      await page.fill('input[type="password"]', password);
      await page.click('input[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    console.log(`Current URL: ${page.url()}`);
    
    // Get all links in the left sidebar of the Escal config page
    const subLinks = await page.evaluate(() => {
      // It looks like a standard SPIP secondary navigation sidebar
      // Usually .lat or #navigation or simply the left column
      const links = Array.from(document.querySelectorAll('.lat a, .navigation a, #navigation a, .gauche a, #bando_navigation a'));
      // Filter out main menu links, only keep those containing configurer_escal or similar subpages
      return links
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(l => l.href.includes('configurer_escal') || l.href.includes('escal_'));
    });

    console.log(`\nFound ${subLinks.length} sub-menu links.`);
    
    // Visit a few promising ones to look for our fields
    const targets = ['Pie de página', 'Página de inicio', 'Configuración de bloques', 'Elección de los bloques'];
    
    for (const targetText of targets) {
      const link = subLinks.find(l => l.text.toLowerCase().includes(targetText.toLowerCase()));
      if (link) {
        console.log(`\n--- Navigating to: ${link.text} ---`);
        await page.goto(link.href, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        
        const formFields = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'));
          return inputs.map(input => {
            let labelText = '';
            if (input.id) {
              const label = document.querySelector(`label[for="${input.id}"]`);
              if (label) labelText = label.innerText.trim();
            }
            if (!labelText && input.closest('label')) {
              labelText = input.closest('label').innerText.trim();
            }
            if (!labelText) {
              const parent = input.parentElement;
              if (parent) labelText = (parent.innerText || '').substring(0, 50).trim();
            }
            return {
              name: input.name,
              value: input.value,
              label: labelText
            };
          }).filter(f => f.name);
        });
        
        console.log(`Found ${formFields.length} fields on this page.`);
        // Find fields matching our target labels
        const relevantFields = formFields.filter(f => 
          f.value.toLowerCase().includes('últimos') ||
          f.value.toLowerCase().includes('mapa del sitio') ||
          f.label.toLowerCase().includes('últimos') ||
          f.label.toLowerCase().includes('mapa del sitio')
        );
        
        if (relevantFields.length > 0) {
          console.log(`\n🎯 FOUND RELEVANT FIELDS on "${link.text}":`);
          relevantFields.forEach(f => {
            console.log(`   Name: ${f.name}`);
            console.log(`   Label: ${f.label}`);
            console.log(`   Value: ${f.value}`);
          });
        }
      }
    }

  } catch (e) {
    console.error('Error during probe:', e);
  } finally {
    await browser.close();
  }
}

probeEscalSubpages();
