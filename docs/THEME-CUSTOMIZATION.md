# Escal Theme Customization Guide

Complete guide to programmatically change the look and presentation of www.kilombo.top without SSH access.

---

## Overview

The Escal theme on kilombo.top has dozens of configurable presentation elements:

✅ **Text Labels** — Tab titles, section headers, block titles  
✅ **Menu Items** — Navigation labels  
✅ **Block Headers** — Sidebar widget titles  
✅ **Footer Elements** — Copyright text, footer links labels  
✅ **Homepage Elements** — Tab names, featured content headers  

All can be changed programmatically without touching code or theme files.

---

## Two Tools Available

### 1. Discover Fields (`probe-escal-fields.mjs`)

First, discover what fields are available:

```bash
# List all available fields (takes 30-60 seconds)
node scripts/probe-escal-fields.mjs

# Verbose output showing which menu each field is in
node scripts/probe-escal-fields.mjs --verbose

# Export all fields to JSON for reference
node scripts/probe-escal-fields.mjs --export escal-fields.json
```

**Output:** Lists every configurable field with:
- Field name (for use with customize-escal-theme.mjs)
- Type (text, textarea, hidden, etc.)
- Current label/value
- Which menu it appears in

### 2. Customize Fields (`customize-escal-theme.mjs`)

Once you know the field name, change it:

```bash
# ALWAYS dry-run first
node scripts/customize-escal-theme.mjs --field fieldname --value "New Text" --dry-run

# If preview looks good, apply the change
node scripts/customize-escal-theme.mjs --field fieldname --value "New Text"
```

---

## Examples: What You Can Change

### Example 1: Homepage Tab Labels

```bash
# Change "Los últimos artículos" to "Noticias Recientes"
node scripts/customize-escal-theme.mjs --field titreongletderniers --value "Noticias Recientes" --dry-run
node scripts/customize-escal-theme.mjs --field titreongletderniers --value "Noticias Recientes"
```

**Result:** Homepage tab label changes instantly

### Example 2: Sidebar Widget Titles

First discover available sidebar fields:
```bash
node scripts/probe-escal-fields.mjs --verbose
```

Look for fields in the "Configuración de bloques laterales" menu, then:
```bash
node scripts/customize-escal-theme.mjs --field <block_field_name> --value "My New Title"
```

### Example 3: Section Headers

```bash
# Change section titles in various locations
node scripts/customize-escal-theme.mjs --field titrerubrique --value "New Section Name"
```

### Example 4: Footer/Copyright Text

Discover footer fields:
```bash
node scripts/probe-escal-fields.mjs --verbose | grep -i footer
```

Then customize:
```bash
node scripts/customize-escal-theme.mjs --field <footer_field> --value "© 2026 Kilombo"
```

---

## Workflow: Changing the Look

### Step 1: Discover Available Fields

```bash
node scripts/probe-escal-fields.mjs --verbose > escal-fields.txt
```

Review the output to find what fields you want to change.

### Step 2: Dry-Run Each Change

**Always preview before applying:**

```bash
node scripts/customize-escal-theme.mjs --field fieldname --value "New Value" --dry-run
```

This:
- Blocks all network saves (100% safe)
- Shows you what the form looks like
- Takes a screenshot: `escal_update_dryrun.png`
- Doesn't actually change anything

### Step 3: Review the Screenshot

Open `escal_update_dryrun.png` in your image viewer to see the change.

### Step 4: Apply the Change

If it looks good:

```bash
node scripts/customize-escal-theme.mjs --field fieldname --value "New Value"
```

The change is live immediately on www.kilombo.top.

### Step 5: Verify in Browser

Visit https://www.kilombo.top/ and confirm the change appears.

---

## What Fields Are Commonly Customizable

Based on typical Escal theme installations, these categories are usually available:

| Category | What's in It | Examples |
|----------|-------------|----------|
| Homepage | Tab titles, section labels | "Latest Articles", featured content headers |
| Navigation | Menu items | Page links in main navigation |
| Sidebar Blocks | Widget titles | "Recent Posts", "Tags", "Categories" |
| Footer | Copyright, footer links | Copyright text, footer link labels |
| Colors/Layout | (Usually requires CSS, not simple text) | — |
| Fonts | (Usually requires CSS, not simple text) | — |

---

## Troubleshooting

### "Field not found" Error

**Problem:** Script says field doesn't exist

**Solution:**
1. Verify the field name is exact (case-sensitive)
2. Use `probe-escal-fields.mjs` to confirm the field exists
3. Check if field is in a collapsed section (script handles this)

### Login Failed

**Problem:** "Login failed. Check KILOMBOTOP_PASSWORD"

**Solution:**
- Update `.env` with current password
- Test password works: try logging in at https://www.kilombo.top/ecrire/
- If changed, update both .env and in your system

### Change Doesn't Appear on Site

**Problem:** Field was updated but website doesn't show the change

**Solution:**
1. Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)
2. Wait 30 seconds and refresh
3. Check SPIP admin dashboard to verify change was saved
4. Log out and log back in if using session

### HTML/Special Characters

**Problem:** Want to use HTML or special characters

**Solution:**
```bash
# HTML is allowed in most Escal fields
node scripts/customize-escal-theme.mjs --field title --value "Hello <strong>World</strong>"

# Escaping quotes (use single quotes for the whole argument)
node scripts/customize-escal-theme.mjs --field title --value 'Text with "quotes" inside'
```

---

## Important Notes

### Safe Operations

✅ **Safe to do:**
- Change any text label
- Update section titles
- Modify block headers
- Change navigation text

### Risky Operations

⚠️ **Be careful with:**
- Deleting values (leaves fields blank)
- Changing field names (won't work)
- Modifying hidden/system fields

### Permanence

✅ **Changes are permanent** until changed again
✅ **Survive SPIP updates** (usually)
⚠️ **Might reset if** theme is reinstalled

---

## Complete Workflow Example

### Scenario: Rebrand Homepage

You want to change:
- Tab title from "Los últimos artículos" to "Breaking News"
- Footer text from "Powered by SPIP" to "© 2026 Kilombo Project"

**Step 1: Discover fields**
```bash
node scripts/probe-escal-fields.mjs --verbose
```

**Step 2: Find field names**
- Homepage tab field: `titreongletderniers`
- Footer field: `textepied` (example)

**Step 3: Dry-run first change**
```bash
node scripts/customize-escal-theme.mjs --field titreongletderniers --value "Breaking News" --dry-run
```

**Step 4: Review screenshot**
- Check `escal_update_dryrun.png`
- Look good? Proceed to step 5

**Step 5: Apply change**
```bash
node scripts/customize-escal-theme.mjs --field titreongletderniers --value "Breaking News"
```

**Step 6: Dry-run footer change**
```bash
node scripts/customize-escal-theme.mjs --field textepied --value "© 2026 Kilombo Project" --dry-run
```

**Step 7: Apply footer change**
```bash
node scripts/customize-escal-theme.mjs --field textepied --value "© 2026 Kilombo Project"
```

**Step 8: Verify on site**
- Visit https://www.kilombo.top/
- Both changes now live!

---

## Advanced: Find Specific Fields

Need to find a field but don't know its name?

```bash
# Export all fields to searchable JSON
node scripts/probe-escal-fields.mjs --export all-fields.json

# Search for your field by label
grep -i "the text you see" all-fields.json
```

Output shows:
- Field name (what you need for --field)
- Type
- Current value
- Menu it's in

---

## Documentation

- **Field Discovery:** Run `probe-escal-fields.mjs`
- **Implementation:** See `customize-escal-theme.mjs` source code
- **SPIP Escal Theme Docs:** [Escal theme configuration](https://contrib.spip.net/Escal)

---

## Summary

✅ **Discover** what can be changed: `probe-escal-fields.mjs`  
✅ **Preview** changes safely: `--dry-run` flag  
✅ **Apply** changes: `customize-escal-theme.mjs`  
✅ **Verify** on live site immediately  

No SSH access needed. No code knowledge required. Full control over presentation text and labels.
