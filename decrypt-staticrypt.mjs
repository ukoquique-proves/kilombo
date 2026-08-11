#!/usr/bin/env node
// decrypt-staticrypt.mjs — Decrypt StatiCrypt-protected HTML content

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple AES-256-GCM decryption (staticrypt uses sjcl internally)
// For now, we'll use a different approach: extract the encrypted data and use Node's crypto

async function decryptStaticrypt(inputFile, outputFile, password) {
  console.log('=== StatiCrypt Decryption ===');
  console.log(`Input:  ${inputFile}`);
  console.log(`Output: ${outputFile}`);
  console.log('');

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  const html = fs.readFileSync(inputFile, 'utf8');

  // Check if file is StatiCrypt-encrypted
  if (!html.includes('staticrypt')) {
    console.log('⚠ Warning: File does not appear to be StatiCrypt-encrypted');
    console.log('Copying as-is...');
    fs.copyFileSync(inputFile, outputFile);
    console.log(`✓ Done. Saved to: ${outputFile}`);
    return;
  }

  // Extract encrypted data from HTML
  // StatiCrypt embeds: staticryptConfig = { ... encryptedBlob: "...", .... }
  const configMatch = html.match(/staticryptConfig\s*=\s*({[\s\S]*?});/);
  if (!configMatch) {
    console.error('❌ Could not extract StatiCrypt config from HTML');
    process.exit(1);
  }

  try {
    const configStr = configMatch[1];
    // Safely parse the config object
    const config = JSON.parse(configStr);
    
    console.log('✓ Extracted encrypted data from HTML');
    console.log(`  Encrypted blob length: ${config.encryptedBlob.length} chars`);
    
    // NOTE: Full decryption requires the sjcl library (which staticrypt uses)
    // and the same crypto parameters. This is complex and would require
    // either: (1) running the browser-based decryption, or (2) implementing
    // AES-256-GCM in Node.js matching staticrypt's exact parameters.
    
    console.log('');
    console.log('⚠ Decryption requires browser context (staticrypt uses sjcl)');
    console.log('  Use one of these approaches:');
    console.log('  1. Open in browser: file://' + path.resolve(inputFile));
    console.log('  2. Use Playwright with: npm run scrape -- --decrypt');
    console.log('  3. Extract staticrypt.js and run in Node.js');
    
  } catch (e) {
    console.error('❌ Error parsing StatiCrypt config:', e.message);
    process.exit(1);
  }
}

// Main
const inputFile = process.argv[2] || './scraped-content/index.html';
const outputFile = process.argv[3] || './scraped-content/index-decrypted.html';
const password = process.env.STATICRYPT_PASSWORD || 'otario2021';

decryptStaticrypt(inputFile, outputFile, password).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
