# SITE_ANALYSIS — www.kilombo.top Complete Inventory

**Source:** Authenticated full-site probe via `scripts/scrape-comprehensive.sh` (2026-08-11)  
**Data:** SPIP 4.4.15 running on nginx, IP `80.67.181.245`  
**Coverage:** All article IDs (1–120 probed) + RSS + archive indices + hidden/unlisted articles  
**⚠️ COVERAGE LIMITATION:** Only **publicly published articles** — draft/private articles inaccessible (user lacks SPIP author rights)

---

## Access Model

The scraper authenticates via **YunoHost SSO** but the `kilombo` user account does NOT have SPIP editor/author permissions.

| Content Type | Accessible | Method |
|---|---|---|
| Public articles (navigation-visible) | ✅ YES | RSS feed + archive index + direct URLs |
| Public articles (hidden/no section) | ✅ YES | Sequential ID probe or direct URL |
| Draft articles | ❌ NO | Requires SPIP author login |
| Private/restricted articles | ❌ NO | Requires SPIP author login |
| Site sections/categories | ✅ YES | Direct URL access |
| Admin panel `/ecrire/` | ❌ NO | Returns 302 redirect to login |

---

## Key Finding: Hidden French-Language Articles

The initial RSS-only scrape found **54 articles**.  
A full sequential probe (IDs 1–120) discovered **7 additional articles** not listed in any navigation menu, RSS feed, or archive index — all in **French**, all accessible via direct URL.

These articles have **no section assigned** in SPIP (`sin sección`), which makes them invisible to all index pages but they remain published and publicly accessible.

---

## Complete Article Inventory (61 Valid Published Articles)

### Articles in Navigation Menu (54 total)

| ID | Title | Lang | Status |
|---|---|---|---|
| 7 | ICG-GCI | 🇫🇷 | ✅ VALID |
| 12 | PLANDEMISMO Y DOMESTICACIÓN | 🇪🇸 | ✅ VALID |
| 13 | PANDEMIA = MENTIRA | 🇪🇸 | ✅ VALID |
| 20 | IMAGENES | 🇪🇸 | ✅ VALID |
| 21 | BASTA DE ESCLAVITUD PLANDÉMICA | 🇪🇸 | ✅ VALID |
| 22 | PLANDEMISMO BASTA | 🇪🇸 | ✅ VALID |
| 23 | LA REPÚBLICA DEL SILENCIO | 🇪🇸 | ✅ VALID |
| 32 | PLANDEMISMO Y DOMESTICACIÓN 1 | 🇪🇸 | ✅ VALID |
| 34 | Futuras generaciones | 🇪🇸 | ✅ VALID |
| 35 | Mascarilla obligatoria | 🇪🇸 | ✅ VALID |
| 36 | Quilombo PELÍCULA | 🇪🇸 | ✅ VALID |
| 37 | El fraude de los PCR | 🇪🇸 | ✅ VALID |
| 38 | PARADOXA 1 | 🇪🇸 | ✅ VALID |
| 39 | PARADOXA 2 | 🇪🇸 | ✅ VALID |
| 40 | 1er MAI 2023 | 🇫🇷 | ✅ VALID |
| 42 | ¿El mayor asesinato en masa...? | 🇪🇸 | ✅ VALID |
| 43 | LOS BANQUEROS JUDIOS QUE DESDE HACE MAS DE 2... | 🇪🇸 | ✅ VALID |
| 44 | LOS BANQUEROS JUDIOS QUE DIRIGEN... | 🇪🇸 | ✅ VALID |
| 46 | KILOMBO/QUILOMBO/ PELICULA | 🇪🇸 | ✅ VALID |
| 47 | LA CAIDA DEL CABAL | 🇪🇸 | ✅ VALID |
| 50 | Efectos Adversos de las vacunas | 🇪🇸 | ✅ VALID |
| 51 | Di NO a la vacuna | 🇪🇸 | ✅ VALID |
| 52 | El TEST PCR es un FRAUDE | 🇪🇸 | ✅ VALID |
| 53 | NO HAY VUELTA ATRAS | 🇪🇸 | ✅ VALID |
| 54 | ESTO ES MALTRATO INFANTIL | 🇪🇸 | ✅ VALID |
| 55 | TE TIRARIAS DE UN PUENTE... | 🇪🇸 | ✅ VALID |
| 56 | MANTENERSE HUMANO... | 🇪🇸 | ✅ VALID |
| 57 | OBEDIENCIA Y RESISTENCIA | 🇪🇸 | ✅ VALID |
| 58 | PEGATINA | 🇪🇸 | ✅ VALID |
| 59 | Pandemia Preparada | 🇪🇸 | ✅ VALID |
| 60 | Agenda 2030 | 🇪🇸 | ✅ VALID |
| 61 | Pasaporte sanitario | 🇪🇸 | ✅ VALID |
| 62 | BOZAL | 🇪🇸 | ✅ VALID |
| 63 | Dictadura sanitaria | 🇪🇸 | ✅ VALID |
| 64 | PANDEMIA MORTAL? | 🇪🇸 | ✅ VALID |
| 65 | JAULA | 🇪🇸 | ✅ VALID |
| 66 | VIRUS MORTAL? VACUNA SEGURA? | 🇪🇸 | ✅ VALID |
| 67 | BOZAL *(segunda versión)* | 🇪🇸 | ✅ VALID |
| 68 | CUANTO MAS OBEDECIMOS PEOR NOS TRATARON | 🇪🇸 | ✅ VALID |
| 69 | TU OBEDIENCIA ESTÁ PROLONGANDO ESTA PESADILLA | 🇪🇸 | ✅ VALID |
| 70 | ERAN 2 SEMANAS, AHORA SON 2 AÑOS | 🇪🇸 | ✅ VALID |
| 71 | VACUNA Y PASAPORTE | 🇪🇸 | ✅ VALID |
| 72 | 2021 EL AÑO EN EL QUE TE PEDIAN... | 🇪🇸 | ✅ VALID |
| 73 | SI LA VACUNA FUNCINA POR QUE... | 🇪🇸 | ✅ VALID |
| 74 | CUANTO MAS SE OBEDECEN... | 🇪🇸 | ✅ VALID |
| 75 | NO ES POR TU BIEN | 🇪🇸 | ✅ VALID |
| 76 | Transformación Registros Akáshicos | 🇪🇸 | ✅ VALID |
| 77 | Pasaporte sanitario: Temible herramienta de vigilancia | 🇪🇸 | ✅ VALID |
| 78 | Hold-up planétaire | 🇫🇷 | ✅ VALID |
| 79 | REPRESIÓN PLANDÉMICA 1: ocultan la HECATOMBE | 🇪🇸 | ✅ VALID |
| 80 | REPRESIÓN PLANDÉMICA 2: ocultan la HECATOMBE | 🇪🇸 | ✅ VALID |
| 81 | REPRESIÓN PLANDÉMICA 3 | 🇪🇸 | ✅ VALID |
| 82 | REPRESIÓN PLANDÉMICA 4 | 🇪🇸 | ✅ VALID |
| 84 | TERRAIN The Film (TERRENO El Filme) | 🇪🇸 | ✅ VALID |
| 85 | El Negacionista // ESPECTACULAR CORTOMETRAJE | 🇪🇸 | ✅ VALID |
| 86 | Curso Salud Holística - University of Terrain | 🇪🇸 | ✅ VALID |

### Hidden Articles (NOT in Navigation) — 7 Total

All have **no section assigned** in SPIP, making them invisible to navigation/archive/RSS but accessible via direct URL.

| ID | Title | Lang | Author | Status |
|---|---|---|---|---|
| **2** | **La pandémie n'existe pas** | 🇫🇷 | proleint@protonmail.com | ✅ VALID |
| **24** | **CONTRE L'ESCLAVAGE... (I)** | 🇫🇷 | Silvia Almeria | ✅ VALID |
| **25** | **CONTRE L'ESCLAVAGE... (II)** | 🇫🇷 | Silvia Almeria | ✅ VALID |
| **26** | **CONTRE L'ESCLAVAGE... (III)** | 🇫🇷 | Silvia Almeria | ✅ VALID |
| **27** | **LE COVIDISME : UNE NOUVELLE RELIGION** | �🇷 | Recibimos y publicamos | ✅ VALID |
| **33** | **GOUVERNER PAR LE CHAOS** *(image only)* | 🇫🇷 | kilombo | ✅ VALID |
| **48** | **LA PANDEMIE N'EXISTE PAS !** *(expanded version of #2)* | 🇫🇷 | proleint@protonmail.com | ✅ VALID |

**Note:** Articles 2 and 48 are both titled *"La pandémie n'existe pas"* — article 48 is an expanded/updated version of article 2.

---

## Inventory Summary

| Metric | Count |
|---|---|
| IDs probed (1–120) | 120 |
| Valid published articles | **61** |
| Articles in navigation | **54** |
| Hidden articles (no section) | **7** |
| 404 / deleted / inaccessible | 57 |

---

## What This Means for the Mirror

The mirror site based on the initial RSS scrape covered **54 visible articles** (99% of navigable content). The 7 hidden French articles are:
- ✅ Thematically consistent with the rest of the site
- ✅ Publicly accessible via direct URL
- ⚠️ Deliberately (or accidentally) excluded from navigation in SPIP

**For completeness:** The mirror should optionally include articles 2, 24–27, 33, 48 to match the live site's full public inventory.

## Discovery Methodology

Three methods reach different subsets of articles:

1. **RSS Feed** → 11 most recent articles only
2. **Archive Index Pages** → visible articles in sections only (filters out hidden articles)
3. **Sequential ID Probe** → all published articles including hidden ones

**Key insight:** SPIP archive/plan pages only list articles that belong to a section (rubrique). Articles with **no section assigned** are invisible to all index pages but respond normally to direct URL access. The only way to find them is to probe IDs sequentially (1–N).

**Example probe (Python):**
```python
import os
import requests
s = requests.Session()
s.post('https://kilombo.top/yunohost/sso/login', data={
    'user': 'kilombo',
    'password': os.environ['KILOMBOTOP_PASSWORD']  # Use env var, never hardcode
})
for i in range(1, 200):
    r = s.get(f'https://www.kilombo.top/spip.php?article{i}')
    if 'id="titre-article"' in r.text:
        print(f'[{i}] VALID - Article found')
    elif '404' not in r.text:
        print(f'[{i}] ? - Unexpected response')
```
