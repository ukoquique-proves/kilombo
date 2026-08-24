# Git Credential Security

## Problem
When using HTTPS git URLs with embedded tokens (e.g., `https://ghp_xxx@github.com/...`), the Personal Access Token gets stored in `.git/config` in plain text. This is a security risk because:

- Anyone with filesystem access to this directory can read the token
- Backups or archives of the workspace expose the token
- The token has push access to the entire repository

## Solution
This project uses a **credential helper script** that keeps the token in `.env` (which is gitignored) instead of in `.git/config`.

### How it works

1. **Token stored safely in `.env`** (gitignored)
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. **Git configured to use credential helper** (in `.git/config`)
   ```
   [credential]
       helper = !/path/to/scripts/git-credential-env.sh
   ```

3. **When git needs credentials** (push/pull/fetch)
   - Git calls the credential helper script
   - Script reads `GITHUB_TOKEN` from `.env`
   - Script provides credentials to git
   - Token never stored in `.git/config`

### Setup

After cloning the repo, the credential helper is already configured in `.git/config`. Just ensure:

1. `.env` exists with valid `GITHUB_TOKEN`
2. The script is executable:
   ```bash
   chmod +x scripts/git-credential-env.sh
   ```

### Testing

Verify the setup works:
```bash
git pull origin main
```

If credentials fail, check:
- `.env` exists and has `GITHUB_TOKEN` set
- `.git/config` has the credential helper path pointing to the right location
- The script is executable

### What the script does

**File:** `scripts/git-credential-env.sh`

When git requests credentials:
- Reads `.env` file
- Extracts `GITHUB_TOKEN` variable
- Returns `username=git` and `password=$GITHUB_TOKEN` to git
- Never stores credentials in git config

The script ignores `store` and `erase` operations from git, ensuring credentials always come from `.env`.

### Troubleshooting

**"ERROR: .env not found"**
- The script couldn't locate `.env` — ensure you're running git from the project root or .env exists at the expected path

**"ERROR: GITHUB_TOKEN not set in .env"**
- `.env` exists but `GITHUB_TOKEN` variable is missing or commented out
- Add it: `GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Authentication fails**
- The `GITHUB_TOKEN` might be expired or revoked
- Generate a new token at: https://github.com/settings/tokens
- Token needs: `repo` (full control) scope

### Never do this

❌ **Don't put the token in the remote URL:**
```bash
git remote set-url origin https://ghp_xxx@github.com/...  # WRONG
```

❌ **Don't commit `.env` to the repo** (it's gitignored for this reason)

❌ **Don't commit `.git/config` if it has embedded tokens** (it's local-only)

### For CI/CD (GitHub Actions)

GitHub Actions doesn't use this credential helper. Instead:
- Use `${{ secrets.GITHUB_TOKEN }}` in workflows
- Or configure SSH keys for authentication
- The embedded `GITHUB_TOKEN` is only for local development
