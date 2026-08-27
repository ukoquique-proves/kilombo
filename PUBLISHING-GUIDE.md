# Publishing Articles to Kilombo — Master Guide

**TL;DR:** Choose your path below based on where you want your article to appear.

---

## Quick Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│ I have an article. Where should I publish it?                   │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────┐
  │  OPTION 1: SPIP     │  ← Original CMS at www.kilombo.top
  │  Backend Only       │     Article appears on live website immediately
  └─────────────────────┘     (but NOT on mirror)
          │
          └─→ See: WORKFLOW A (below)


  ┌─────────────────────┐
  │  OPTION 2: Mirror   │  ← GitHub Pages + JSON
  │  Only               │     Article appears on GitHub Pages & mirror root
  └─────────────────────┘     (but NOT in SPIP backend)
          │
          └─→ See: WORKFLOW B (below)


  ┌─────────────────────┐
  │  OPTION 3: BOTH     │  ← Article everywhere
  │  (Recommended)      │     Published to SPIP, mirror, GitHub Pages
  └─────────────────────┘
          │
          └─→ See: WORKFLOW C (below)
```

---

## The Two Systems Explained

### System A: SPIP Backend (`www.kilombo.top/ecrire/`)

**What it is:**
- Original CMS where articles are edited through a web form
- Serves content at `https://www.kilombo.top`
- Requires YunoHost SSO login (user: `kilombo`)

**Pros:**
- WYSIWYG editor
- Live immediately
- Integrated media management
- Native to original site

**Cons:**
- Not version-controlled
- Changes don't automatically sync to mirror
- Requires network access to kilombo.top

**Current status:** ✅ FULLY WORKING (all 4 SPIP instances accessible)

---

### System B: Mirror (`artikulos.json` + GitHub Pages)

**What it is:**
- Static site built from `site/assets/content/articles.json`
- Served from GitHub Pages: `https://ukoquique-proves.github.io/kilombo/`
- Also deployed to mirror root at `kilombo.top` (after port 22 is open)
- Fully version-controlled

**Pros:**
- Version history (git blame, rollback)
- Automated testing/validation
- Visible staging on GitHub Pages
- No SSH required (git push only)

**Cons:**
- More steps to publish
- Requires JSON/HTML knowledge
- Changes are not live-editable (must edit JSON)

**Current status:** ✅ FULLY WORKING (deployed to GitHub Pages automatically)

---

## **WORKFLOW A: Publish to SPIP Backend Only**

### When to use this:
- You want article live immediately on www.kilombo.top
- You don't need version control
- You're comfortable with web forms
- You want WYSIWYG editing

### Steps:

#### Option A1: Use Web Browser (Manual)

1. Open `https://www.kilombo.top/ecrire/`
2. Login with YunoHost SSO (user: `kilombo`, password: from `.env` as `KILOMBOTOP_PASSWORD`)
3. Navigate to article creation form: `?exec=article_edit&new=oui`
4. Fill in:
   - **Titre** (title)
   - **Texte** (body HTML)
   - **Rubrique** (section: choose 1 for top-level or another article ID for subsection)
5. Click "Guardar" (Save)
6. Article is live immediately at `www.kilombo.top`

#### Option A2: Use Automation Script (Recommended)

```bash
cd $LOCAL_KILOMBO_DIR

# Step 1: Preview WITHOUT creating article
node scripts/create-article.mjs \
  --create \
  --title "Your Article Title" \
  --body "<p>Article content here</p>" \
  --dry-run

# Step 2: If preview looks good, run WITHOUT --dry-run to actually create
node scripts/create-article.mjs \
  --create \
  --title "Your Article Title" \
  --body "<p>Article content here</p>"
```

**Parameters:**
- `--title` — Article title (required)
- `--body` — Article body as HTML (required, use `<p>`, `<strong>`, `<em>`, `<blockquote>`, `<h3>`, etc.)
- `--section` — Section/rubrique ID (optional, defaults to 1)
- `--dry-run` — Preview form without any writes (optional)

**Important: `--dry-run` Behavior**

When you use `--dry-run`, the script:
- ✅ Fills in the form fields
- ✅ Takes a screenshot for review
- ❌ **BLOCKS all autosave requests** (network layer)
- ❌ **DOES NOT create article** in SPIP database

This prevents the accidental duplicate-article bug (see issue #89/#88). Safe to run multiple times.

**Result (without --dry-run):**
- Article created with auto-assigned ID
- Status: `prepa` (Draft) — visible in admin only
- To publish publicly: Change status to `publie` in SPIP admin or use:
  ```bash
  node scripts/manage-article-status.mjs --change --id <ID> --status publie
  ```

### Documentation:
- Full details: `docs/SPIP-ACCESS.md`
- Script reference: `scripts/create-article.mjs` (comments in file)

---

## **WORKFLOW B: Publish to Mirror Only**

### When to use this:
- You want version-controlled publishing
- You want to stage on GitHub Pages first
- You prefer git workflow over CMS
- You want automated validation

### Steps:

#### Phase 1: Prepare Article (Editorial)

1. **Get raw article** (plain text or markdown)
   - Source: `nuevos_articulos/` folder
   - Or: Scraped from another site

2. **Create editorial notes**
   ```bash
   cd articulos_en_trabajo/IN_PROGRESS
   touch [slug].md
   ```
   
   Write notes:
   ```markdown
   # Article: Title
   
   ## Source Info
   - **File:** /nuevos_articulos/[filename]
   - **Language:** ES|FR|EN
   - **Section:** tierra|nom|actualidad|gci|pi|general
   
   ## Editorial Approach
   - Fix structure, clarity, redundancy
   - Verify attribution
   
   ## Source Content
   [Paste raw text]
   ```

3. **Rebuild article** with proper formatting
   - Follow `docs/EDITORIAL_GUIDELINES.md`
   - Use HTML tags: `<p>`, `<h3>`, `<h4>`, `<strong>`, `<em>`, `<blockquote>`, `<a>`, `<ul>`, `<li>`
   - Store in `articulos_en_trabajo/IN_PROGRESS/[slug].md`

#### Phase 2: Convert to JSON

Create `articulos_en_trabajo/IN_PROGRESS/[slug].json`:

```json
{
  "id": "article-slug-kebab-case",
  "title": "Capitalized Article Title",
  "date": "YYYY-MM-DD",
  "section": "tierra",
  "topics": ["tag1", "tag2", "tag3"],
  "sourceSite": "Source Name or Author",
  "sourceUrl": "https://example.com/article",
  "status": "pending-review",
  "contentHtml": "<h3>Article Title</h3><p>Content here...</p>",
  "notes": "Editorial notes explaining any changes"
}
```

**Reference:** `docs/SCHEMA_REFERENCE.md` (complete field documentation)

#### Phase 3: Validate

```bash
cd $LOCAL_KILOMBO_DIR
npm test
```

**Expected:** All tests pass (157/157 for full suite)

If validation fails: Read error message, fix JSON, re-run `npm test`

#### Phase 4: Move to READY

```bash
cd articulos_en_trabajo
mv IN_PROGRESS/[slug].json READY/[slug].json
```

#### Phase 5: Merge & Deploy

```bash
cd $LOCAL_KILOMBO_DIR

# Add article to articles.json (manual or script)
# Then commit:
git add site/assets/content/articles.json
git commit -m "feat: Add article '[slug]' to mirror"
git push origin main
```

**Result:**
- Article in `site/assets/content/articles.json`
- Pushed to GitHub main branch
- GitHub Actions auto-deploys in ~30 seconds
- Article appears at: `https://ukoquique-proves.github.io/kilombo/articulos.html?section=[section]`

### Documentation:
- Full details: `docs/ARTICLE-PUBLISHING-WORKFLOW.md`
- Editorial guidelines: `docs/EDITORIAL_GUIDELINES.md`
- Schema reference: `docs/SCHEMA_REFERENCE.md`
- Quick start: `articulos_en_trabajo/QUICK_START.md`

---

## **WORKFLOW C: Publish to BOTH (Recommended)**

### When to use this:
- You want the article everywhere (SPIP + mirror + GitHub)
- You want version history AND live editorial updates
- You want maximum reach

### Steps:

#### Step 1: Publish to Mirror (use WORKFLOW B)

Create JSON in `articulos_en_trabajo/IN_PROGRESS/[slug].json`, validate, move to READY/, merge, commit, push to GitHub main.

**Result on GitHub Pages:** Article live at https://ukoquique-proves.github.io/kilombo/articulos.html

#### Step 2: Migrate to SPIP (use the migration system)

**Two modes available:**

**Mode A: Submit to Review (Moderation Queue)**
Creates article in draft status for editorial review:

```bash
# Submit to moderation queue (default - safest)
node scripts/migrate-to-spip.mjs --article-id [article-slug]
```

**Result:** Article appears in SPIP admin dashboard
- Status: "En curso de redacción" (draft)
- NOT visible to public
- Editor/admin reviews and can publish manually
- Provides editorial control

**Mode B: Direct Publication (Live)**
Creates article and immediately publishes it:

```bash
# Requires explicit approval environment variable (security measure)
KILO_APPROVE_PUBLISHING=true node scripts/migrate-to-spip.mjs --article-id [article-slug] --publish
```

**Result:** Article is live
- Status: "Publicado" (published)
- Visible at `www.kilombo.top/spip.php?article<ID>`
- Requires `KILO_APPROVE_PUBLISHING=true` environment variable
- Security measure to prevent accidental direct publication
- Public access immediately
- Use for pre-approved or trusted content

**Always test first:**
```bash
# Dry-run preview (safe - no changes)
node scripts/migrate-to-spip.mjs --article-id [article-slug] --dry-run
```

**Choose your workflow:**
- **Collaborative/Editorial** → Use Mode A (default) for team review
- **Trusted/Pre-approved** → Use Mode B with `--publish` flag
- **Workflow:**
  1. Always use `--dry-run` first to preview
  2. Use Mode A (default) to submit for review
  3. Admin/editor reviews in SPIP dashboard
  4. Admin publishes when approved
  
  OR if trusted:
  1. Preview with `--dry-run`
  2. Use Mode B with `--publish` to go live immediately

For detailed options and troubleshooting, see `docs/MIGRATION-WORKFLOW.md`.

#### Step 3: Check & Approve Draft Articles

If you used Mode A (draft), editors must approve articles before they go live:

```bash
# List all draft articles awaiting approval
node scripts/list-draft-articles.mjs --all

# View specific article status and available actions
node scripts/manage-article-status.mjs --inspect --id <ARTICLE_ID>

# Publish a draft article (approve it)
node scripts/manage-article-status.mjs --change --id <ARTICLE_ID> --status publie

# Or move to trash if rejecting
node scripts/manage-article-status.mjs --change --id <ARTICLE_ID> --status poubelle
```

**Article Status Codes:**
- `prepa` — "En curso de redacción" (Draft — awaiting approval)
- `publie` — "Publicado" (Published — live on site)
- `refuse` — "Rechazado" (Rejected)
- `poubelle` — "A la papelera" (Trash — hidden but recoverable)

#### Step 4: End-of-Session Deploy

When you're finished working:

```bash
cd $LOCAL_KILOMBO_DIR
./end-of-session.sh
```

**This script:**
1. Checks for uncommitted changes
2. Pushes to GitHub main (if any new commits)
3. Attempts SSH deploy to `kilombo.top` via rsync (if port 22 is open)
4. Reports success/failure

**Result:**
- Article on SPIP at `www.kilombo.top` ✅
- Article on GitHub Pages ✅
- Article on mirror at `kilombo.top` root (if port 22 open) ✅

### Documentation:
- Combine `WORKFLOW A` and `WORKFLOW B`
- End-of-session: `end-of-session.sh` (comments in file)
- Article management: `docs/VIEWING-DRAFT-ARTICLES.md`

---

## **Important Fix: The `--dry-run` Bug (Now Resolved)**

### What was the problem?

Previously, the script allowed article creation during `--dry-run`, leading to duplicate articles in SPIP. 

**Example:** Running the same command twice with `--dry-run` on the second run would:
1. First run: Fill form, autosave fires → Article #88 created
2. Second run (with `--dry-run`): Same thing → Article #89 created (duplicate)

This happened because SPIP's backend autosaves on field blur (not on a single save button), so filling the form itself triggers database writes.

### How is it fixed now?

**Version 360396e (Aug 22, 2026):** Added network-level blocking:

When you use `--dry-run`, the script now:
- ✅ Fills the form fields (so you can see the result)
- ✅ Takes a screenshot for preview
- ❌ **Blocks all POST requests** at the network layer (prevents autosave)
- ❌ **Guarantees no database writes** (technically safe to run multiple times)

**You can now safely use `--dry-run` to preview without any side effects.**

### Why does this matter for publishing?

This prevents the workflow from creating unwanted duplicate articles during testing or if you need to re-run a command. It makes the publishing process more reliable and less error-prone.

---



### Publishing Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/migrate-to-spip.mjs` | Migrate articles from JSON to SPIP | `node scripts/migrate-to-spip.mjs --article-id [slug]` or `--publish` |
| `scripts/create-article.mjs` | Low-level SPIP article creation | `node scripts/create-article.mjs --create --title "..." --body "..."` |
| `scripts/manage-article-status.mjs` | Low-level SPIP status change | `node scripts/manage-article-status.mjs --change --id <N> --status publie` |
| `end-of-session.sh` | Deploy to both systems | `./end-of-session.sh` |
| `sync-to-production.sh` | Deploy mirror to kilombo.top | `./sync-to-production.sh` (called by end-of-session.sh) |

### Validation Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `npm test` | Validate JSON, HTML, URLs | `npm test` |
| `npm run preview` | Local preview server | `npm run preview` (opens http://localhost:8080) |
| `npm run lint` | Check code style | `npm run lint` |

---

## Important Notes

### The Two Systems are Independent

- Updating SPIP does NOT automatically update the mirror
- Updating the mirror does NOT update SPIP
- They serve different purposes:
  - **SPIP:** Live editorial site with direct publishing
  - **Mirror:** Versioned, tested, staged content

### Actual Article Flow (Current)

```
/nuevos_articulos/ (raw sources)
       ↓
Prepare in IN_PROGRESS/ (editorial)
       ↓
Convert to JSON
       ↓
READY/ (validated)
       ↓
Either:
  A) Create in SPIP manually → Live on www.kilombo.top
  B) Merge to articles.json → Live on GitHub Pages → (optional) deploy to kilombo.top root
```

### Environment Variables

All paths use `LOCAL_*` environment variables from `.env`:
- `$LOCAL_KILOMBO_DIR` — Main repo directory
- `$LOCAL_ARTICLES_JSON` — Path to articles.json
- `$LOCAL_ARTICULOS_READY` — Path to READY folder

When in doubt, check `.env` for correct paths instead of hardcoding.

### SSH/Port 22 Requirements

- **NOT required** for SPIP editing (uses web browser + SSO)
- **NOT required** for mirror editing (uses git)
- **ONLY required** for `sync-to-production.sh` (rsync to kilombo.top root)
  - To enable: https://kilombo.top/yunohost/admin/ → Herramientas → Firewall → TCP 22
  - Optional — mirror still works on GitHub Pages without it

---

## Troubleshooting

### "Which system should I use?"
- Use **WORKFLOW A** if you want live immediately and don't need version control
- Use **WORKFLOW B** if you want testing/staging before going live
- Use **WORKFLOW C** if you want everything

### "Article shows up in SPIP but not on mirror"
- They're independent — you need to manually add to `articles.json` for mirror
- Or use WORKFLOW C to do both

### "JSON validation fails"
- Read the error message carefully — usually a missing comma, bad HTML tag, or wrong field type
- Check `docs/SCHEMA_REFERENCE.md` for field definitions
- Run `npm test` to see detailed errors

### "Script not found"
- Check environment is set up: `source .env`
- Verify you're in the correct directory: `pwd` should show `.../KILOMBO-BUILD/KILOMBO`
- Use `$LOCAL_KLIMOMB_DIR` instead of hardcoded paths

### "Port 22 is closed"
- This only matters for `sync-to-production.sh` (mirror rsync deploy)
- Mirror still works on GitHub Pages without it
- To open: YunoHost admin panel → Firewall settings
- SPIP editing doesn't need SSH at all

---

## Quick Reference for Next Time

**"I want to publish article X"**

1. **Is it ready to edit?** → Use WORKFLOW A or B
2. **Use WORKFLOW A** if you want SPIP + web form
3. **Use WORKFLOW B** if you want mirror + JSON + version control
4. **Use WORKFLOW C** if you want both everywhere
5. **End of session?** → Run `./end-of-session.sh`

---

## Files to Read

- **Overview:** This file (PUBLISHING-GUIDE.md)
- **SPIP details:** `docs/SPIP-ACCESS.md`
- **Mirror details:** `docs/ARTICLE-PUBLISHING-WORKFLOW.md`
- **Architecture:** `docs/MIGRATION.md`
- **Troubleshooting:** `docs/TROUBLESHOOTING.md`

---

**Last Updated:** 2026-08-22  
**Status:** ✅ Master publishing guide created  
**Next Update:** When new publishing methods are added

