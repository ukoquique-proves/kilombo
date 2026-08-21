# Deployment and source editing guide

This note explains how the project is meant to be edited and deployed, and how it differs from editing the original SPIP site on `kilombo.top`.

> **See also:** `docs/MIGRATION.md` (why the mirror exists and how the incremental migration to `kilombo.top` works) and `docs/TROUBLESHOOTING.md` §4 (concrete steps to resolve SSH/port-22 access and the SPIP admin permission blocker). This document focuses on the day-to-day "which workflow do I use" decision; those two cover the underlying infrastructure detail.

## 0) Two separate workflows — clarification

**⚠️ IMPORTANT:** This project supports two completely independent workflows. **Do not confuse them.**

### Workflow A: Edit SPIP content directly (NO SSH REQUIRED)

**What:** Create, edit, and publish articles in the real SPIP backend at `kilombo.top/ecrire/`.

**Prerequisites:** 
- ✅ Web access to SPIP admin panel (already working — verified with `create-article.mjs`)
- ❌ SSH port 22 access (NOT needed for this workflow)

**How:** Use a browser or automation script (e.g., `sandbox/create-article.mjs`) to interact with SPIP forms directly. This edits the live source content.

**Example:** Creating Article ID 87 "FINAL TEST" via `create-article.mjs --create` successfully populated the SPIP dashboard — this is Workflow A.

---

### Workflow B: Deploy the static mirror to production (SSH REQUIRED)

**What:** Copy the curated mirror content from this repository (`site/` folder) to the YunoHost production web root via SSH/rsync.

**Prerequisites:**
- ❌ SSH port 22 open on `kilombo.top` (currently blocked by firewall — this is the blocker)
- ✅ Credentials in `.env` (already configured)

**How:** Run `./sync-to-production.sh` to rsync the `site/` folder to the remote YunoHost server.

**Impact:** This deploys the static mirror portal, not the original SPIP site. The mirror imports and curates content from SPIP; it does not replace the CMS itself.

---

### Which workflow do you need?

| Goal | Workflow | Blocker |
|------|----------|---------|
| Create/edit articles in SPIP at `kilombo.top/ecrire/` | A | None — already working |
| Deploy the static mirror portal to `kilombo.top/` root | B | Port 22 firewall (pending YunoHost admin action) |

---

## 2) What the repo is

This repository is not the original SPIP application. It is a static mirror / portal that reuses and reshapes content from the Kilombo network.

The repo is designed to work like this:

- local work happens in the repo under `site/`
- preview happens via GitHub Pages or a local static server
- live production sync happens through SSH/rsync to the YunoHost host

The live production target is the server configured in `.env`:

- host: `kilombo.top`
- user: `kilombo`
- remote path: `/var/www/kilombo.top`

This is the deployment path expected by the project.

## 3) What the credentials in `.env` are for

The environment file (`KILOMBOTOP_HOST`, `KILOMBOTOP_PORT`, `KILOMBOTOP_USER`, `KILOMBOTOP_PASSWORD`, `KILOMBOTOP_REMOTE_PATH`) contains the credentials used for the production mirror deployment (SSH/rsync/scp to the live site, YunoHost infrastructure operations). They are not the same as the content source credentials for the original SPIP content management backend.

For the full picture of why this deployment path exists and what it depends on (admin permissions already confirmed, the one pending step being port 22), see `docs/MIGRATION.md` §"¿Necesitamos a los administradores del servidor?".

## 4) Intended deployment workflow

The repository expects a two-step workflow:

### Local dev / preview

- edit files in the repository
- preview locally with:

  `python3 -m http.server 8080 --directory site`

or use the preview workflow already documented in the repo.

### Production sync

When the work is ready, the intended command is:

`./sync-to-production.sh`

This script:

- loads `.env`
- validates that the host is reachable on port 22
- validates that either SSH key auth or password auth is available
- does a dry-run first
- then runs rsync to copy the contents of `site/` to the remote path

The script is at [sync-to-production.sh](../sync-to-production.sh).

## 5) Important distinction: mirror vs original SPIP site

The project is deliberately designed as a parallel, static mirror of the real Kilombo content ecosystem.

This means:

- the original source lives on the real Kilombo websites and their SPIP backend
- the repo is a curated mirror / design layer built around imported content
- production sync writes the mirror output to the YunoHost web root, not the source CMS itself

So if you want to edit the original site, that is a different operation than editing the mirror repo.

## 6) Editing the source site directly

If the real goal is to edit the actual original `kilombo.top` content or its SPIP application directly, then you need:

- SSH access to the YunoHost host
- the correct account and privileges
- access to the actual content files or the SPIP application directory
- knowledge of whether the site is being served directly from the app or from a static web root

That is different from the static mirror workflow in this repository.

## 7) When to use this repo vs when to SSH directly

Use this repo when:

- you are changing the mirror design
- you are importing or curating content into the portal
- you want to deploy a static HTML/CSS/JS build

Use direct SSH/server access when:

- you need to modify the original SPIP instance itself
- you need to change server-side hosting config or app files
- you need to access the real root CMS files, not the mirror output

## 8) Check whether port 22 is open

The project expects SSH on port 22 to be accessible; the deployment script will abort if it is not.

For the current status and the concrete options to resolve this (opening the port via the YunoHost panel, running from the server's local network, or using Nextcloud as a temporary file bridge), see `docs/TROUBLESHOOTING.md` §4 "Bloqueo A".

## 9) Recommended next step

The next practical step is:

1. decide whether the target is the mirror repo or the real original SPIP site
2. if it is the mirror repo, update the local design files and run `./sync-to-production.sh`
3. if it is the original site, use SSH and inspect the actual YunoHost/SPIP installation directly

## 10) Command summary

Local preview:

`python3 -m http.server 8080 --directory site`

Production sync:

`./sync-to-production.sh`

End-of-session deploy wrapper:

`./end-of-session.sh`

## 11) Bottom line

**Workflow A (SPIP editing):** Web access to `kilombo.top/ecrire/` is working and verified. You can create and edit articles directly in the SPIP admin panel using `create-article.mjs` or a browser. No SSH required.

**Workflow B (Mirror deployment):** The static mirror deployment via `./sync-to-production.sh` is ready but blocked on port 22 firewall access (pending YunoHost admin action). This deploys the curated portal, not the CMS itself.

Choose the workflow that matches your goal, not the other way around.
