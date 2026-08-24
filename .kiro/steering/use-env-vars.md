# CRITICAL: Always Use Environment Variables for Paths

## Rule
**NEVER hardcode `/root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/KILOMBO` in any command or file path.**

Instead, use the environment variables defined in `.env`:

```bash
source .env  # Always source .env first
cd "$LOCAL_KILOMBO_DIR"  # ← USE THIS ONE
```

## Available Variables (from .env)
- `$LOCAL_WORKSPACE_ROOT` = `/root/JOB-sda2/KILOMBO-SITE`
- `$LOCAL_KILOMBO_BUILD` = `/root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD`
- `$LOCAL_KILOMBO_DIR` = `/root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/KILOMBO` ← **USE THIS ONE**
- `$LOCAL_ARTICLES_JSON` = `$LOCAL_KILOMBO_DIR/site/assets/content/articles.json`
- `$LOCAL_ARTICULOS_READY` = `/root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/articulos_en_trabajo/READY`

## Examples

### ❌ WRONG
```bash
sed -n '645,650p' /root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/KILOMBO/scripts/validate-data.mjs
grep -n "pattern" /root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/KILOMBO/file.txt
cd /root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD/KILOMBO
```

### ✅ CORRECT
```bash
cd /root/JOB-sda2/KILOMBO-SITE/KILOMBO-BUILD && source KILOMBO/.env
sed -n '645,650p' "$LOCAL_KILOMBO_DIR/scripts/validate-data.mjs"
grep -n "pattern" "$LOCAL_KILOMBO_DIR/file.txt"
cd "$LOCAL_KILOMBO_DIR"
```

## Why This Matters
1. **Typo Prevention**: KILOMBO typos are easy - using env var prevents them
2. **Portability**: If workspace moves, only .env needs updating
3. **Documentation**: Project explicitly recommends env vars (see .env header)
4. **Consistency**: All scripts in the project use these vars

## Implementation
Before ANY command that references the project directory:
1. Source the .env file: `source .env` or `source /path/to/.env`
2. Use `$LOCAL_KILOMBO_DIR` instead of hardcoded paths
3. Do NOT mix hardcoded paths with variables in the same command

---

## Hook Enforcement

**A PreToolUse hook is now active** (`.kiro/hooks/enforce-env-vars-paths.json`):
- Monitors all file operations (execute_bash, read_file, list_directory, fs_write, str_replace)
- Blocks commands with hardcoded paths containing workspace directories
- Asks for confirmation if hardcoded path detected
- Activates on next session start

**If you see a permission prompt asking to confirm hardcoded paths**: That's the hook working. Deny it and rewrite the command using env vars.

---

**Last Updated**: 2026-08-22 (v3 - corrected all KLIMBO→KILOMBO)  
**Status**: CRITICAL - Hook enforcement now active  
**Hook File**: `.kiro/hooks/enforce-env-vars-paths.json`
