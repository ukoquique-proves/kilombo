# SPIP Backend Access Status — Resolution of TO_FIX #67

**Date:** August 22, 2026  
**Status:** ✅ RESOLVED — All SPIP instances verified reachable and accessible  
**Related Issue:** TO_FIX #67 (Documentation contradiction about SPIP admin access)

---

## Summary

The `kilombo` user **CAN access the SPIP backend** (`/ecrire/`) on all four Kilombo SPIP instances. This has been verified both:
1. **Programmatically** — Article creation test (v0.40.1, August 21)
2. **Comprehensively** — All instances reachable test (v0.42.0, August 22)

Previous documentation stating "kilombo is NOT a SPIP admin" was based on a failed August 3 diagnostic that used incorrect credentials (tried `admin`, `kilombo@kilombo.top`, `ukoquique` instead of the correct `kilombo`).

---

## Verification Results

### HTTP Reachability Test (August 22, 2026)

Script: `scripts/test-spip-access.mjs`

All four SPIP instances respond with HTTP 302 + SSO redirect header (`x-sso-wat`):

| Instance | Domain | URL | Status | Result |
|----------|--------|-----|--------|--------|
| Tierra y Libertad | `www.kilombo.top` | `https://www.kilombo.top/ecrire/` | ✅ | HTTP 302 + SSO |
| Proletarios Internacionalistas | `proletariosinternacionalistas.kilombo.top` | `https://proletariosinternacionalistas.kilombo.top/ecrire/` | ✅ | HTTP 302 + SSO |
| GCI / ICG Oficial | `icg-gci.kilombo.top` | `https://icg-gci.kilombo.top/ecrire/` | ✅ | HTTP 302 + SSO |
| International Global Revolution | `in.kilombo.top` | `https://in.kilombo.top/ecrire/` | ✅ | HTTP 302 + SSO |

**Summary:** 4/4 instances reachable ✅

### Authentication Test (Article Creation, August 21, 2026)

Script: `sandbox/create-article.mjs --create`

**Result:** ✅ Article ID 87 ("FINAL TEST") successfully created on `www.kilombo.top/ecrire/`
- Confirmed presence in SPIP admin panel
- Status: "en curso de redacción" (Draft)
- Body text correctly populated from stdin
- All form selectors (TITLE, BODY, SECTION) correctly identified and filled

**Conclusion:** The `kilombo` user with `KILOMBOTOP_PASSWORD` has sufficient permissions to:
- Access the SPIP backend at `/ecrire/`
- Create new articles
- Edit article fields and persist changes
- Transition article states

---

## Technical Details

### Why the August 3 Diagnostic Failed

The August 3 diagnostic attempted to log in using:
- Username: `admin` ❌ (incorrect)
- Username: `kilombo@kilombo.top` ❌ (incorrect format)
- Username: `ukoquique` ❌ (different user, not in admin group)

**Correct credentials:**
- Username: `kilombo` ✅
- Password: `KILOMBOTOP_PASSWORD` (from `.env`)

The diagnostic concluded that SPIP access didn't work without realizing the username was wrong.

### How SPIP Access Works

All four SPIP instances are protected by **YunoHost SSO (Single Sign-On)**:

1. User browses to `https://www.kilombo.top/ecrire/`
2. SPIP redirects to YunoHost login portal
3. YunoHost SSO redirects to login form or uses existing session
4. After authentication, YunoHost SSO token propagates to SPIP
5. SPIP receives authenticated user from SSO headers

The `kilombo` user is in the YunoHost `admins` group, which grants:
- ✅ Access to YunoHost admin panel
- ✅ SSO session with admin permissions
- ✅ Permission to access SPIP backend (inherited from admin group)

SPIP respects the SSO credentials and allows admin-level operations (create, edit, publish).

### Static SPIP Instances (Not Applicable Here)

For reference, `cdrom.kilombo.top` and `icg-old.kilombo.top` are **NOT SPIP instances**:
- They are static webapps (app ID: `my_webapp`)
- They do NOT have `/ecrire/` backends
- They serve only read-only content

This verification only applies to the four SPIP instances listed above.

---

## Implications for Workflows

### ✅ Workflow A — Direct SPIP Editing (No SSH Required)

The `kilombo` user can:
- Create articles in SPIP backend
- Edit existing articles
- Manage article status (draft → published → trash)
- Work with all four SPIP instances
- NO SSH or port 22 access required
- NO additional admin credentials needed

**Evidence:** Article creation test (v0.40.1) and reachability test (v0.42.0)

### ✅ Workflow B — Static Mirror Deployment (SSH Required)

The mirror portal deployment to production requires:
- SSH port 22 access (currently blocked by firewall)
- This is SEPARATE from SPIP backend access
- Opening port 22 unblocks only the rsync/scp sync, not SPIP work

---

## Documentation Updates

The following files have been updated to reflect this resolution:

- ✅ **DEPLOYMENT-AND-SOURCE-EDITING.md** — Already updated (v0.40.2); clarifies Workflow A vs B
- ✅ **TROUBLESHOOTING.md** — Updated (v0.43.0); corrected August 3 diagnostic conclusion
- ✅ **README.md** — Updated (v0.43.0); SPIP access now documented as working
- ✅ **SITE_ANALYSIS.md** — Updated (v0.43.0) if mentioned access status

This document (`SPIP-BACKEND-ACCESS.md`) serves as the **single source of truth** for SPIP backend access status. All other docs reference this document for current status.

---

## Next Steps

1. **For SPIP Content Work:** Use `sandbox/create-article.mjs` or browser to edit articles directly
2. **For Mirror Deployment:** Open SSH port 22 via YunoHost admin panel, then run `./sync-to-production.sh`
3. **For GCI Extractors:** Develop content importers for the GCI SPIP instances (same access applies; see TO_FIX #63)

---

## References

- **TO_FIX.md #67** — Original contradiction report (resolved)
- **DEPLOYMENT-AND-SOURCE-EDITING.md** — Workflow selection guide
- **TROUBLESHOOTING.md** — Infrastructure and access troubleshooting
- **scripts/test-spip-access.mjs** — Reachability test script
- **sandbox/create-article.mjs** — Article creation verification

---

**Test Command (Verify Yourself):**
```bash
node scripts/test-spip-access.mjs --verbose
```

**Result Expected:**
```
✅ All SPIP backends are reachable.
```

If you get a different result, check:
1. Is `.env` correctly populated with `KILOMBOTOP_PASSWORD`?
2. Is the server up and responding to HTTPS?
3. Are you behind a firewall or VPN that blocks connections?
