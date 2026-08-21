# TO_FIX — Bugs y problemas de consistencia detectados

Auditoría activa del proyecto. Solo problemas abiertos.
Última actualización: 2026-08-18 — v0.39.1; ítems #29, #45, #51, #59, #60, #61, #62 cerrados; seguridad URLs (#ctaUrl/#sourceUrl) resuelta.

---

## 🟢 Recientemente cerrados

- [x] **65. GitHub token exposed in .git/config URL and git history (SECURITY)** — v0.40.2 ✅ COMPLETED
  - **Original problem:** GitHub token visible in:
    1. `.git/config` remote URL (stripped from working tree, persists in .git)
    2. Git history `git log` (prior commits reference the token in commit messages during troubleshooting)
  - **Token lifecycle:**
    - Token generated initially for OAuth flow testing
    - Exposed in git history during diagnostic work
    - Repo remained private, minimizing blast radius
    - **Action taken (v0.40.2):** Old token **immediately revoked** on GitHub Settings → Developer settings → Personal access tokens (2026-08-21), new token generated and verified working
  - **Mitigation (long-term, deferred):**
    - If repo goes public: `git filter-repo --path-regex '.git/config' --path-glob '*.md'` to remove token references from history
    - Current status (private repo): low risk while private; high priority for remediation if visibility changes
  - **Lessons learned:** See `docs/TOKEN-REVOCATION-STEPS.md` for step-by-step rotation guide
  - **Status:** ✅ CLOSED — token revoked, new token active, workflow verified

- [x] **60. Backfill de fechas para artículos ya importados antes del fix del regex `class=`** — v0.39.1 ✅
  - El fix de #59 (Gap 2) solo corrigió la extracción para importaciones *futuras*. Los 21 artículos ya importados con el regex antiguo seguían con `date: ""` en `articles.json` (51% del catálogo).
  - `scripts/backfill-dates.mjs` (nuevo, dry-run por defecto, `--commit` para escribir) re-extrae la fecha usando `extractTierraDate()` (la misma lógica ya corregida en `import-article.mjs`) contra los snapshots locales de `scraped-full/article-{N}.html`, matcheados por `sourceUrl`, y normaliza el string ES/FR a `YYYY-MM-DD`.
  - **Resultado:** 15 de 21 fechas recuperadas y escritas. 6 quedan sin resolver porque su `sourceUrl` (`article24`, `25`, `26`, `27`, `33`, `48`) no tiene snapshot local en `scraped-full/` — necesitan un fetch en vivo contra kilombo.top o revisión manual (ver ítem nuevo abajo).
  - Tests: `test/backfill-dates.test.mjs` cubre el normalizador de fechas ES/FR.

- [x] **61. `detectSite()` misclasificaba subdominios GCI como `tierra`** — v0.39.1 ✅
  - `detectSite()` ahora reconoce explícitamente `icg-gci.kilombo.top`, `in.kilombo.top`, `cdrom.kilombo.top`, `icg-old.kilombo.top` como `'gci'` en vez de dejarlos caer en la rama `tierra`.
  - No existe todavía `extractGCI()` (la plantilla SPIP de GCI no ha sido mapeada), así que `buildArticleEntry()` ahora falla explícitamente con un mensaje claro para hosts `gci` en vez de silenciosamente extraer con los selectores equivocados de `extractTierra()`. Ver ítem pendiente abajo para el extractor real.
  - Tests: `test/import-article.test.mjs` — `detectSite recognizes GCI subdomains as "gci"` y `buildArticleEntry rejects GCI hosts loudly`.

- [x] **62. `relatedArticles` — campo de schema documentado y poblado en datos, pero nunca leído por el renderer** — v0.39.1 ✅
  - `ARTICLES.schema.md` documentaba `relatedArticles` como usado para cross-linking de versiones variantes del mismo contenido, y dos entradas reales (`quilombo-pelicula` / `kilombo-quilombo-pelicula`) lo poblaban — pero `findRelatedArticles()` en `site/js/articles.js` solo miraba `topics` compartidos.
  - `findRelatedArticles()` ahora resuelve `current.relatedArticles` primero (exento del filtro "debe compartir un tema" — un link editorial explícito es más fuerte que el solape de temas) y rellena el resto del `limit` con las coincidencias por tema, como antes.
  - Tests: 3 nuevos casos en `test/articles.test.mjs` (inclusión con cero temas compartidos, orden por delante de matches por tema, id colgante silenciosamente ignorado).

- [x] **59. Extraction gaps: unextracted media + date regex variant** — v0.39.1 ✅
  - **Gap 1 (FIXED):** Portfolio images + document links outside body block were silently dropped. Detection added; articles with unextracted media forced to `pending-review` (see `docs/EXTRACTION-GAPS-FIXED.md`)
  - **Gap 2 (FIXED):** Date regex only matched `id="date-article"` but 51% of articles use `class="date-article"` instead. Regex updated to accept both attributes.
  - **Testing:** 5 new unit tests added, all 142 tests passing.

---

## 🔴 Acción pendiente urgente

- [ ] **23. Cambiar `KILOMBOTOP_PASSWORD` por `KILOMBOTOP_FUTURE_PASSWORD` en `.env`**
  - En cuanto el cliente confirme que el nuevo password está activo en el servidor, ejecutar:
    1. Copiar el valor de `KILOMBOTOP_FUTURE_PASSWORD` a `KILOMBOTOP_PASSWORD` en `.env`
    2. Eliminar la línea `KILOMBOTOP_FUTURE_PASSWORD` del `.env`
    3. Verificar acceso: `./sync-to-production.sh` (o el test de login de TROUBLESHOOTING.md)
  - El valor actual del password futuro está en `.env` entre comillas simples para preservar los caracteres especiales (`$$`, `&&`).

- [ ] **57. Metadata extraction analysis: Articles 36 & 46 (Quilombo PELÍCULA movies) — LOW friction to complete**
  - **Problem**: Articles 36 & 46 are pending-review stubs. kilombo.top source contains only 1-line bodies but has critical metadata embedded:
    - Article 36: `<p><a href="https://youtu.be/icuIeOoU_3k" target="_blank">Quilombo película</a></p>`
    - Article 46: references Portuguese film with English/Spanish subtitles
    - Missing: synopses, director, year, country, duration, production credits
  - **Why no automation**: SPIP CMS stores only title, date, body text — no metadata schema. Ficha técnica (credits, year, country) must be:
    1. Text-mined manually from article body (not applicable — body is 1 line)
    2. Manually researched from IMDb/Wikipedia/etc.
    3. Stored in separate JSON field (recommended)
  - **Extraction pattern**: Zero pattern to generalize — only 2 known stubs, no programmatic extraction possible.
  - **Recommended approach (LOW-FRICTION)**:
    1. Extend `articles.json` schema with optional `externalLinks` array + `metadata` object:
       ```json
       "externalLinks": [
         { "type": "youtube", "url": "https://youtu.be/icuIeOoU_3k", "title": "Full film" }
       ],
       "metadata": {
         "director": "Carlos Diegues",
         "year": 1985,
         "country": "Brasil",
         "duration": "120 min"
       }
       ```
    2. Render as metadata card in `articulo.html` detail page
    3. Manually research & complete articles 36 & 46 (~15 mins total)
    4. Document pattern in ROADMAP.md for future movie imports
  - **Effort**: 15 mins vs. weeks (full IMDb integration)
  - **Status**: Pending user decision on schema extension + priority

- [ ] **63. Implementar extractores para la red GCI — 3 categorías técnicas distintas**
  - **Contexto:** #61 (cerrado v0.39.1) corrigió `detectSite()` para que ya no clasifique los hosts GCI como `tierra`, evitando corrupción silenciosa. La v0.40.x (fix-plan Block A) refinó además la detección en 3 categorías técnicas reales, acordes a la infraestructura documentada en `TROUBLESHOOTING.md §2`:
    - **`'gci'`** → `icg-gci.kilombo.top` — instancia SPIP separada (app YunoHost: `spip__4`). Mismo motor SPIP que Tierra pero plantilla/tema distinto; los selectores de `extractTierra()` no son válidos aquí.
    - **`'gci-in'`** → `in.kilombo.top` — instancia SPIP separada (app: `spip__3`), multilingüe (EN, Kurdish, Persian, Arabic, etc.). También SPIP, también plantilla propia.
    - **`'gci-static'`** → `cdrom.kilombo.top` y `icg-old.kilombo.top` — webapps estáticas (app: `my_webapp`). **No son instancias SPIP en absoluto.** El contenido es HTML estático servido directamente; los selectores SPIP no aplican en absoluto para estas.
  - **Pendiente por categoría:**
    1. `'gci'` — mapear la plantilla SPIP de `icg-gci.kilombo.top` y escribir `extractGCI()` con sus selectores reales.
    2. `'gci-in'` — mapear la plantilla SPIP de `in.kilombo.top` y escribir `extractGCIIn()` (o generalizar `extractGCI()` si la plantilla es la misma).
    3. `'gci-static'` — `cdrom` e `icg-old` requieren un enfoque completamente distinto: no extractor SPIP sino un scraper de HTML estático adaptado a su estructura.
  - En los tres casos, quitar el `throw` en `buildArticleEntry()` para la categoría correspondiente una vez que el extractor esté listo y testeado.
  - **Prioridad:** Media — ya no hay riesgo de corrupción silenciosa. Los artículos de la red GCI siguen sin poder importarse por el script hasta que se mapee al menos una de las tres categorías.

- [ ] **64. 6 artículos siguen sin fecha — snapshot local no disponible (`scraped-full/article{24,25,26,27,33,48}.html`)**
  - `scripts/backfill-dates.mjs` (ver #60, cerrado v0.39.1) recuperó 15 de las 21 fechas vacías desde snapshots locales, pero estos 6 IDs no tienen un `scraped-full/article-{N}.html` correspondiente:
    - `contre-l-8217-esclavage-et-la-fausse-critique-du-capitalisme-en-general-i` (article24)
    - `contre-l-8217-esclavage-et-la-fausse-critique-du-capitalisme-en-general-ii` (article25)
    - `contre-l-esclavage-et-la-fausse-critique-du-capitalisme-en-general-iii` (article26)
    - `le-covidisme-nbsp-une-nouvelle-religion` (article27)
    - `gouverner-par-le-chaos` (article33)
    - `la-pandemie-n-existe-pas` (article48)
  - **Solución:** re-scrapear estas 6 URLs en vivo (`npm run scrape:full` o similar) para poblar `scraped-full/`, luego volver a correr `node scripts/backfill-dates.mjs --commit`. Alternativamente, mirar la fecha manualmente en `www.kilombo.top` si el scrape no está disponible.
  - **Prioridad:** Baja — cosmético (fecha "—" en la ficha), no bloquea nada funcionalmente.

- [x] **46. Integrar `dewrapHardBreaks()` en el pipeline de importación (v0.32.0+)** — ✅ Resuelto.
  - **Subítem A** — ✅ `dewrapHardBreaks()` corre como paso 3.5 en `scripts/import-article.mjs`, después de `reduceToAllowlist()` (paso 3) y antes de devolver la entrada (paso 4). Verificado contra `validate-data.mjs` (114 tests + validación de datos en verde).
  - **Subítem B** — ✅ `scripts/backfill-dewrap.mjs` creado y ejecutado con `--commit`. 7 artículos reformateados: `represion-plandemica-1` (200→0 `<br>`, 1→56 `<p>`), `represion-plandemica-3`, `1-mayo-2023-contra-militarizacion`, `plandemismo-y-domesticacion-11` (43→2 `<br>`, 8→61 `<p>`), `1er-mai-2023-tierra-fr`, `le-covidisme-nbsp-une-nouvelle-religion`, `la-pandemie-n-existe-pas`. Cada entrada modificada tiene `_lastDewrapped` con timestamp de auditoría.
    - Nota: 2 artículos de la lista original de v0.24.0 (`contra-genocidio-guerras-infinitas-pi`, `contre-l-8217-esclavage-et-la-fausse-critique-du-capitalisme-en-general-ii`) no se tocaron — sus `<br>` están repartidos entre varios `<p>`, ninguno alcanza el umbral `MIN_BR_COUNT` de `dewrap.mjs` en un solo párrafo, así que no son hard-wraps reales según el criterio del módulo.
  - **Subítem C** — ✅ documentado en `MIRROR_GROWING.md` §2, "Control de calidad automático del pipeline".

- [x] **47. Documentar reglas de control de calidad para importaciones en MIRROR_GROWING.md §2** — ✅ Resuelto.
  - Sección añadida documentando las 6 comprobaciones automáticas del pipeline (dedup, fetch, extracción, limpieza HTML, reescritura URLs, reflow de hard-breaks) más la validación de schema y el warning no bloqueante de `validate-data.mjs`.
  - El detector de sidebar/footer residual (`#forum`, "Buscar", `meme-rub`) fue evaluado contra el contenido real de `articles.json` y **no se implementó**: no se encontraron casos genuinos, solo falsos positivos (la palabra "buscar" en su uso normal). Queda documentado en MIRROR_GROWING.md por si aparece un caso real en el futuro.

- [x] **48. Implementar detector de hard-breaks en `scripts/validate-data.mjs` (v0.32.0+)** — ✅ Resuelto (Opción 1).
  - `validate-data.mjs` ahora escanea cada entrada `status: "imported"` en `content/*.json` y emite un `⚠️` en stdout si encuentra un párrafo con ≥3 `<br>` y una línea < 180 caracteres — sin fallar el build (`npm test` sigue en verde). Mensaje incluye el `id`, el conteo de `<br>` y sugiere `backfill-dewrap.mjs` o cambiar `status` a `pending-review`.
  - Verificado con una regresión inyectada manualmente (revertida antes de commit): el warning se dispara correctamente y no afecta el exit code.
  - Datos actuales (post-backfill #46): 0 warnings — los 27 artículos en `articles.json` pasan limpio.

---

## 🟡 Pendiente de datos externos

- [ ] **A-2 (parcial). URLs reales de los vídeos en Canal7** — `assets/data/plandemismo-actualidad.json`, `assets/data/plandemismo-sida-covid.json`
  - Todos los `ctaUrl` en los JSON apuntan a `https://tv.canal7salta.com/` (raíz).
  - Cuando se conozcan las URLs concretas de cada vídeo, actualizar el campo `ctaUrl` en los JSON y cambiar `ctaPlaceholder` a `false`.
  - Los TODOs correspondientes están marcados en `plandemismo.js` (renderCard) y en los propios JSON.

- [ ] **30. `el-fraude-de-los-pcr` — entrada stub, pendiente de contenido real**
  - El artículo original en `https://www.kilombo.top/spip.php?article37` es solo imágenes (dos PNG: `pcr1.png`, `pcr2.png`), sin texto en el cuerpo SPIP.
  - (Ver [`docs/SITE_ANALYSIS.md`](docs/SITE_ANALYSIS.md) línea "article37 | El fraude de los PCR" — confirmado en catálogo vivo del servidor.)
  - Fue importado como stub de dos frases con enlace a la fuente. El campo `status` se ha corregido a `pending-review` para que no se confunda con un import completo.
  - Opciones para resolver el gap:
    1. Transcribir manualmente el texto de las imágenes y cambiar `status` a `imported`.
    2. Solicitar al cliente el texto fuente.
    3. Reemplazar la entrada por otro artículo equivalente con texto completo.
    4. Documentar explícitamente que las imágenes son el contenido intencionado y cambiar `status` a `external-only`.

- [x] **55. Sección `tierra` con un solo artículo — candidatos evaluados e importados como pending-review** — ✅ Resuelto v0.37.0+.
  - Dry-run ejecutado contra los 6 candidatos de `scraped-full/` usando el flag `--file`. Resultado:
    - **36, 46** (Quilombo / Kilombo PELÍCULA): stubs de 1 frase importados en sección `tierra` con `status: pending-review`.
    - **76** (Registros Akáshicos), **85** (El Negacionista), **86** (Curso Salud Holística): image-only stubs importados en `tierra` con `status: pending-review`.
    - **84** (TERRAIN The Film): único candidato con cuerpo de texto real (~800 chars). Contenido anti-vacunas/plandemismo → asignado a `nom` (temática gana sobre origen). Artefacto `>` limpiado antes de importar.
  - **Resultado**: `tierra` ahora tiene 5 artículos (36, 46, 76, 85, 86), todos `pending-review`. `nom` tiene 1 artículo adicional (84). Total articles: 33.
  - **Acción futura**: cuando haya nuevo contenido publicado con texto real y temática no-plandemismo, importar con `--file` flag y actualizar `status` a `imported` tras revisión.

---

## 🟡 Notas de mantenimiento

- [ ] **21. `main.js` — `.card:not(a)` no coincide con nada actualmente**
  - Todos los `.card` en `index.html` son `<a>`. El script no hace nada hoy.
  - Future-proofing intencionado; sin acción necesaria salvo que se añadan cards no-anchor.

- [x] **45. `dist/` contiene un artefacto cifrado obsoleto y desfasado** — ✅ Resuelto v0.36.0+.
  - El directorio `dist/` ha sido eliminado del filesystem local. Era un artefacto gitignoreado (nunca comprometido) pero presente en disco, con un `decrypt.mjs` desactualizado (sessionStorage/IV-offset incorrecto, sin `url-safety.mjs`) que habría fallado silenciosamente si desplegado.
  - `dist/` nunca debe existir como directorio persistente. El build de deploy se genera on-demand por GitHub Actions (`npm run encrypt` + artefacto de Pages) y no se guarda localmente.

---

## 🟡 Deuda técnica — arquitectura y operaciones

- [ ] **54. Fixed-column corruption en contentHtml — clase de corrupción no detectada previamente**
  - **Problema**: Dos artículos (`plandemismo-y-domesticacion-11` e `imagenes`) tenían `contentHtml` con saltos de línea embebidos (`\n` literales) que rompían texto a límites de columna fijos (~60-80 caracteres), cortando palabras y frases en mitad. Ejemplo: `"PLANDEM\nISMO"` (PLANDEMISMO roto en dos líneas) o `"ignorancia por los esfuerzos sistemáticos de todos los gobiernos, que consideran es\nta ignorancia…"` (frase rota en medio).
  - **Causa raíz**: Desconocida, posiblemente debida a:
    1. Copy-paste de texto pre-envuelto en línea fija (editor de 80 columnas antiguo, terminal, documento PDF)
    2. JSON stringificación de texto formateado que no preservó el reflow
    3. Paso de importación anterior que no limpió saltos de línea intra-HTML
  - **Impacto**: Render correcto (navegador ignora `\n` intra-tag), pero rompe legibilidad de texto plano y cualquier analizador que espere HTML limpio.
  - **Detección**: NO detectado por `validate-data.mjs` (solo busca `<br>` y hard-breaks). NO detectado por `dewrap.mjs` (solo procesa content dentro de `<p>`, no newlines literales).
  - **Fix aplicado** (v0.35.0+): 
    - Patch manual: removidos todos los `\n` intra-párrafo en los 2 artículos afectados
    - Script de detección `scripts/detect-fixed-column-corruption.mjs` creado para scan futuro (ejecutable vía `npm run check-corruption`)
    - Resultado post-scan (**corregido**, ver nota abajo): 0 artículos afectados (solo esos 2, ya reparados)
  - **⚠️ Nota de corrección (v0.38.0+)**: el regex original de `detectFixedColumnCorruption()` era `/<p>([^<]*\\n[^<]*)<\/p>/g` — buscaba los dos caracteres literales `\` + `n`, no un salto de línea real. Tras `JSON.parse()`, un `\n` de JSON se convierte en un carácter de newline real (code 10) en el string de JS, así que ese regex nunca coincidía con contenido corrupto real: el scan de "0 artículos afectados" nunca ejecutó una comprobación efectiva, para ningún dataset. Corregido a `/<p>([^<]*\n[^<]*)<\/p>/g` (backslash simple = newline real). Re-ejecutado contra el `articles.json` actual (33 artículos) con el detector corregido: 0 artículos afectados — confirmado esta vez con una comprobación que sí detecta el patrón (ver `test/detect-fixed-column-corruption.test.mjs`, que incluye un fixture con saltos de línea reales y falla si el regex vuelve a regresar al patrón roto).
  - **Acción preventiva**: En futuras sesiones, antes de hacer merge de un import masivo:
    1. Ejecutar `npm run check-corruption` para scan de todo `articles.json`
    2. Si se encuentran artículos afectados, aplicar `npm run check-corruption -- --fix` (experimental, requiere revisión manual)
    3. O inspeccionar manualmente `contentHtml` en rawdiff para líneas que contengan `\n` literales

- [x] **29. `test/decrypt-client.test.mjs` — cobertura incompleta del camino criptográfico** — ✅ Resuelto v0.36.0+.
  - `fromHex()` y `aesDecrypt()` exportados desde `site/js/decrypt.mjs` y cubiertos con tests directos.
  - Capa 1 (nuevos): `fromHex` convierte hex a Uint8Array correctamente; `aesDecrypt` construye un envelope con HMAC stub + IV real usando `crypto.subtle.encrypt` directamente (sin staticrypt) y verifica la recuperación — este test habría capturado el bug v0.26.0 antes de shipping; test de regresión del offset incorrecto (`slice(0,32)` vs. correcto `slice(64,96)`) confirma que el viejo bug no puede silenciarse; test de ciphertext demasiado corto lanza excepción.
  - Capa 2 (sin cambios): los 3 tests de `parseJson()` via staticrypt codec round-trip se mantienen.
  - Total: 130/130 tests pasan.

- [x] **36. El pipeline de importación de contenido es documentación, no código**
  - La lógica de scraping/limpieza/reescritura de URLs en TROUBLESHOOTING.md §8 ya está implementada en `scripts/import-article.mjs`, eliminando la necesidad de ejecutar solo snippets Python ad hoc.
  - Fix: `scripts/import-article.mjs` ejecuta dedup → fetch → extract → clean → rewrite_relative_urls → write y llama a `validate-data.mjs` al final.

- [ ] **38. La deuda de traducción ES/FR solo es visible por búsqueda de texto**
  - El incumplimiento de la regla §5.3 de MIRROR_GROWING.md se detecta haciendo `grep` por "pendiente FR" en los docs.
  - Fix: un script pequeño `scripts/check-translations.mjs` que lea `articles.json`, agrupe las entradas y detecte versiones incompletas.

- [x] **39. `plandemismo.css` redeclara tokens de color de `style.css` con valores hex hardcodeados**
  - Esta duplicación es intencional: `plandemismo.css` usa `var(--x, #fallback)` como una capa de seguridad si se carga sin `style.css` o si el orden de carga no fuera el esperado.
  - No hay impacto de runtime; el fallback no se aplica cuando `style.css` define las variables primero.

- [ ] **24. Crear `scripts/rotate-password.sh`**
  - Rotar `KILOMBOTOP_PASSWORD` y `STATICRYPT_PASSWORD` hoy requiere pasos manuales separados.
  - Un script debería:
    1. leer la contraseña nueva desde stdin o argumento;
    2. actualizar `.env`;
    3. re-subir `STATICRYPT_PASSWORD` al repo vía GitHub API;
    4. verificar cifrado local con `npm run encrypt`;
    5. confirmar acceso SSH con `./sync-to-production.sh --dry-run`.

- [ ] **50. Refactorizar archivos con múltiples responsabilidades — growth point**
  - Varios módulos actualmente mezclan varias responsabilidades en un solo archivo:
    - `site/js/articles.js` (~410 líneas) — gestión del modelo de datos, filtrado, y renderizado del carrusel de artículos
    - `site/js/render.mjs` (~340 líneas) — sanitización HTML, renderizado de cards, componentes de filtros, construcción de páginas
    - `scripts/validate-data.mjs` (~420 líneas) — validación de schema JSON, transformación de datos, warnings de regresión
  - Esta estructura no es irrazonable a la escala actual (~27 artículos, sitio monolítico con <30KB HTML final), pero representa un crecimiento futuro si:
    1. El número de artículos crece significativamente (> 200) — la navegación/filtrado necesitará lazy-loading, paginación
    2. La complejidad del validador crece (detectores adicionales de contenido, auditoría de cambios) — el validador se vuelve un orquestador
    3. Se añaden nuevos tipos de contenido (videos, audios, líneas de tiempo) — `render.mjs` explota en tamaño
  - **Acción**: En v0.35.0+, considerar una refactorización modular:
    - `site/js/models/articles.js` — modelo y lógica de filtrado (deducible del JSON, sin renderizado)
    - `site/js/components/` — componentes reutilizables (Card, FilterBar, Carousel como módulos separados)
    - `scripts/validators/` — validadores separados por dominio (schema.mjs, content-qa.mjs, data-format.mjs)
    - **No es bloqueante hoy**, pero es una deuda técnica de arquitectura que evitará refactorizaciones de emergencia cuando la complejidad se dispare.

- [x] **25. Blind spot del generador de contexto compacto** — ✅ Mitigado.
  - El generador excluye `.github/`, por lo que `deploy.yml` no aparece en los bundles de revisión.
  - Solución adoptada: `deploy.yml` tiene un comentario en su propio encabezado advirtiendo de este blind spot, para que cualquier sesión que abra el archivo directamente vea la advertencia sin depender de este documento. Confirmado presente en el archivo actual.
  - Sigue siendo responsabilidad de cada sesión incluir `.github/workflows/deploy.yml` manualmente cuando el trabajo toque `encrypt.mjs`, `deploy.yml` o `sync-to-production.sh` — el comentario mitiga el olvido, no lo elimina estructuralmente.

- [ ] **26. Ventana de doble mantenimiento**
  - `kilombo.top` y el espejo GitHub Pages son dos fuentes de verdad en paralelo.
  - Acción futura: crear un checklist de "fase out" que cierre la ventana de doble mantenimiento y archive el flujo de GitHub Pages.

- [x] **51. Mejoras de UI/diseño — fase 1 (quick wins)** — ✅ Completado v0.36.0.
  - ✅ **Remoción de clutter visual** (v0.35.0): badges simplificados, tags reducidas, fondos de sección unificados, tipografía refinada.
  - ✅ **Favicon** (v0.36.0): `site/favicon.svg` creado (estrella roja con trazo blanco). Enlace `<link rel="icon">` añadido en las 4 páginas HTML (`index.html`, `articulos.html`, `articulo.html`, `plandemismo.html`).
  - ✅ **Open Graph metadata** (v0.36.0): `og:title`, `og:description`, `og:type`, `og:url`, `og:image` + `<meta name="description">` añadidos a las 4 páginas. `plandemismo.html` incluida (se detectó en revisión posterior como omitida inicialmente).
  - ✅ **Mission statement** (v0.36.0): párrafo `.site-mission` añadido en el header de `index.html` con CSS responsivo.

- [ ] **52. Mejoras de UX — fase 2 (medium-term, v0.35.0+)**
  - **Línea de lectura controlada en artículos**: Limitar el ancho de párrafos a ~70-80 caracteres (`max-width: 70ch`) en `articulo.html` para mejorar legibilidad de textos largos. Evita fatiga visual.
  - **Metadatos de artículo prominentes**: Refactorizar `articulo.html` para mostrar "autor", "fecha original", "contexto" (si existen en JSON) como una tarjeta técnica antes del cuerpo. Actualmente estos campos no se muestran al lector.
  - **Relacionados temáticos**: Añadir un campo `relatedTopics` a `articles.json` (opcional, lista de IDs) y renderizar 3-5 artículos relacionados al final de cada pieza. Requiere curaduría manual o algoritmo de similitud.
  - **Timing**: Esperar a que el catálogo crezca (>50 artículos) para justificar la complejidad.

- [ ] **53. Mejoras de UX — fase 3 (deferred, v0.36.0+, arquitectónico)**
  - **UI adaptativa por rol de artículo**: Algunos artículos son archivos históricos (modo "Biblioteca"), otros son análisis coyunturales (modo "Estimulación/Acción"). Idear un campo `articleRole` en JSON y renderizar CTAs/secciones de debate diferentes según el rol.
    - Requiere schema migration + lógica condicional en `articulo.html`
    - Alto esfuerzo, bajo ROI a corto plazo (la acción se vuelve más fácil de captar visualmente, pero no es esencial)
  - **Bloque de contribución explícito**: Finalizar artículos de análisis con un bloque "¿Qué piensas?" con botones prominentes para "Enviar réplica", "Traducir", "Difundir". Hoy existe en footer, pero no es del-for-this-article.
    - Requiere backend de contribuciones o integración con formulario externo (Discord, email, Google Form)
    - Deferred hasta que cliente confirme canal de recepción
  - **Timing**: v0.36.0+ cuando la plataforma alcance escala (>100 artículos, >10 traductores potenciales).

---

## ⏸ Aplazado — fase YunoHost / deploy a `kilombo.top`

Solo requiere abrir el puerto 22 desde el panel YunoHost — el cliente puede hacerlo directamente sin necesitar a los administradores técnicos. Ver `MIGRATION.md` y `TROUBLESHOOTING.md` sección 4.

- [ ] **YunoHost-A. Abrir puerto 22** → `https://kilombo.top/yunohost/admin/` → Herramientas → Firewall → TCP 22
- [ ] **YunoHost-C. Crear app `my_webapp` para `kilombo.top` raíz** desde el panel YunoHost
- [ ] **YunoHost-D. Ejecutar `./end-of-session.sh`** y verificar deploy en `kilombo.top`
- [ ] **YunoHost-E. Migrar autenticación a clave SSH** — una vez que el primer deploy funcione con contraseña, generar un par de claves ed25519 y añadir la pública al servidor para eliminar la dependencia de `sshpass` y `KILOMBOTOP_PASSWORD`. Instrucciones en el encabezado de `sync-to-production.sh`.

---

## ✅ Resueltos recientes

- [x] **49. Hardcoded credentials en sandbox/ (SEGURIDAD CRÍTICA)** — ✅ Resuelto v0.32.0.
  - **Problema**: Cinco archivos en `sandbox/` tenían credenciales YunoHost hardcodeadas en plaintext:
    - `test_sso.py` — 4 ocurrencias de `'kilombo'` y `'otario2021'`
    - `check_sso.py` — credenciales hardcodeadas
    - `fetch_live.py` — credenciales hardcodeadas
    - `scrape.cjs` — credenciales hardcodeadas (Playwright)
    - `decrypt-staticrypt.mjs` — fallback default `process.env.STATICRYPT_PASSWORD || 'otario2021'`
  - **Impacto**: Si el repo público tiene historial de git que incluya estos archivos, la contraseña estaría expuesta.
  - **Fix**: Todos los archivos ahora leen credenciales desde `.env`:
    - Python: `os.environ.get('KILOMBOTOP_PASSWORD')` con error si no está seteada
    - Node.js: `process.env.STATICRYPT_PASSWORD` con validación (no fallback)
    - `scrape.cjs`: parsea `.env` manualmente y valida ambas contraseñas antes de ejecutar
  - **Verificación**: `grep -r "otario2021\|password.*=.*'.*'" sandbox/` = no matches
  - **Git**: `.gitignore` ya tenía `sandbox/` correctamente excluido, pero el riesgo existía localmente

- [x] **44. Las URLs de la red Kilombo tienen 3 fuentes de verdad en paralelo** — ✅ Resuelto v0.28.0.
  - `scripts/check-urls.mjs` continúa como detector de drift, pero el ítem ya no está abierto.
