# SECURITY REPORT: Editorial Control Vulnerability in SPIP Article Publishing

**Date:** August 24, 2026  
**Severity:** HIGH  
**Status:** DISCOVERED & DOCUMENTED  
**Affected System:** www.kilombo.top (SPIP 4.4.15)

---

## Executive Summary

A critical security vulnerability exists in the article publishing workflow: **direct publication to Tierra y Libertad is easier and faster than submitting articles for editorial review.**

This inverts the security principle that safe operations should be the path of least resistance.

**Impact:** Anyone with article creation access can bypass editorial control with fewer steps, creating risk of:
- Unvetted content publication
- Accidental publication of draft material
- Lack of editorial oversight
- Violation of moderation policy

---

## Vulnerability Description

### What the Vulnerability Is

The SPIP instance at www.kilombo.top allows creating and publishing articles through automated scripts with **no built-in friction preventing direct publication.**

When a developer discovered the project, they found:

✅ Creating and publishing directly = **1 command**
❌ Creating and submitting for review = **1 command + manual review step**

**The ease metric is inverted.** Safe should be easier. Risky should require more effort.

### Root Cause Analysis

1. **SPIP's Default Behavior**
   - SPIP creates articles in draft status (`prepa`) by default ✓
   - BUT the status can be changed to published (`publie`) immediately after creation
   - Status change is a simple API call/form submission
   - No built-in delay or confirmation required

2. **Migration Scripts Don't Enforce Review**
   - Article creation scripts (`scripts/create-article.mjs`) can change status to published
   - No requirement to keep articles in draft while waiting for approval
   - Direct publication is possible in a single script execution

3. **No Administrative Enforcement**
   - No SPIP permission system preventing non-admin publication
   - No workflow state machine enforcing review step
   - No audit trail requirement for direct publishing

### Example of the Vulnerability

**Easy Path (Direct Publish - RISKY):**
```bash
# 1 step, automated, no human involvement
node scripts/create-article.mjs --create --title "..." --body "..." 
# Article is now LIVE on www.kilombo.top
```

**Difficult Path (Submit for Review - SAFE):**
```bash
# Step 1: Create article in draft
node scripts/create-article.mjs --create --title "..." --body "..."

# Step 2: Manual admin login and review
# - Visit SPIP admin dashboard
# - Navigate to article management
# - Read and evaluate content
# - Make editorial decision
# - Manually change status to published

# Many more steps, requires human judgment
```

**The problem:** Step 1 alone is all that's needed for publication.

---

## Security Impact

### Scenarios Enabled by This Vulnerability

**Scenario 1: Accidental Publication**
- Developer tests create-article.mjs in production environment
- Script includes status-change to `publie`
- Unfinished/malformed content goes live
- No editorial review catches it

**Scenario 2: Unauthorized Publication**
- Contributor with create access bypasses approval process
- Publishes directly instead of submitting for review
- Editorial team unaware until article already live
- No audit trail of who published and when

**Scenario 3: Malicious Content**
- Attacker gains script access (stolen credentials, compromised CI/CD)
- Publishes directly without review
- False information, spam, or harmful content reaches audience immediately
- No moderation layer to intercept

**Scenario 4: Workflow Policy Violation**
- Team policy requires editorial review for all content
- Technical system does NOT enforce this policy
- Someone publishes directly, violating policy
- Policy becomes unenforceable

---

## Current State vs. Desired State

### Current State (VULNERABLE)

```
User runs create-article.mjs
        ↓
Article created in SPIP
        ↓
Status changed to "publie" (published)
        ↓
Article LIVE on www.kilombo.top
        ↓
NO EDITORIAL REVIEW OCCURRED
```

**Ease:** Easy (1 automated step)  
**Risk:** High (content not reviewed)  
**Frequency:** Possible every execution

### Desired State (SECURE)

```
User runs create-article.mjs
        ↓
Article created in SPIP (status: draft/prepa)
        ↓
Article appears in ADMIN REVIEW QUEUE
        ↓
Admin/Editor reviews content
        ↓
Editorial decision made:
  • APPROVE → Status changed to "publie" (published)
  • REJECT → Status changed to "refuse" (rejected)
  • REVISE → Status stays "prepa" (draft)
        ↓
Article LIVE (only if approved) or REJECTED
        ↓
FULL EDITORIAL REVIEW OCCURRED
```

**Ease:** Harder (requires admin action)  
**Risk:** Low (content reviewed before publication)  
**Frequency:** Only after explicit approval

---

## Technical Details

### SPIP Status Workflow

SPIP provides 5 article status codes:

| Code | Name | Visibility | Editor Access |
|------|------|------------|---|
| `prepa` | Draft | Admin only | ✅ Can edit freely |
| `prop` | Proposed | Admin only | ✅ Waiting for review |
| `publie` | Published | **PUBLIC** | ⚠️ Live on site |
| `refuse` | Refused | Admin only | ⚠️ Rejected from review |
| `poubelle` | Trash | Admin only | ⚠️ Hidden but recoverable |

**The vulnerability:** Articles can transition from `prepa` → `publie` without administrative intervention.

### Attack Surface

**Direct Access Points:**
1. `scripts/scripts/create-article.mjs` — Can create AND change status
2. `scripts/manage-article-status.mjs` — Can change article status
3. Any custom script using the SPIP API directly
4. Direct SPIP login (requires credentials)

**Vulnerable Operations:**
```javascript
// Pseudocode showing vulnerability
const article = createArticle({
  title: "...",
  body: "...",
  status: "prepa"  // Created as draft ✓
});

// Immediately changed to published
changeArticleStatus(article.id, "publie");  // ← NO REVIEW REQUIRED
// Article now LIVE
```

### Who Can Exploit This

- Anyone with access to the scripts (developers, CI/CD)
- Anyone with .env credentials (KILOMBOTOP_PASSWORD)
- Anyone with direct SPIP admin login
- Anyone with modified script access

---

## Recommendations

### Immediate Actions (High Priority)

**1. Administrative Policy Enforcement**
```
SPIP Configuration:
- Document that articles must go through "prop" (proposed) status
- Require admin approval before changing to "publie"
- Set up workflow notifications when articles enter review queue
```

**2. Script-Level Controls**
```bash
# All scripts creating articles MUST create in draft status only
createArticle({ status: "prepa" }) # Always draft, never auto-publish

# Require explicit admin action or environment variable to publish
# (This has been implemented in v0.45.1 as KILO_APPROVE_PUBLISHING)
```

**3. Access Control**
```
Credentials Management:
- Separate read-only vs. write credentials
- Limit who can use publish scripts
- Audit script execution logs
```

**4. Audit Logging**
```
Implement tracking:
- WHO created each article
- WHEN articles were created
- WHO changed status and WHEN
- Changes from draft → published especially
```

### Medium Priority

**5. Workflow Enforcement**
- Implement SPIP plugin to enforce status transitions
- Prevent direct draft → published without admin approval
- Require 2-person review for sensitive sections

**6. Monitoring & Alerts**
```
Alert on:
- Articles published without review period
- Direct draft → published transitions
- Multiple articles published in short time window
- Publications outside business hours
```

**7. Documentation**
- Document review process clearly
- Train all team members on policy
- Create runbook for "this article was published by mistake"

### Long Term

**8. Role-Based Access Control**
```
Roles:
- CREATOR: Can create articles, sees own drafts
- REVIEWER: Can review and approve articles
- PUBLISHER: Can publish approved articles
- ADMIN: Can do everything + configure system

Enforce:
- Creators cannot publish
- Publishers cannot bypass reviewers
```

**9. Change Management**
- Require ticket/issue for each publication
- Link articles to approval tickets
- Maintain publication history

**10. Security Hardening**
- Keep SPIP updated
- Regular security audits
- Penetration testing of article workflow

---

## Implementation Examples

### Example 1: Prevent Direct Publishing

**Current (Vulnerable):**
```bash
node scripts/create-article.mjs --create --title "Test" --body "..." --publish
# Article goes live immediately ❌
```

**Fixed (Secure):**
```bash
# Step 1: Create in draft only
node scripts/create-article.mjs --create --title "Test" --body "..."
# Article created in draft status ✓

# Step 2: Admin must explicitly review and approve
# (cannot be automated without explicit override)
# ... manual review happens ...

# Step 3: Admin publishes after approval
KILO_APPROVE_PUBLISHING=true node scripts/manage-article.mjs --change --id 90 --status publie
```

### Example 2: Audit Trail

**System should log:**
```
2026-08-24 10:15:23 - Article #90 created by usuario "kilombo" (status: prepa)
2026-08-24 10:15:45 - Article #90 viewed by admin "editor1" 
2026-08-24 10:16:10 - Article #90 status changed by "editor1" (prepa → publie)
2026-08-24 10:16:10 - Article #90 published, now visible to public
```

### Example 3: Review Queue

**Admin dashboard should show:**
```
Pending Review (Awaiting Editorial Approval)
─────────────────────────────────────────
ID    Title                           Created By    Created When        Status
90    New Article About...            kilombo       2026-08-24 10:15    Awaiting approval
91    Another Article...              contributor  2026-08-24 10:20    Awaiting approval

Actions: [APPROVE] [REJECT] [REQUEST CHANGES] [VIEW FULL]
```

---

## Why This Matters

**Editorial Control is Not Optional**

In a collaborative environment, editorial review serves critical functions:

✅ **Quality Assurance** — Catches errors, typos, formatting issues  
✅ **Fact-Checking** — Verifies accuracy of claims  
✅ **Alignment** — Ensures content matches editorial line  
✅ **Legal** — Catches potentially libelous or problematic language  
✅ **Consistency** — Maintains publication standards  
✅ **Accountability** — Creates record of who published what  
✅ **Organizational Control** — Prevents unauthorized publication

**When the system makes review optional or easy to skip, it undermines all these functions.**

---

## Testing the Vulnerability

### Proof of Concept

1. **Create test article in draft:**
   ```bash
   node scripts/create-article.mjs --create \
     --title "Security Test Article" \
     --body "<p>This is a test.</p>"
   # Result: Article #XX created (status: prepa)
   ```

2. **Check admin queue (article in draft):**
   - Visit https://www.kilombo.top/ecrire/?exec=articles
   - Article appears in review queue
   - Status shows "En curso de redacción" (draft)

3. **Publish without review:**
   ```bash
   node scripts/manage-article-status.mjs --change --id XX --status publie
   # Result: Article #XX now published (status: publie)
   ```

4. **Verify article is now public:**
   - Visit https://www.kilombo.top/
   - Article appears in Tierra y Libertad section
   - No review occurred, no admin approval recorded

**This demonstrates the vulnerability: publication without review is possible.**

---

## Affected Versions

- **SPIP:** 4.4.15 (current version)
- **Escal Theme:** 5.2.9 (current version)
- **YunoHost:** (version not specified in documentation)

The vulnerability is inherent to SPIP's design and how the status workflow is implemented. It exists in the current production environment.

---

## Disclosure Timeline

- **2026-08-24:** Vulnerability discovered during article workflow analysis
- **2026-08-24:** Mitigation implemented in scripts (v0.45.1)
- **2026-08-24:** This report generated to inform kilombo.top owners

---

## Contact & Next Steps

This report has been prepared to inform the owners of www.kilombo.top of the security risk.

**Recommended Next Steps:**

1. **Review this report** with the team
2. **Assess risk** for your specific use case
3. **Implement recommended controls** starting with high-priority items
4. **Test** the new workflow to ensure it works for your team
5. **Document** the approved process
6. **Train** all team members on the new requirements

**Questions About This Report:**
- See `PUBLISHING-GUIDE.md` for normal workflow documentation
- See `docs/MIGRATION-WORKFLOW.md` for technical architecture
- See `docs/SPIP-ARTICLE-MANAGEMENT.md` for status management details

---

## Conclusion

The vulnerability identified—**easy direct publishing vs. difficult editorial review**—represents a configuration issue rather than a code defect. SPIP functions as designed; the risk lies in how it's being used.

This report documents the risk and recommends practical measures to enforce editorial control at both the system and process level. Implementation of these recommendations will restore editorial oversight as the default workflow.

**Security Principle Applied:**
> Safe operations should always be easier and require fewer steps than risky operations. When this principle is inverted, security fails regardless of how well-intentioned the system is.

---

*Report prepared: August 24, 2026*  
*Prepared for: kilombo.top ownership and editorial team*  
*Prepared by: Security analysis of Kilombo publishing workflow*
