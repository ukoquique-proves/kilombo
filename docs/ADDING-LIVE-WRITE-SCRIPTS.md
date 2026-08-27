# Adding Scripts That Mutate the Live SPIP Site

If you're creating a new script that uses Playwright to **write** to www.kilombo.top (create articles, change statuses, update theme settings, etc.), follow this pattern to ensure it routes through the security gateway.

## Quick Checklist

1. **Import the gateway**
   ```javascript
   import { guardedWrite } from '../scripts/lib/live-write-gateway.mjs';
   ```

2. **Wrap your write step**
   ```javascript
   return guardedWrite({
     action: 'article.create',           // machine-readable action name
     script: 'my-new-script.mjs',         // your script name (auto-detected)
     target: { title, section },          // identifying info about what you're writing
     relatedRisks: ['KILO-001'],           // risk ids from docs/RISK-REGISTER.json
     execute: async () => {
       // Your Playwright write logic here
       await page.click('button[type="submit"]');
       await page.waitForNavigation();
       return { success: true };
     }
   });
   ```

3. **Register the script for validation**
   
   Edit `test/live-write-gateway.test.mjs` and add your script to `KNOWN_LIVE_WRITE_SCRIPTS`:
   ```javascript
   const KNOWN_LIVE_WRITE_SCRIPTS = [
     'scripts/create-article.mjs',
     'scripts/manage-article-status.mjs',
     'scripts/customize-escal-theme.mjs',
     'scripts/my-new-script.mjs',        // ← Add here
   ];
   ```

4. **Update the risk register if needed**
   
   If your script performs a new category of write (not covered by existing risks in `docs/RISK-REGISTER.json`), add a new risk entry with:
   - A unique `id` (e.g., `KILO-003`)
   - `severity` (low, medium, high, critical)
   - `affects` list that includes your script
   - `mitigation` strategy

## Why This Matters

The gateway is a **single chokepoint** for all live writes. This means:

- ✅ **Audit trail:** Every write attempt is logged to `live-write-audit.log`
- ✅ **Future policy gates:** If we add KILO_APPROVE_PUBLISHING or require human confirmation, it applies everywhere at once — no script-by-script refactoring
- ✅ **Credential scoping:** If we create narrower SPIP roles (e.g., theme-edit-only), the gateway is where we'd check and swap credentials
- ✅ **Rate limiting & cooldowns:** All can be added in `checkPolicy()` without touching your script

Without the gateway, each new script is a separate security hardening task.

## Enforcement

A Kiro pre-commit hook (`.kiro/hooks/enforce-gateway-with-playwright.json`) blocks any script that imports Playwright from `scripts/` (including `scripts/debug/`) without also importing `live-write-gateway.mjs`. You'll see the error if you try to create a script that bypasses the gateway:

```
[SECURITY] New script imports Playwright but not live-write-gateway.
All scripts that mutate the live SPIP site must route through guardedWrite().
Add this import to your script:
  import { guardedWrite } from '../scripts/lib/live-write-gateway.mjs';
Then update test/live-write-gateway.test.mjs KNOWN_LIVE_WRITE_SCRIPTS list.
```

## Example: Adding a Script to Delete Comments

```javascript
// scripts/delete-comment.mjs
#!/usr/bin/env node
import { chromium } from 'playwright';
import { guardedWrite } from './lib/live-write-gateway.mjs';

async function deleteComment(commentId) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // ... login logic ...
    
    return guardedWrite({
      action: 'comment.delete',
      target: { commentId },
      relatedRisks: ['KILO-003'],  // hypothetical risk
      execute: async () => {
        await page.goto(`https://www.kilombo.top/ecrire/?exec=commentaires&id_comment=${commentId}`);
        await page.click('button.delete-comment');
        await page.waitForNavigation();
        return { success: true, commentId };
      }
    });
  } finally {
    await browser.close();
  }
}
```

Then update the test list:
```javascript
const KNOWN_LIVE_WRITE_SCRIPTS = [
  'scripts/create-article.mjs',
  'scripts/manage-article-status.mjs',
  'scripts/customize-escal-theme.mjs',
  'scripts/delete-comment.mjs',        // ← Add this line
];
```

## Testing

```bash
npm test
# Should see:
#   ✓ every known live-write script imports the shared gateway
#   ✓ risk register entries have required fields
#   ✓ every risk register "affects" path exists on disk
```

If your script is missing from KNOWN_LIVE_WRITE_SCRIPTS, the first test will fail with a helpful message.

## See Also

- `scripts/lib/live-write-gateway.mjs` — Gateway source code
- `docs/RISK-REGISTER.json` — Architectural risks and mitigations
- `test/live-write-gateway.test.mjs` — Validation tests
- `SECURITY-REPORT.md` — Full security analysis

