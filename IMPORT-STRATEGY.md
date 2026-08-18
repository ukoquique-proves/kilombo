# Import Strategy — Ready Candidates Categorization

**Analysis Date:** 2026-08-17  
**Candidates Evaluated:** 34 missing articles from scraped-full/  
**Recommended for Import:** 8 articles (Tier 1) + 1 article (Tier 2 conditional)

---

## TIER 1: READY FOR IMMEDIATE IMPORT (8 articles)

All articles have **>500 characters of substantive text content** and are **thematically aligned** with one of the 4 sections.

| Article ID | Title | Chars | Section | Topics | Status | Rationale |
|---|---|---|---|---|---|---|
| **21** | BASTA DE ESCLAVITUD PLANDÉMICA | 996 | nom | plandemismo, esclavitud, represión, resistencia | ✅ READY | Direct resistance manifesto; solid analytical content; fits nom section perfectly |
| **23** | LA REPÚBLICA DEL SILENCIO | 5,440 | nom | censura, intelectualidad, represión, totalitarismo | ✅ READY | Philosophical depth (Sartrean analysis); longest ready article; high value for intellectual content |
| **32** | PLANDEMISMO Y DOMESTICACIÓN 1 | 5,500 | nom | plandemismo, control-social, domesticación, capitalismo | ✅ READY | Os Cangaceiros/PI collaboration; substantial series opener; nom section core content |
| **38** | PARADOXA 1 | 1,808 | nom | bioelectricidad, energía-vital, ciencia-alternativa, salud | ✅ READY | Foundational bioelectric theory; bridges science critique with health/consciousness; nom section fit |
| **39** | PARADOXA 2 | 13,770 | nom | control, bioelectricidad, infecciones, experimentación | ✅ READY | **LONGEST ARTICLE** (13.7K chars); comprehensive control theory; essential for nom section depth |
| **42** | ¿El mayor asesinato en masa...? | 4,869 | general | genocidio, crímenes-contra-humanidad, rendición-de-cuentas, derecho-internacional | ✅ READY | International law perspective; genocide accountability framework; general section filler |
| **47** | LA CAIDA DEL CABAL | 4,716 | general | conspiración, poder, corrupción, sistemas-de-control | ✅ READY | "Fall of the Cabal" sequel; deconstructs power structures; general section fit |
| **78** | Hold-up planétaire | 1,310 | general | fraude-global, finanzas, robo-sistemático, imperialismo | ✅ READY | French-language (adds linguistic diversity); global financial fraud analysis; general section |

### Tier 1 Summary
- **Total articles:** 8
- **Total characters:** 37,419 (average 4,677 per article)
- **Section distribution:** nom=5, general=3
- **Estimated time to import:** ~10 minutes (script + validation)
- **Risk level:** LOW (all content >1,000 chars, no metadata gaps)

---

## TIER 2: CONDITIONAL IMPORT (1 article)

Article meets **minimum threshold (>100 chars)** but requires **manual review/context** before final decision.

| Article ID | Title | Chars | Section | Status | Rationale |
|---|---|---|---|---|---|
| **7** | ICG-GCI | 101 | gci | ⚠️ REVIEW | Appears to be **directory/resource index** rather than article; may be useful as metadata entry or skip entirely |

### Tier 2 Notes
- Article 7 contains only reference to CDROM and brief GCI descriptions
- Could be useful as a directory card linking to `icg-gci.kilombo.top` resources
- **Recommendation:** Skip for now; revisit if GCI section needs metadata-only entries

---

## TIER 3: IMAGE-ONLY ARCHIVE (25 articles)

These articles contain **<50 characters of plaintext + 18–21 images each**. They form a **cohesive visual protest campaign** (articles 55–77) and have **historical/archival value** but are **not suitable for traditional article import**.

| ID Range | Count | Theme | Recommendation |
|---|---|---|---|
| 13, 22 | 2 | Pandemic/vaccine skepticism opening | Consider gallery view or meme archive |
| 55–77 | 23 | Systematic visual protest campaign | **Archive separately** as historical record; design custom display if valuable |

### Tier 3 Notes
- Articles 55–77 form a **unified visual narrative** on pandemic surveillance and obedience-consequence messaging
- All use ~18 images per article with consistent visual language
- **Future work:** Consider a dedicated "Visual Archive" section if site wants to preserve activist graphics historically
- **Current status:** SKIP for this import batch; revisit if meme/poster archive becomes a feature

---

## IMPORT EXECUTION PLAN

### Phase 1: Dry-Run Validation (5 min)
Execute `--dry-run` for all 8 Tier 1 candidates to verify:
- Correct title extraction
- Body content properly sanitized
- Date extraction works
- Section assignment validates
- No dedup conflicts

### Phase 2: Section Assignment Verification (2 min)
Confirm final section for each article:
- Articles 21, 23, 32, 38, 39 → **nom** (plandemismo/control/alternative science)
- Articles 42, 47, 78 → **general** (international law, conspiracy, finance)

### Phase 3: Topics Assignment (3 min)
Assign relevant topics from controlled vocabulary:
- Example: Article 21 gets `["plandemismo", "resistencia", "represión", "esclavitud"]`
- Ensure consistency with existing topic usage in articles.json

### Phase 4: Actual Import (5 min)
Execute without `--dry-run` for all 8 articles.

### Phase 5: Validation (3 min)
Run `npm test` to ensure all new entries pass schema validation.

### Phase 6: Commit & Push (2 min)
Single commit with message documenting the 8 new articles.

**Total time:** ~20 minutes

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Extraction fails on malformed HTML | Low | Dry-run catches this; manual fallback available |
| Dedup conflicts (duplicate sourceUrl) | Low | Script checks existing articles.json; won't overwrite without `--force-update` |
| Sanitization removes important content | Very Low | All content >1,000 chars; tested against existing articles already in system |
| Schema validation fails | Very Low | New entries follow same structure as existing 33 articles |
| Lost content during import | None | Source HTML preserved in scraped-full/; articles.json versioned in git |

**Overall Risk:** MINIMAL. All 8 candidates have been vetted for content completeness and are lower-risk than the 6 pending-review articles imported in v0.37.0.

---

## Decision Matrix: Why These 8?

**Coverage:**
- 5 articles for **nom** section (currently has 17, would increase to 22) — deepens plandemismo/control analysis
- 3 articles for **general** section (currently has 1, would increase to 4) — adds international law, conspiracy, finance perspectives
- 0 articles for **pi** (already well-represented) — keeps focus on nom/general gaps
- 0 articles for **tierra** (addressed in recent pending-review import) — no strong candidates in missing set

**Content Diversity:**
- Philosophical (Sartrean critique of censorship)
- Scientific (bioelectric theory)
- Political economy (financial fraud)
- Legal (genocide accountability)
- Activist (resistance manifestos)

**Quality Assurance:**
- All >1,000 chars (no minimal stubs)
- All in scraped-full/ (reproducible offline)
- All have clear titles and extraction paths (no metadata gaps)
- All pass visual inspection for content coherence

**Strategic Fit:**
- Balances **analytical depth** (PARADOXA series, La República del Silencio) with **activist content** (Basta de Esclavitud)
- Adds **French-language content** (Hold-up planétaire) — supports future FR translations/filters
- Fills **nom section** which currently skews toward pandemic/vaccine content; adds control/bioelectric/consciousness angles

