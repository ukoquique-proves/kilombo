# SITE_ANALYSIS_FULL — Complete www.kilombo.top Inventory

**Source:** Authenticated probe of IDs 1–120 via YunoHost SSO session (2026-08-11)  
**Coverage:** All article archives + RSS + sections + hidden/unlisted articles  
**Method:** Sequential probe of all article IDs + YunoHost SSO authentication  
**⚠️ LIMITATION:** Only publicly accessible articles — SPIP draft/private articles still inaccessible (user lacks SPIP author rights)

---

## Access Model

The scraper authenticates via YunoHost SSO credentials but the `kilombo` user does NOT have SPIP editor permissions.

**What can be scraped:**
- ✅ All public/published articles (54 found)
- ✅ All public sections (6 found)
- ✅ RSS feed (11 recent articles)
- ✅ Archive index pages (2023-2025)

**What CANNOT be scraped:**
- ❌ Draft articles (require SPIP author login)
- ❌ Private/restricted articles (require SPIP author login)  
- ❌ Admin panel `/ecrire/` (returns 302 redirect)
- ❌ Any content only visible to editors/admins

**Implication:** The inventory of 54 articles is **complete for public content** but **unknown drafts may exist** that only admins can see.

---

## Key Finding: Hidden French-Language Articles

The initial scrape (via RSS + archive index) found **56 article IDs**.  
Authenticated probe of IDs 1–120 found **7 additional articles** not listed in the navigation, RSS, or archive index pages — all in **French**, all accessible via direct URL.

### Articles NOT in Documentation (found via authenticated probe)

| ID | Title | Author | Language | Media |
|---|---|---|---|---|
| 2 | La pandémie n'existe pas | proleint@protonmail.com | 🇫🇷 FR | Texto |
| 24 | CONTRE L'ESCLAVAGE ET LA FAUSSE CRITIQUE DU CAPITALISME EN GÉNÉRAL (I) | Silvia Almeria | 🇫🇷 FR | Texto |
| 25 | CONTRE L'ESCLAVAGE ET LA FAUSSE CRITIQUE DU CAPITALISME EN GÉNÉRAL (II) | Silvia Almeria | 🇫🇷 FR | Texto |
| 26 | CONTRE L'ESCLAVAGE ET LA FAUSSE CRITIQUE DU CAPITALISME EN GENÉRAL (III) | Silvia Almeria | 🇫🇷 FR | Texto |
| 27 | LE COVIDISME : UNE NOUVELLE RELIGION | Recibimos y publicamos | 🇫🇷 FR | Texto |
| 33 | GOUVERNER PAR LE CHAOS | kilombo | 🇫🇷 FR | 🖼 Imagen |
| 48 | LA PANDEMIE N'EXISTE PAS ! | proleint@protonmail.com | 🇫🇷 FR | Texto |

**Why they were hidden:** these articles have no section assigned ("sin sección") in SPIP, so they don't appear in any rubrique index, the site plan page, or the archive year pages. They are only reachable via direct URL. The probe confirms they respond HTTP 200 and contain real article content — they are published, not drafts.

**Note on articles 2 and 48:** Both are titled *"La pandémie n'existe pas"* and share the same author (`proleint@protonmail.com`). Article 2 is an older version; article 48 is an expanded/updated repost of the same text with additional content.

---

## Complete Article Catalog (63 Valid Articles)

**Method:** IDs 1–120 probed individually with authenticated session. IDs not responding with article content (404, redirect to home) are marked ❌.

| ID | Title | Lang | Status | Visible in menu |
|---|---|---|---|---|
| 2 | La pandémie n'existe pas | 🇫🇷 | ✅ VALID | ❌ Hidden (no section) |
| 7 | ICG-GCI | 🇫🇷 | ✅ VALID | ✅ Menu |
| 12 | PLANDEMISMO Y DOMESTICACIÓN | 🇪🇸 | ✅ VALID | ✅ Menu |
| 13 | PANDEMIA = MENTIRA | 🇪🇸 | ✅ VALID | ✅ Menu |
| 20 | IMAGENES | 🇪🇸 | ✅ VALID | ✅ Menu |
| 21 | BASTA DE ESCLAVITUD PLANDÉMICA | 🇪🇸 | ✅ VALID | ✅ Menu |
| 22 | PLANDEMISMO BASTA | 🇪🇸 | ✅ VALID | ✅ Menu |
| 23 | LA REPÚBLICA DEL SILENCIO | 🇪🇸 | ✅ VALID | ✅ Menu |
| **24** | **CONTRE L'ESCLAVAGE... (I)** — *par Silvia Almeria* | 🇫🇷 | **✅ VALID** | **❌ Hidden (no section)** |
| **25** | **CONTRE L'ESCLAVAGE... (II)** — *par Silvia Almeria* | 🇫🇷 | **✅ VALID** | **❌ Hidden (no section)** |
| **26** | **CONTRE L'ESCLAVAGE... (III)** — *par Silvia Almeria* | 🇫🇷 | **✅ VALID** | **❌ Hidden (no section)** |
| **27** | **LE COVIDISME : UNE NOUVELLE RELIGION** | 🇫🇷 | **✅ VALID** | **❌ Hidden (no section)** |
| 32 | PLANDEMISMO Y DOMESTICACIÓN 1 | 🇪🇸 | ✅ VALID | ✅ Menu |
| **33** | **GOUVERNER PAR LE CHAOS** *(imagen, sin texto)* | 🇫🇷 | **✅ VALID** | **❌ Hidden (no section)** |
| 34 | Futuras generaciones | 🇪🇸 | ✅ VALID | ✅ Menu |
| 35 | Mascarilla obligatoria | 🇪🇸 | ✅ VALID | ✅ Menu |
| 36 | Quilombo PELÍCULA | 🇪🇸 | ✅ VALID | ✅ Menu |
| 37 | El fraude de los PCR | 🇪🇸 | ✅ VALID | ✅ Menu |
| 38 | PARADOXA 1 | 🇪🇸 | ✅ VALID | ✅ Menu |
| 39 | PARADOXA 2 | 🇪🇸 | ✅ VALID | ✅ Menu |
| 40 | 1er MAI 2023 | 🇫🇷 | ✅ VALID | ✅ Menu |
| 42 | ¿El mayor asesinato en masa...? | 🇪🇸 | ✅ VALID | ✅ Menu |
| 43 | LOS BANQUEROS JUDIOS QUE DESDE HACE MAS DE 2... | 🇪🇸 | ✅ VALID | ✅ Menu |
| 44 | LOS BANQUEROS JUDIOS QUE DIRIGEN EL CAPITALISMO MUNDIAL... | 🇪🇸 | ✅ VALID | ✅ Menu |
| 46 | KILOMBO/QUILOMBO/ PELICULA | 🇪🇸 | ✅ VALID | ✅ Menu |
| 47 | LA CAIDA DEL CABAL | 🇪🇸 | ✅ VALID | ✅ Menu |
| **48** | **LA PANDEMIE N'EXISTE PAS !** *(versión ampliada del art. 2)* | 🇫🇷 | **✅ VALID** | **❌ Hidden (no section)** |
| 50 | Efectos Adversos de las vacunas | 🇪🇸 | ✅ VALID | ✅ Menu |
| 51 | Di NO a la vacuna | 🇪🇸 | ✅ VALID | ✅ Menu |
| 52 | El TEST PCR es un FRAUDE | 🇪🇸 | ✅ VALID | ✅ Menu |
| 53 | NO HAY VUELTA ATRAS | 🇪🇸 | ✅ VALID | ✅ Menu |
| 54 | ESTO ES MALTRATO INFANTIL | 🇪🇸 | ✅ VALID | ✅ Menu |
| 55 | TE TIRARIAS DE UN PUENTE SI EL GOBIERNO TE DICE QUE LO HAGAS | 🇪🇸 | ✅ VALID | ✅ Menu |
| 56 | MANTENERSE HUMANO ES MAS IMPORTANTE QUE VIVIR CON MIEDO | 🇪🇸 | ✅ VALID | ✅ Menu |
| 57 | OBEDIENCIA Y RESISTENCIA | 🇪🇸 | ✅ VALID | ✅ Menu |
| 58 | PEGATINA | 🇪🇸 | ✅ VALID | ✅ Menu |
| 59 | Pandemia Preparada | 🇪🇸 | ✅ VALID | ✅ Menu |
| 60 | Agenda 2030 | 🇪🇸 | ✅ VALID | ✅ Menu |
| 61 | Pasaporte sanitario | 🇪🇸 | ✅ VALID | ✅ Menu |
| 62 | BOZAL | 🇪🇸 | ✅ VALID | ✅ Plan |
| 63 | Dictadura sanitaria | 🇪🇸 | ✅ VALID | ✅ Menu |
| 64 | PANDEMIA MORTAL? | 🇪🇸 | ✅ VALID | ✅ Menu |
| 65 | JAULA | 🇪🇸 | ✅ VALID | ✅ Plan |
| 66 | VIRUS MORTAL? VACUNA SEGURA? | 🇪🇸 | ✅ VALID | ✅ Menu |
| 67 | BOZAL *(segunda versión)* | 🇪🇸 | ✅ VALID | ✅ Plan |
| 68 | CUANTO MAS OBEDECIMOS PEOR NOS TRATARON | 🇪🇸 | ✅ VALID | ✅ Menu |
| 69 | TU OBEDIENCIA ESTÁ PROLONGANDO ESTA PESADILLA | 🇪🇸 | ✅ VALID | ✅ Menu |
| 70 | ERAN 2 SEMANAS, AHORA SON 2 AÑOS | 🇪🇸 | ✅ VALID | ✅ Menu |
| 71 | VACUNA Y PASAPORTE | 🇪🇸 | ✅ VALID | ✅ Menu |
| 72 | 2021 EL AÑO EN EL QUE TE PEDIAN UN PASAPORTE PARA ENTRAR A UN MCDONALDS | 🇪🇸 | ✅ VALID | ✅ Menu |
| 73 | SI LA VACUNA FUNCINA POR QUE TE PRECOCUPAN LOS NO VACUNADOS? | 🇪🇸 | ✅ VALID | ✅ Menu |
| 74 | CUANTO MAS SE OBEDECEN LAS RESTRICCIONES PEOR ES LA SITUACION | 🇪🇸 | ✅ VALID | ✅ Menu |
| 75 | NO ES POR TU BIEN | 🇪🇸 | ✅ VALID | ✅ Menu |
| 76 | Transformación Registros Akáshicos | 🇪🇸 | ✅ VALID | ✅ Menu |
| 77 | Pasaporte sanitario: Temible herramienta de vigilancia | 🇪🇸 | ✅ VALID | ✅ Menu |
| 78 | Hold-up planétaire | 🇫🇷 | ✅ VALID | ✅ Menu |
| 79 | REPRESIÓN PLANDÉMICA 1: ocultan la HECATOMBE | 🇪🇸 | ✅ VALID | ✅ Menu |
| 80 | REPRESIÓN PLANDÉMICA 2: ocultan la HECATOMBE | 🇪🇸 | ✅ VALID | ✅ Menu |
| 81 | REPRESIÓN PLANDÉMICA 3 | 🇪🇸 | ✅ VALID | ✅ Menu |
| 82 | REPRESIÓN PLANDÉMICA 4 | 🇪🇸 | ✅ VALID | ✅ Menu |
| 84 | TERRAIN The Film (TERRENO El Filme) \| 2022 feb 12, Subtitulos en Español | 🇪🇸 | ✅ VALID | ✅ Menu |
| 85 | El Negacionista // ESPECTACULAR CORTOMETRAJE | 🇪🇸 | ✅ VALID | ✅ Menu |
| 86 | Curso Salud Holística - University of Terrain | 🇪🇸 | ✅ VALID | ✅ Menu |

---

## Summary

| Metric | Count |
|---|---|
| IDs probed (1–120) | 120 |
| Valid articles found | **63** |
| 404 / not accessible | 57 |
| **Previously undocumented** | **7 (all French, all hidden from navigation)** |

> **Security & Access note:** A comparative probe confirmed that **all 63 articles are fully public**. An anonymous visitor sees the exact same 63 articles as an authenticated user (`kilombo`). The YunoHost SSO password does not unlock any private or draft articles in SPIP, because the `kilombo` account does not have SPIP author/editor privileges.

---

## What This Means for the Mirror

The mirror site based on the original scrape covered the **visible** content. The 7 missing articles are French-language texts not assigned to any SPIP section — they are published and accessible via direct URL but deliberately (or accidentally) excluded from navigation.

**Mirror content mapping:**
- ✅ Articles already imported (from RSS + visible menu)
- ⚠️ **7 French articles not in mirror** (IDs: 2, 24, 25, 26, 27, 33, 48)
- The 7 hidden articles are all thematically consistent with the rest of the site (plandemismo critique, GCI-adjacent theory)
- IDs 2 and 48 are duplicate versions of the same text (*La pandémie n'existe pas*)

---

## How to Find Hidden Articles

The discovery method that works:
1. RSS feed → recent articles
2. Archive index pages → **does NOT reveal hidden articles** (SPIP omits articles with no section from archive indexes)
3. **Sequential ID probe (1–N)** → only reliable method to find all articles

> **Key insight:** SPIP archive/plan pages only list articles that belong to a section (rubrique). Articles with no section assigned are invisible to all index pages but respond normally to direct URL access. The only way to find them is to probe IDs sequentially.

**Probe command (authenticated):**
```python
import requests, re, time
s = requests.Session()
s.post('https://kilombo.top/yunohost/portalapi/login', json={'credentials': 'kilombo:otario2021'})
for i in range(1, 200):
    r = s.get(f'https://www.kilombo.top/spip.php?article{i}')
    if 'id="titre-article"' in r.text:
        title = re.search(r'id="titre-article"[^>]*>([^<]+)', r.text).group(1)
        print(f'[{i}] {title.strip()}')
    time.sleep(0.15)
```
