# sync-to-production.sh — Interactive-Only Design as Security Pattern

**Date:** August 24, 2026  
**Subject:** Why `sync-to-production.sh` intentionally does NOT accept CLI arguments or environment-based automation  
**Status:** INTENTIONAL DESIGN DECISION

---

## The Pattern: Human-in-the-Loop Gates via stdin

`sync-to-production.sh` enforces a deliberate security pattern:

```bash
# ❌ WILL NOT WORK (and cannot be made to work):
./sync-to-production.sh --host kilombo.top --dry-run

# ✅ WILL WORK (requires human presence and decision):
./sync-to-production.sh
# → Prompts: "¿Seguro? Escribe PROD para continuar:  "
# → Then: "¿El simulacro es correcto? Escribe SI para ejecutar:  "
```

**Key design principle:**

> The script is designed so that **every destructive operation requires a human to make a deliberate choice and explicitly type it in.** This is not a limitation—it is the security feature itself.

---

## Why This Pattern Exists

### The Problem It Solves

Production deployment scripts can fail in catastrophic ways:

1. **Typos in automation** — A CI/CD pipeline with wrong args, and data is deleted
2. **Mistakes in conditionals** — `if [ $PROD_MODE = "true" ]` but $PROD_MODE is unset
3. **Wrong target** — Script pointed at wrong server, deletes wrong site
4. **Accidental execution** — Mistyped command runs with defaults or env vars
5. **Privilege escalation** — Non-admin passes --force flag that root checks silently

### The Pattern as a Gate

`sync-to-production.sh` uses **human cognitive verification** as the security gate:

```
User intention:     "I want to sync to production"
          ↓
Automated checks:   Port reachable? Auth working? site/ exists?
          ↓
Explicit confirmation:   User types "PROD" to confirm intent
          ↓
Dry-run preview:   User sees what WILL change
          ↓
Final confirmation:   User types "SI" to actually execute
          ↓
Execution:   rsync --delete runs
```

**Each confirmation is irreplaceable:**
- **"PROD" confirmation** — Verifies human awareness this is production
- **"SI" confirmation** — Verifies human reviewed dry-run and agrees with changes

### Why NOT CLI Args or Environment Variables

**Automated deployment (e.g., from CI/CD) would require:**

```bash
# In CI/CD config:
KILOMBOTOP_PASSWORD=secret \
SYNC_TARGET=production \
SKIP_CONFIRMATION=true \
./sync-to-production.sh
```

**This breaks the security pattern because:**

1. **The script would need to skip both confirmations** → No human verification
2. **CI/CD logs might leak secrets** → Plaintext password in GitHub Actions output
3. **Typos in CI config are silent** → Wrong env var value used, script doesn't error
4. **CI/CD token compromise means production access compromise** → Attacker deploys malicious site
5. **Confirmation becomes meaningless** → A human can't verify what actually executes; the confirmation prompt would be invisible to the person authorizing

**Example of how this goes wrong:**

```yaml
# .github/workflows/deploy.yml
- name: Sync to Production
  run: |
    KILOMBOTOP_PASSWORD=${{ secrets.PASSWORD }} \
    SKIP_CONFIRMATION=true \
    ./sync-to-production.sh
```

**Problem:**
- Developer runs the workflow by accident → Production silently gets updated
- Attacker compromises the GitHub Actions token → Can push any site to production
- Typo in secrets configuration → Wrong server updated without notice
- **There is no human there to say "wait, is this really what we want?"**

---

## Known Call Sites: Where Interactive Mode Still Works

`sync-to-production.sh` is invoked interactively from:

1. **Manual operator:** `./sync-to-production.sh` from terminal
2. **`end-of-session.sh` (Step 2):** Calls the script after pushing to GitHub (see `end-of-session.sh` line ~90)

**Key point:** Both call sites preserve stdin because they run in the same terminal session as the human operator. The stdin prompts remain interactive and meaningful. If `end-of-session.sh` is ever run non-interactively (e.g., cron, CI/CD), stdin will disconnect and the script will fail—which is the intended behavior. Do not add flags to bypass this.

---

## How a Web UI Should Interact With This

When building a management UI that needs to sync to production, **DO NOT try to bypass the interactive gates.** Instead:

### ✅ Correct Approach: Respect the Interactive Pattern

```javascript
// In web UI (Node.js backend):
const { spawn } = require('child_process');

async function syncToProduction(req, res) {
  // User clicked "Sync to Production" button in UI
  // The web UI itself becomes the confirmation gate
  
  // Step 1: Get human confirmation from UI
  const { confirmed } = req.body; // User checked "I reviewed changes" checkbox
  if (!confirmed) {
    return res.status(400).json({ error: 'Confirmation required' });
  }
  
  // Step 2: Start dry-run
  const dryRunProcess = spawn('./sync-to-production.sh', [], {
    cwd: '/root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/KILOMBO'
  });
  
  let output = '';
  dryRunProcess.stdout.on('data', (data) => {
    output += data.toString();
    res.write(data); // Stream to UI
  });
  
  dryRunProcess.on('data', (data) => {
    // Script is asking: "¿El simulacro es correcto? Escribe SI para ejecutar:"
    // UI has shown the dry-run output to the human
    // Now we wait for ANOTHER human confirmation to type "SI"
    
    if (data.includes('SI')) {
      // User confirmed in UI again, send "SI" to stdin
      dryRunProcess.stdin.write('SI\n');
    }
  });
}
```

**Why this works:**
- Human sees dry-run output in the UI
- Human makes a second conscious decision to proceed
- Both confirmations remain meaningful
- If something goes wrong, the human stops before the actual sync

### ❌ Wrong Approach: Trying to Automate the Confirmations

```javascript
// ❌ DO NOT DO THIS:
const { spawn } = require('child_process');
const process = spawn('./sync-to-production.sh', [], { ... });

// Automatically send confirmations without human involvement
process.stdin.write('PROD\n');
process.stdin.write('SI\n');

// WHY THIS IS WRONG:
// 1. The confirmation prompts are now invisible to the human
// 2. The script runs regardless of whether changes are correct
// 3. If something breaks, the human didn't make an informed decision
// 4. This is exactly the automation failure that the script was designed to prevent
```

---

## The Principle: Safe Must Be Harder to Bypass Than to Use

### Applied Across the Project

This principle appears in multiple places:

| Component | Gate | Why |
|-----------|------|-----|
| `sync-to-production.sh` | stdin confirmations | Human explicitly authorizes production sync |
| `manage-article-status.mjs --status publie` | KILO_APPROVE_PUBLISHING env var | Explicit token required to publish live |
| `migrate-to-spip.mjs --publish` | KILO_APPROVE_PUBLISHING env var | Explicit token required to publish live |
| `live-write-gateway.mjs` | audit logging + future policy gates | All writes pass through chokepoint, logged |
| `.kiro/hooks/enforce-gateway-with-playwright.json` | pre-commit hook | New Playwright scripts must use guardedWrite() |

**The pattern:** Make the safe path the default; make the risky path require explicit, logged action.

---

## For UI Developers: What NOT to Do

### ❌ Anti-Pattern 1: Spawn and Fake Confirmations

```javascript
// ❌ WRONG
const proc = spawn('./sync-to-production.sh');
proc.stdin.write('PROD\nSI\n');  // Script can't see the deliberation, only the answers
```

### ❌ Anti-Pattern 2: Parse Output and Auto-Respond

```javascript
// ❌ WRONG
proc.stdout.on('data', (data) => {
  if (data.includes('Escribe PROD')) {
    proc.stdin.write('PROD\n');  // Again, no human involved
  }
});
```

### ❌ Anti-Pattern 3: Extract Credentials and Call rsync Directly

```javascript
// ❌ WRONG
const { execSync } = require('child_process');
const password = env.KILOMBOTOP_PASSWORD;
// Bypass the script entirely, call rsync directly
// Now you've removed ALL the safety checks (encrypted file detection, preflight validation, etc.)
```

---

## For Developers: If You Must Automate This

If there is a genuine need to automate production sync (e.g., scheduled maintenance window), do this:

### ✅ Create a Separate, Narrower Script

**File:** `scripts/lib/sync-to-production-automated.mjs`

```javascript
/**
 * sync-to-production-automated.mjs — CAREFULLY CONTROLLED production sync
 *
 * SECURITY POLICY:
 * - This script ONLY runs from CI/CD with specific commit message trigger
 * - Requires 2-person approval in GitHub (branch protection rules)
 * - Logs every execution with timestamp, author, deployed commit
 * - Implements a "deploy window" — only runs Mondays 02:00–04:00 UTC
 * - Requires manual enable: CI/CD maintainer must set SECRET_SYNC_ENABLED=true
 *
 * USAGE:
 *   From CI/CD only: KILO_APPROVE_AUTOMATED_SYNC=true node sync-to-production-automated.mjs
 *
 * NOTE: This is separate from sync-to-production.sh intentionally.
 *       If you need automation, maintain it separately with its own gate.
 */

import { guardedWrite } from './live-write-gateway.mjs';
import { execSync } from 'child_process';

if (!process.env.KILO_APPROVE_AUTOMATED_SYNC) {
  console.error('❌ Automated sync requires KILO_APPROVE_AUTOMATED_SYNC=true');
  console.error('   This is a separate gate from manual sync.');
  process.exit(1);
}

// Further restrictions...
```

**Then in CI/CD:** Require:
1. Explicit branch protection rule requiring 2 approvals
2. Manual "approve deployment" action in GitHub
3. Deploy window checking (time-based gate)
4. Commit message signature

**Key difference:** The automated version is *explicitly different* from the interactive script, with its own approval and audit trail.

---

## Conclusion: Treat Interactive Gates as Features

`sync-to-production.sh` prompts for confirmation **not because it's inconvenient, but because inconvenience is the security feature.**

When building a UI around this:

✅ **Respect the interactive pattern**  
✅ **Keep the confirmations visible to the human**  
✅ **Make the UI a better window into what the script does, not a bypass of what it guards**  
✅ **If you need automation, create a separate, narrower script with its own gates**  

The goal is not to make dangerous operations easy; it's to make them observable and require deliberate human choice at each step.

---

**Related files:**
- `sync-to-production.sh` — The actual script
- `SECURITY-REPORT.md` — Security vulnerabilities and mitigations
- `docs/RISK-REGISTER.json` — Active risks and gates
- `scripts/lib/live-write-gateway.mjs` — Audit/gating chokepoint
- `docs/ADDING-LIVE-WRITE-SCRIPTS.md` — How to write new mutating scripts

