#!/usr/bin/env node
/**
 * List all articles currently visible in Tierra y Libertad section
 * Scrapes the public-facing page (no login required)
 */

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TIERRA_URL = 'https://www.kilombo.top/';

async function listTierraArticles() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('📖 Loading Tierra y Libertad section from www.kilombo.top...\n');
    
    await page.goto(TIERRA_URL, { waitUntil: 'networkidle' });

    console.log('✅ Page loaded\n');

    // Extract article information
    const articles = await page.evaluate(() => {
      const results = [];
      
      // Get all article cards
      const cards = document.querySelectorAll('[role="article"], .article, .card, .bloc');
      
      cards.forEach(card => {
        const titleEl = card.querySelector('h2, h3, h4, .title, [class*="title"]');
        const dateEl = card.querySelector('.date, [class*="date"], time');
        const authorEl = card.querySelector('.author, [class*="author"]');
        const statusEl = card.querySelector('.status, [class*="status"], .badge');
        const sectionEl = card.querySelector('.section, [class*="section"]');
        
        if (titleEl) {
          results.push({
            title: titleEl.textContent.trim(),
            date: dateEl ? dateEl.textContent.trim() : 'N/A',
            author: authorEl ? authorEl.textContent.trim() : 'N/A',
            status: statusEl ? statusEl.textContent.trim() : 'published',
            section: sectionEl ? sectionEl.textContent.trim() : 'Tierra y Libertad',
          });
        }
      });

      return results;
    });

    if (articles.length > 0) {
      console.log(`✅ Found ${articles.length} article(s) on the page:\n`);
      console.log('TITLE'.padEnd(50), 'DATE'.padEnd(15), 'AUTHOR');
      console.log('─'.repeat(100));
      
      articles.forEach(article => {
        console.log(
          article.title.substring(0, 50).padEnd(50),
          article.date.substring(0, 14).padEnd(15),
          article.author.substring(0, 20)
        );
      });
    } else {
      console.log('ℹ️  No article cards found with standard selectors');
      console.log('   Trying alternative extraction...\n');
      
      // Alternative: get all links that might be articles
      const links = await page.locator('a').all();
      let linkCount = 0;
      for (const link of links) {
        const text = await link.textContent();
        const url = await link.getAttribute('href');
        if (text && text.length > 20 && text.length < 200 && url && url.includes('article')) {
          if (linkCount < 10) {
            console.log(`   • ${text.substring(0, 70)}`);
            linkCount++;
          }
        }
      }
      
      if (linkCount === 0) {
        console.log('   Could not extract article list');
        console.log('   (Page structure may have changed)\n');
      }
    }

    console.log('\n💡 NOTE: This shows PUBLISHED articles visible to the public.');
    console.log('   To see DRAFT articles awaiting approval, you need SPIP admin access.');
    console.log('   Use: node scripts/create-article.mjs --inspect\n');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

listTierraArticles();
