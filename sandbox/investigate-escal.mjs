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

async function investigateEscalMenu() {
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
    console.log('Navigating to SPIP admin panel...');
    await page.goto('https://www.kilombo.top/ecrire/', { waitUntil: 'domcontentloaded' });

    let currentUrl = page.url();
    if (currentUrl.includes('page=login') || currentUrl.includes('exec=login')) {
      console.log('Logging in...');
      await page.fill('input[type="text"]', 'kilombo');
      await page.fill('input[type="password"]', password);
      await page.click('input[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    currentUrl = page.url();
    if (currentUrl.includes('page=login')) {
      console.error('Login failed.');
      await browser.close();
      return;
    }

    console.log('Successfully logged in. Investigating menus...');
    
    // Look for all top-level menus and their submenus
    const menus = await page.evaluate(() => {
      const results = [];
      // SPIP usually has menus in a specific structure, often #bando_navigation or similar
      // Let's get all links in the navigation area
      const navLinks = document.querySelectorAll('#bando_navigation a, .bando a, .menu a, .nav a, a.bando2');
      
      navLinks.forEach(link => {
        results.push({
          text: link.innerText.trim(),
          href: link.href,
          className: link.className
        });
      });
      return results;
    });
    
    console.log(`Found ${menus.length} navigation links.`);
    
    const escalLinks = menus.filter(m => 
      m.text.toLowerCase().includes('escal') || 
      m.href.toLowerCase().includes('escal') ||
      m.text.toLowerCase().includes('tema') ||
      m.text.toLowerCase().includes('theme') ||
      m.text.toLowerCase().includes('apariencia')
    );

    if (escalLinks.length > 0) {
      console.log('\n--- ESCAL / THEME MENUS FOUND ---');
      escalLinks.forEach(l => console.log(`- ${l.text}: ${l.href}`));
      
      // Let's try navigating to the first Escal-related link to see what's on that page
      const targetHref = escalLinks[0].href;
      console.log(`\nNavigating to: ${targetHref}`);
      await page.goto(targetHref, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Scrape the content of the Escal settings page
      const settingsPageContent = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        // Get form labels, headers, and tabs
        const headers = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText);
        const labels = Array.from(document.querySelectorAll('label, .label, th')).map(l => l.innerText);
        const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
        
        return {
          headers: headers.filter(h => h.trim() !== ''),
          labels: labels.slice(0, 30).filter(l => l.trim() !== ''), // Sample of labels
          hasTranslationOptions: bodyText.toLowerCase().includes('traduc') || bodyText.toLowerCase().includes('idioma') || bodyText.toLowerCase().includes('lang'),
          hasCustomizationOptions: bodyText.toLowerCase().includes('personali') || bodyText.toLowerCase().includes('configur'),
          pageLinks: links.filter(l => l.text.trim() !== '').slice(0, 20)
        };
      });
      
      console.log('\n--- ESCAL SETTINGS PAGE INFO ---');
      console.log('Headers:', settingsPageContent.headers);
      console.log('Sample Labels:', settingsPageContent.labels);
      console.log('Has Translation Options?', settingsPageContent.hasTranslationOptions);
      console.log('Has Customization Options?', settingsPageContent.hasCustomizationOptions);
      
    } else {
      console.log('\n❌ No Escal or Theme menus found in the navigation.');
      
      // Dump all menus just in case
      console.log('\nAll found menus:');
      const uniqueMenus = Array.from(new Set(menus.map(m => m.text))).filter(t => t);
      console.log(uniqueMenus.join(', '));
    }

  } catch (e) {
    console.error('Error during investigation:', e);
  } finally {
    await browser.close();
  }
}

investigateEscalMenu();
