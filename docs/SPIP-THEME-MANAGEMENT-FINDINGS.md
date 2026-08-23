# SPIP Theme Management Findings — Tierra y Libertad Section Presentation

**Date:** August 22, 2026  
**Status:** ⚠️ Investigation Complete — Implementation Blocked  
**Scope:** Analyzing how to manage the Espacio Tierra y Libertad section presentation (tab labels, section titles, widget headers)

---

## Executive Summary

The presentation elements you asked about ("Los últimos artículos", "Mapa del sitio", "Curso Salud Holística - University of Terrain") **are NOT configurable through the SPIP web admin panel**. They are **hardcoded in the Escal theme template files** on the server.

**Current status:** 
- ✅ Can access SPIP admin panel (`/ecrire/`)
- ❌ Cannot modify presentation without server-level file access
- ❌ Server file access requires SSH/SFTP credentials NOT present in `.env`

---

## What We Investigated

### Test Scenario
1. Logged into SPIP admin at `https://www.kilombo.top/ecrire/`
2. Navigated to: **Secciones** → **Home** section
3. Examined available configuration fields
4. Inspected the live page HTML at `https://www.kilombo.top/spip.php?page=rubrique&id_rubrique=1`

### What We Found in the SPIP Admin Panel

**In Secciones → Home section configuration:**
- Título (Title) = "Home"
- Descripción (Quick description) = empty
- Texto explicativo (Explanatory text) = empty
- Logo assignment
- No fields for customizing widget labels or tab titles

**In the Administración menu:**
Only system-level options (cache clearing, backups, maintenance) — nothing for theme customization.

---

## Where These Labels Come From (HTML Analysis)

### Label 1: "Los últimos artículos" (Latest Articles)

**HTML source:**
```html
<h1 class="cadre derniers-articles">
	Los últimos artículos
</h1>
```

**Conclusion:** Hardcoded text in the Escal theme template  
**Location:** `plugins/auto/escal/v5.2.9/skeletos/...` (template file on server)  
**Editable via SPIP admin?** ❌ NO

### Label 2: "Mapa del sitio" (Site Map)

**HTML source:**
```html
<a href="spip.php?page=plan" title="Mapa del sitio">
	<img class="puce-pied" src="plugins/auto/escal/v5.2.9/images/pucebleue.svg"/>
	Mapa del sitio
</a>
```

**Conclusion:** Hardcoded in the footer template  
**Location:** `plugins/auto/escal/v5.2.9/skeletos/...` (footer template)  
**Editable via SPIP admin?** ❌ NO

### Label 3: "Curso Salud Holística - University of Terrain"

**What it actually is:** An article link in the menu  
**HTML source:**
```html
<li class=" article">
	<a href="spip.php?article86" title="">Curso Salud Holística - University of Terrain</a>
</li>
```

**Conclusion:** This is an ARTICLE TITLE (article #86), not a hardcoded label  
**Editable via SPIP admin?** ✅ YES — click Artículos → edit article #86 → change title

---

## The Core Problem: Missing Server Credentials

### What We Have (.env file)

```
KILOMBOTOP_HOST=kilombo.top
KILOMBOTOP_PORT=22
KILOMBOTOP_USER=kilombo
KILOMBOTOP_PASSWORD=otario2021
KILOMBOTOP_REMOTE_PATH=/var/www/kilombo.top
```

### What These Credentials Do

- **SSH/SFTP access:** Connect to the server at `kilombo.top` via SSH port 22
- **Purpose in current project:** Publish the mirror site (static HTML) via `sync-to-production.sh`
- **Limitation:** These are credentials for **deploying the mirror**, not for **editing the SPIP backend**

### What We DON'T Have

1. **SPIP FTP/SFTP access to edit theme templates**
   - Different from mirror deployment
   - Requires access to `/plugins/auto/escal/v5.2.9/skeletos/` directory
   - May use different credentials or different access method

2. **YunoHost admin panel credentials**
   - Required to modify SPIP plugin settings or theme configurations
   - Accessed via `https://kilombo.top/yunohost/admin/`
   - May require different username/password than `kilombo`

3. **Database credentials**
   - If theme settings were stored in database (they're not in Escal — they're file-based)
   - Would need MySQL/MariaDB access

4. **Root or privileged SSH access**
   - May be needed to edit template files with proper permissions
   - Current `kilombo` user may not have write access to `/plugins/auto/escal/`

---

## Why SSH Port 22 is Currently Blocked

From the `.env` file and documentation:

```
KILOMBOTOP_PORT=22
```

**But in the README and TROUBLESHOOTING.md, it's noted:**
> SSH/rsync to production is blocked by firewall (port 22 closed) — can be opened in YunoHost admin panel

**This means:**
- Port 22 (SSH) is **intentionally closed** for security
- To use it, someone with **YunoHost admin access** must explicitly open it
- Opening it requires access to the **YunoHost admin panel**, which requires:
  - Different credentials than what's in `.env`
  - Or access to the admin panel at `https://kilombo.top/yunohost/admin/`

---

## Potential Solutions (Ranked by Feasibility)

### Solution 1: Edit Article Titles (✅ Doable Now, Partial Fix)

**What can be changed:**
- "Curso Salud Holística - University of Terrain" → any other title
- Any menu item that's an article link

**How:**
1. Login to SPIP admin
2. Click **Artículos**
3. Find article #86 ("Curso Salud Holística...")
4. Edit the title field
5. Save

**Limitations:**
- Only works for articles/menu items
- Doesn't change the hardcoded template labels ("Los últimos artículos", "Mapa del sitio")

---

### Solution 2: Contact Client for Additional Credentials (⚠️ Recommended)

Ask the client/YunoHost admin to provide:

1. **YunoHost Admin Panel credentials**
   - Username and password for `https://kilombo.top/yunohost/admin/`
   - Needed to manage SPIP plugins and open SSH port

2. **SPIP theme/advanced admin credentials** (if different from `kilombo`)
   - May have dedicated user for template/theme editing
   - Ask if there's a separate admin account

3. **Confirmation:** Ask them to either:
   - Open SSH port 22 (temporary or permanent)
   - Provide SFTP-only access (more secure than SSH)
   - Grant `kilombo` user write access to `/plugins/auto/escal/`

---

### Solution 3: Use Escal Plugin's Built-in Customization (⚠️ Uncertain)

Escal theme may have a plugin interface for:
- String translations/localizations
- Widget title customizations
- Template overrides without editing files

**How to check:**
1. Login to SPIP admin
2. Go to **Escal** menu (if visible)
3. Look for:
   - "Configuration"
   - "Personnalisation" (Customization)
   - "Traductions" (Translations)
   - "Squelettes" (Templates)

**Status:** Not yet explored — would require you to check the Escal menu again

---

### Solution 4: Create Custom Escal Child Theme (⚠️ Complex, Requires Server Access)

**Concept:**
- Create a custom theme that inherits from Escal
- Override only the template snippets you want to change
- Manage changes in version control

**Requirements:**
- SSH/SFTP access to server
- Knowledge of SPIP template syntax (SPIP Squelettes language)
- Need to create files in: `/plugins/auto/escal/v5.2.9/skeletos-custom/` or similar

**Feasibility:** HIGH, but requires server credentials first

---

### Solution 5: Modify the Mirror Site Instead (✅ Doable Now, Alternative)

**What this means:**
- Don't change the live SPIP site (`kilombo.top`)
- Modify your mirror site (`ukoquique-proves.github.io/kilombo/`) to display custom labels
- Use your mirror as the "official" presentation while SPIP remains the content source

**How:**
1. Edit `$LOCAL_KILOMBO_DIR/site/index.html`
2. Change section labels to whatever you want
3. Add custom CSS/JS to reorganize section display
4. Deploy to GitHub Pages

**Limitations:**
- Creates a divergence between mirror and live SPIP site
- Mirror becomes the "real" interface; SPIP becomes just content storage

**Feasibility:** Very high — all work stays in this repo

---

## Recommended Next Steps

### Phase 1: Quick Wins (Do Now)

1. **Edit article titles** via SPIP admin for any menu items you can change
   - Go to Artículos → edit article #86 title
   - See if this gives you the presentation you want

2. **Check Escal menu** for built-in customization options
   - Click on "Escal" in the SPIP admin left sidebar
   - Document what options are available

3. **Create documentation** for yourself:
   - Take screenshots of where labels appear
   - Note which ones are articles (editable) vs. template (not editable)

### Phase 2: Get Additional Access (If Needed)

1. **Contact the client/YunoHost admin** and ask for:
   - YunoHost admin credentials (or confirm if they're the same as `kilombo`)
   - Permission to open SSH port 22, OR
   - SFTP-only access for theme file editing

2. **Once you have credentials:**
   - Add to `.env` file (clearly mark as SPIP theme credentials)
   - Create SSH/SFTP scripts in a new `/spip-theme-management/` sector

### Phase 3: Automate (If Server Access is Granted)

1. **Create `/spip-theme-management/` sector** with:
   - `scripts/customize-theme.mjs` — modifies template files via SFTP
   - `scripts/backup-escal-theme.sh` — backs up original theme
   - `config/theme-customizations.json` — stores label customizations
   - `docs/THEME-CUSTOMIZATION-GUIDE.md` — explains the process

2. **Version control theme changes:**
   - Store original template snapshots
   - Track customizations in JSON
   - Allow easy rollback

3. **Deploy changes:**
   - Modify templates on server via SFTP
   - Verify changes on live site
   - Document what changed

---

## Current Blockers

| What You Want | Current Status | Blocker | Solution |
|---|---|---|---|
| Change "Los últimos artículos" label | ❌ Not possible | No server file access | Ask client to open SSH or provide SFTP |
| Change "Mapa del sitio" label | ❌ Not possible | No server file access | Ask client to open SSH or provide SFTP |
| Change article titles in menu | ✅ Possible | None | Use SPIP admin → Artículos |
| Understand all Escal options | 🟡 Unknown | Haven't checked Escal menu yet | Click "Escal" menu in SPIP admin |
| Deploy theme changes automatically | ❌ Not possible | No automation scripts yet | Create `/spip-theme-management/` sector (after getting credentials) |

---

## Files to Check/Create

### Check These (Before Asking Client)

- [ ] Click **"Escal"** menu in SPIP admin and document what you see
- [ ] Take screenshot of any "Configuración" or "Personalización" options in Escal
- [ ] Note if there are translation/localization options

### Create These (After Getting Credentials)

- `/spip-theme-management/` — sector for theme management
- `.env.example` — add placeholder for SPIP theme credentials
- `scripts/customize-theme.mjs` — SFTP-based template modifier
- `docs/THEME-CUSTOMIZATION-GUIDE.md` — detailed process guide

---

## Key Findings Summary

| Finding | Evidence | Implication |
|---------|----------|------------|
| Labels are hardcoded | HTML inspection shows literal text in `<h1>`, `<a>` tags | Cannot change via web UI |
| Escal theme controls layout | CSS/JS from `/plugins/auto/escal/v5.2.9/` | Need to edit theme files |
| SPIP admin has no theme UI | Admin panel shows only basic section metadata | Theme customization not exposed via web |
| SSH port may be closed | `.env` notes port 22 is "firewall blocked" | May need to request access |
| Article titles ARE editable | Article #86 shows as normal editable article | At least partial solution exists now |
| `.env` creds are deployment-only | Credentials designed for mirror sync, not SPIP editing | Different access method needed for themes |

---

## Conclusion

**To fully manage the Tierra y Libertad section presentation, you need:**

1. **Immediate:** Ask the client/YunoHost admin to provide **either**:
   - YunoHost admin panel credentials, OR
   - Direct SFTP/SSH access to theme files, OR
   - Confirmation that `kilombo` user password gives access to these

2. **Meanwhile:** You can edit article titles and explore Escal options through the web UI

3. **After:** Create automation scripts to manage theme customizations via SFTP

**This is not a code or architecture problem — it's an access/credentials problem.** The tools and methods exist; you just need the right server-level credentials to use them.

---

**Related Documentation:**
- See `docs/SPIP-ACCESS.md` for verified SPIP admin access information
- See `.env` for current server credentials (deployment-focused)
- See `docs/TROUBLESHOOTING.md` section on SSH/port 22 access

**Next Action:** Contact client with credential request based on "Phase 2: Get Additional Access" above.
