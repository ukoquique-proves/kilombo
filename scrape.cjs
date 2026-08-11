const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  console.log("Navigating to https://kilombo.top/...");
  await page.goto('https://kilombo.top/', { waitUntil: 'networkidle' });
  
  // Check if we are on the YunoHost SSO page
  if (page.url().includes('sso')) {
    console.log("Detected YunoHost SSO page. Logging in...");
    // Fill YunoHost SSO credentials
    // The exact selectors depend on the YunoHost version, usually #login or similar
    // We will look for inputs
    await page.fill('input[type="text"], input[name="credentials"], input[name="username"], input[id="loginInput"]', 'kilombo');
    await page.fill('input[type="password"]', 'otario2021');
    await page.click('button[type="submit"], input[type="submit"], #submit');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
  }
  
  console.log("Current URL after SSO:", page.url());
  
  // Check if we are on the StatiCrypt page
  const content = await page.content();
  if (content.includes('staticrypt-html') || content.includes('Contraseña')) {
    console.log("Detected StatiCrypt page. Decrypting...");
    await page.fill('input[type="password"]', 'otario2021');
    await page.click('button[type="submit"], form button, form input[type="submit"]');
    // Wait for decryption to finish
    await page.waitForTimeout(2000);
  }
  
  console.log("Extracting final content...");
  // Save the decrypted HTML
  const finalContent = await page.content();
  const fs = require('fs');
  fs.writeFileSync('final_kilombo.html', finalContent);
  console.log("Done. Saved to final_kilombo.html");
  
  await browser.close();
})();
