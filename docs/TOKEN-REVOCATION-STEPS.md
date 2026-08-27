# GitHub Token Rotation — Step-by-Step Guide

**Last Updated:** 2026-08-21 (v0.40.2)  
**Status:** ✅ Token rotated and verified working

---

## Overview

This guide documents how to safely rotate a GitHub Personal Access Token used for repository operations (CI/CD, deployment scripts, etc.).

**Why rotate:**
- Token compromise (exposed in logs, backups, or git history)
- Scheduled rotation policy (e.g., every 90 days)
- Changing permissions or expiration

**What this does NOT cover:**
- SSH keys (different process)
- OAuth apps
- Deploy keys (machine-level, different revocation flow)

---

## Step 1: Revoke the Old Token

### On GitHub.com

1. Visit: **https://github.com/settings/tokens**
   - Or: GitHub → Settings → Developer settings → Personal access tokens (Classic)
2. Find the token you want to revoke
   - List shows token prefix (first 4 chars), expiration, created date, last used date
   - Search by name or token prefix if you remember it
3. Click **"Delete"** or **"Revoke"**
4. Confirm the deletion in the dialog

**What happens immediately:**
- ✅ Token stops working for authentication
- ✅ Any pending API requests using it will fail
- ✅ CI/CD pipelines using it will error on next run (you'll need to update `.env`)
- ❌ Does NOT remove token from git history (use `git filter-repo` if in public repo)

### Important caveat

If the token was committed to git history:
- Revoked token is **useless** but **visible in history**
- If repo is private: not an immediate concern, but plan for cleanup before making public
- If repo is public: use `git filter-repo` to remove from history (see references below)

**Current status:** Token rotated on 2026-08-21. Old token revoked. Repo remains private, so historical visibility is low-priority.

---

## Step 2: Generate a New Token

### On GitHub.com

1. Visit: **https://github.com/settings/tokens/new**
2. Fill in the form:

   | Field | Value | Notes |
   |-------|-------|-------|
   | **Token name** | `kilombo-repo-access` | Choose a descriptive name with date if rotating |
   | **Expiration** | 90 days | Recommended; forces periodic rotation |
   | **Scopes** | ☑️ `repo` | Full control of private/public repos — adjust if needed |

3. Click **"Generate token"**
4. **Copy the token value immediately** (you won't see it again if you navigate away)
   - Token starts with `ghp_` and is ~40 characters
   - Do NOT close this page until you've stored it safely

### Scope reference

Common scopes for this project:

| Scope | What it allows | Needed? |
|-------|----------------|---------|
| `repo` | Full repo access (read + write) | ✅ Yes |
| `workflow` | CI/CD workflows (GitHub Actions) | ✅ Yes (if using Actions) |
| `gist` | Create/edit gists | ❌ No |
| `user` | User profile info | ❌ No |

**Best practice:** Use the minimum scopes needed. `repo` + `workflow` covers this project.

---

## Step 3: Store the Token Securely

### Option A: In `.env` (for local scripts)

```bash
# .env (already .gitignore'd)
KILOMBOTOP_PASSWORD="..."
KILOMBOTOP_FUTURE_PASSWORD="..."
GITHUB_TOKEN="ghp_<new-token-value>"
```

**Security note:**
- `.env` is listed in `.gitignore` and will not be committed
- Store a backup in a password manager (1Password, Bitwarden, etc.) for recovery
- Do NOT copy-paste token in Slack, email, or unencrypted chat

### Option B: In GitHub Actions Secrets (for CI/CD)

If using GitHub Actions:

1. Go to repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `GITHUB_TOKEN`
4. Value: paste the token
5. Click "Add secret"

Then reference in workflow YAML:
```yaml
- name: Deploy
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: ./deploy.sh
```

### Option C: In other CI/CD platforms

(GitLab CI, Jenkins, etc.) — follow their secrets management UI, typically:
Settings → CI/CD → Variables (or Secrets) → add `GITHUB_TOKEN`

---

## Step 4: Test and Verify

### Test authentication

From the command line (requires `gh` CLI installed):

```bash
gh auth login --with-token
# Paste the token when prompted
# Wait for "Logged in as <username>"

# Verify it works:
gh repo view <owner>/<repo>
```

Expected output:
```
name:             kilombo
description:      Static mirror of Kilombo content network
owner:            ukoquique-proves
visibility:       private
URL:              https://github.com/ukoquique-proves/kilombo
```

### Test git operations

```bash
# Try a push to verify git auth works
git push origin main

# Or test with a git clone (if you have a test repo)
git clone https://github.com/ukoquique-proves/kilombo
```

### Update scripts

If you have scripts that use the token (e.g., `sandbox/create-article.mjs`):

1. Verify they read from `.env`
2. Restart the script or reload the environment:
   ```bash
   source .env
   node sandbox/create-article.mjs --inspect --id 1
   ```

---

## Step 5: Update Documentation and Notify Team

1. Update this guide with new rotation date (top of file)
2. Update `docs/TO_FIX.md` to mark the rotation issue as resolved
3. If using CI/CD: update workflow variable or secret reference
4. Notify team members of the new token (if shared)

---

## Troubleshooting

### Token still doesn't work after rotation

**Symptom:** `403 Forbidden` or `401 Unauthorized` errors

**Fixes:**
1. Verify token is correct (copy-paste from GitHub, no spaces)
2. Check token hasn't expired (Settings → Tokens → look for expiration date)
3. Verify scopes: must include `repo` for git operations
4. Verify token is not revoked (go to Settings → Tokens and check status)
5. Clear git credentials cache:
   ```bash
   git credential approve
   # Then paste:
   # host=github.com
   # username=oauth
   # password=ghp_<token>
   # [blank line to submit]
   ```

### Old token still working

**Why:** Cached credentials or stale environment

**Fix:**
1. Clear git credential cache:
   ```bash
   git credential reject
   # Then paste:
   # host=github.com
   # [blank line to submit]
   ```
2. Restart terminal/shell
3. Re-login with `gh`:
   ```bash
   gh auth logout
   gh auth login --with-token
   ```

### Want to see old token usage

If you need to audit when/where the old token was used before revocation:

1. Visit GitHub → Settings → Security log (or Settings → Audit log if org)
2. Filter by token or date
3. Look for failed or suspicious API calls

---

## References

- [GitHub Personal Access Tokens docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub CLI (`gh`) authentication](https://cli.github.com/manual/gh_auth_login)
- [`git credential` helpers](https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage)
- [Removing sensitive data from git history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) (if repo goes public)

---

## Timeline for This Project

| Date | Event | Status |
|------|-------|--------|
| 2026-08-18 | Token exposure flagged in TO_FIX #65 | ⚠️ Audit |
| 2026-08-21 | Old token revoked; new token generated | ✅ Completed |
| 2026-08-21 | `.env` updated; `gh repo view` verified | ✅ Verified |
| 2026-11-21 | **Token expires** (90-day rotation window) | 🔔 Reminder |
| 2026-11-21 | Follow this guide to rotate again | 📋 Next rotation |
