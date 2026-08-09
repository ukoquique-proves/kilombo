# TO_FIX — Bugs y problemas de consistencia detectados

Auditoría activa del proyecto. Solo problemas abiertos.
Última actualización: 2026-08-09 (v0.23.0+) — ítems 40–42 añadidos; sidebar leakage de 10 artículos PI resuelto. Ítem 44 añadido (duplicación de URLs de red en 3 fuentes).

---

## 🔴 Acción pendiente urgente

- [x] **27. CRÍTICO: `encrypt.mjs` muta `site/` en lugar de escribir a `dist/`** — ✅ Resuelto en v0.20.0: `encrypt.mjs` ahora copia `site/` a `dist/` y cifra únicamente dentro de `dist/`. `site/` nunca se modifica.

- [x] **28. Bug relacionado: el paso HTML de `encrypt.mjs` no es idempotente** — ✅ Resuelto en v0.20.0: efecto secundario del fix del ítem 27. `dist/` se regenera desde cero en cada ejecución, por lo que el doble cifrado es estructuralmente imposible.

- [ ] **23. Cambiar `KILOMBOTOP_PASSWORD` por `KILOMBOTOP_FUTURE_PASSWORD` en `.env`**
  - En cuanto el cliente confirme que el nuevo password está activo en el servidor, ejecutar:
    1. Copiar el valor de `KILOMBOTOP_FUTURE_PASSWORD` a `KILOMBOTOP_PASSWORD` en `.env`
    2. Eliminar la línea `KILOMBOTOP_FUTURE_PASSWORD` del `.env`
    3. Verificar acceso: `./sync-to-production.sh` (o el test de login de TROUBLESHOOTING.md)
  - El valor actual del password futuro está en `.env` entre comillas simples para preservar los caracteres especiales (`$$`, `&&`).

---

## 🟡 Pendiente de confirmación del cliente

- [x] **6. Ambas tarjetas de P.I. apuntan a la misma URL** — resuelto en v0.8.0: confirmado vía `.env.example` y DNS que sólo existe un dominio PI bilingüe. Las dos tarjetas separadas ES/FR fueron fusionadas en una sola tarjeta bilingüe con chip ES+FR. Decisión documentada en CHANGELOG v0.8.0.

- [x] **11. `page-lead` centrado vs. contenido a ancho completo** — resuelto en v0.8.0: el estrechamiento (`max-width: 80ch`) es intencionado como contraste visual entre el bloque introductorio y el grid. Decisión documentada en CHANGELOG v0.8.0.

---

## 🟡 Pendiente de datos externos

- [ ] **A-2 (parcial). URLs reales de los vídeos en Canal7** — `assets/data/plandemismo-actualidad.json`, `assets/data/plandemismo-sida-covid.json`
  - Todos los `ctaUrl` en los JSON apuntan a `https://tv.canal7salta.com/` (raíz).
  - Cuando se conozcan las URLs concretas de cada vídeo, actualizar el campo `ctaUrl` en los JSON y cambiar `ctaPlaceholder` a `false`.
  - Los TODOs correspondientes están marcados en `plandemismo.js` (renderCard) y en los propios JSON.

---

## 🟡 Notas de mantenimiento (sin acción inmediata)

- [x] **31. URLs relativas en `contentHtml` resuelven contra el espejo, no contra el sitio fuente** — ✅ Resuelto en v0.23.0. `sanitizeHtml()` solo bloqueaba `javascript:`/`data:`/`vbscript:` pero no URLs relativas. Un `src` relativo (p.ej. `local/cache-gd2/...`) en el espejo se resuelve contra `ukoquique-proves.github.io/kilombo/` en lugar del subdomain SPIP de origen, dando 404. Fix en tres capas: (1) patch de los 98 URLs relativas en las 10 entradas afectadas de `articles.json`; (2) nueva regla en `validate-data.mjs` que rechaza cualquier `src=` o `href=` no-absoluto en `contentHtml`; (3) `rewrite_relative_urls()` documentado en TROUBLESHOOTING.md §8 como paso obligatorio del pipeline de importación.

- [ ] **30. `el-fraude-de-los-pcr` — entrada stub, pendiente de contenido real** — el artículo original en `https://www.kilombo.top/spip.php?article37` es solo imágenes (dos PNG: `pcr1.png`, `pcr2.png`), sin texto en el cuerpo SPIP. Fue importado como stub de dos frases con enlace a la fuente. El campo `status` se ha corregido a `pending-review` para que no se confunda con un import completo.
  - **Opciones para resolver el gap:**
    1. **Transcripción manual del contenido de las imágenes** — si los PNG muestran texto (infografía, tabla, documento), transcribir el texto a `contentHtml` y cambiar `status` a `imported`. Ver §8 de TROUBLESHOOTING.md para el flujo de limpieza.
    2. **Solicitar al cliente el texto fuente** — el autor original (`kilombo`) puede tener el texto que usó para crear las imágenes.
    3. **Sustituir por otro artículo sobre PCR** — si existe un artículo equivalente con texto completo en cualquiera de las fuentes autorizadas, reemplazar esta entrada y mantener la misma `id` para no romper URLs.
    4. **Dejar como placeholder documentado** — si las imágenes son el contenido intencionado (sin texto transcribible), actualizar `contentHtml` para decirlo explícitamente y cambiar `status` a `external-only`.

- [ ] **21. `main.js` — `.card:not(a)` no coincide con nada actualmente**
  - Todos los `.card` en `index.html` son `<a>`. El script no hace nada hoy.
  - Future-proofing intencionado. Sin acción necesaria salvo que se añadan cards no-anchor.

- [x] **32. `alt=""` vacío en imágenes importadas** — ✅ Resuelto en el artículo afectado (`contre-genocide-guerres-infinites-pi`): alt escrito manualmente. Pendiente: añadir comprobación explícita al checklist de importación en MIRROR_GROWING.md §6 y TROUBLESHOOTING.md §8 para que no se repita en imports futuros.

- [x] **33. El flujo documentado de importación no incluye paso de dedup contra articles.json** — ✅ Resuelto: paso 0 de dedup añadido a TROUBLESHOOTING.md §8 flujo de importación.

---

## 🟡 Deuda técnica — arquitectura y operaciones

- [x] **34. TROUBLESHOOTING.md §8 (scraping) no está referenciado desde MIRROR_GROWING.md §2** — ✅ Resuelto: añadida referencia cruzada en MIRROR_GROWING.md §2 → TROUBLESHOOTING.md §8.

- [x] **35. Los dos safety checkers pueden divergir silenciosamente — y ya ocurrió** — ✅ Resuelto parcialmente en v0.25.0. `decrypt.mjs` usaba `sessionStorage` con clave `"staticrypt_hashed_password"` — la clave real de staticrypt es `"staticrypt_passphrase"` en `localStorage`. Esto causaba que `parseJson()` no encontrara la contraseña tras el login y fallara silenciosamente, dejando `articulos.html` vacía a pesar de que el password gate se desbloqueaba correctamente. Fix: clave y storage corregidos en `decrypt.mjs`. Pendiente aún: extraer reglas compartidas o añadir test cross-coverage (Fix A/B del ítem original).

- [ ] **36. El pipeline de importación de contenido es documentación, no código** — todo lo demás en `scripts/` (`encrypt.mjs`, `validate-data.mjs`, `check-urls.mjs`) es un script real y testado. La lógica de scraping/limpieza/reescritura de URLs en TROUBLESHOOTING.md §8 son snippets Python en un Markdown, ejecutados ad hoc por quien hace el import en esa sesión. Esta inconsistencia es la razón por la que los bugs de URL relativa y `alt` vacío ocurrieron — un humano/sesión tiene que recordar ejecutar cada paso correctamente cada vez.
  - **Fix:** promover §8 a un script real `scripts/import-article.mjs` (o `.py`) que ejecute dedup → fetch → extract → clean → rewrite_relative_urls → write y llame a `validate-data.mjs` al final. Convierte "disciplina documentada" en "disciplina reforzada".

- [x] **37. `INICIO/ROADMAP.md` crea ambigüedad con el `ROADMAP.md` activo** — hay dos archivos con el mismo nombre: `ROADMAP.md` (raíz, hoja de ruta técnica activa) y `INICIO/ROADMAP.md` (plan diagnóstico de 5 fases, archivado). Está documentado en el README, pero es una trampa para cualquier sesión — humana o IA — que haga `grep ROADMAP` sin leer el README primero.
  - **Fix (barato):** renombrar el archivado a `INICIO/ROADMAP-fase-diagnostico.md`. ✅ Hecho; renombrado confirmado vía `ls INICIO/`. Resuelto en sesión 2026-08-09.

- [ ] **38. La deuda de traducción ES/FR solo es visible por búsqueda de texto** — el incumplimiento de la regla §5.3 de MIRROR_GROWING.md (ningún texto nuevo en una sola lengua si se puede cubrir la traducción) se detecta haciendo `grep` por "pendiente FR" en los docs. No hay visión estructurada.
  - **Fix:** un script pequeño `scripts/check-translations.mjs` que lea `articles.json`, agrupe las entradas por `sourceUrl` o por pares de topics/title, e informe qué artículos tienen versión ES pero no FR (o viceversa). Corto de escribir, directamente accionable antes de cada sesión de importación.

- [ ] **39. `plandemismo.css` redeclara los tokens de color de `style.css` con valores hex hardcodeados** — el patrón `var(--x, #fallback)` es legítimo (autocontención del módulo CSS), pero los valores hex están duplicados a mano en dos archivos y pueden divergir si uno se actualiza sin el otro. Baja prioridad pero es deuda real.
  - **Fix:** usar `@import` de `style.css` en `plandemismo.css` (si la arquitectura lo permite) o eliminar los fallbacks hex y confiar en que `style.css` siempre se cargue antes (ya es el caso en todos los HTML del proyecto). — el comentario de cabecera dice que el test "reimplementa la lógica de `decrypt.mjs` usando `crypto.webcrypto` de Node... sin importar `decrypt.mjs` directamente." En la práctica el test usa `codec.decode()` de staticrypt (no una reimplementación del `aesDecrypt()` manual de `decrypt.mjs`). El test valida correctamente el round-trip a nivel de la librería staticrypt, pero un bug específico del código manual de `decrypt.mjs` (p.ej. un off-by-one en `ciphertext.slice(IV_HEX_LEN)`) lo atravesaría sin ser detectado.
  - **Fix A (mínimo):** corregir el comentario para que describa con exactitud lo que se verifica.
  - **Fix B (completo):** extraer `fromHex()` y `aesDecrypt()` de `decrypt.mjs` a un pequeño módulo puro importable desde Node sin `sessionStorage`, y añadir un test que ejercite ese código directamente.

- [ ] **24. Crear `scripts/rotate-password.sh`** — actualmente rotar `KILOMBOTOP_PASSWORD` requiere editar `.env` manualmente (ítem #23) y rotar `STATICRYPT_PASSWORD` requiere re-subir el GitHub Actions Secret a mano. Son dos sistemas de autenticación independientes sin proceso común. Un script pequeño que:
  1. Lea la contraseña nueva desde stdin o argumento
  2. Actualice `.env` (reemplaza `KILOMBOTOP_PASSWORD`)
  3. Re-suba `STATICRYPT_PASSWORD` al repo vía GitHub API (usando `GITHUB_TOKEN` del `.env`)
  4. Ejecute `STATICRYPT_PASSWORD=<nueva> npm run encrypt` localmente para verificar que el cifrado sigue funcionando
  5. Confirme que el acceso SSH sigue funcionando con `./sync-to-production.sh --dry-run`
  - Elimina el proceso manual multi-paso de TO_FIX #23 y evita que un error humano deje los dos sistemas con contraseñas distintas.

- [ ] **25. Blind spot del generador de contexto compacto** — el generador excluye `.github/` y sus subcarpetas, por lo que `deploy.yml` (donde viven el paso de cifrado, el secret `STATICRYPT_PASSWORD` y el orden de los jobs) nunca aparece en los bundles de revisión.
  - **Solución adoptada:** no modificar el generador. En su lugar, instrucción permanente: **si cualquier trabajo de las fases 4–9 toca el pipeline de deploy o CI, incluir `.github/workflows/deploy.yml` manualmente en el contexto de la sesión** — de lo contrario se trabaja a ciegas sobre la parte más sensible del pipeline desde el punto de vista de seguridad.
  - Añadir esta nota al inicio de cada sesión que toque `encrypt.mjs`, `deploy.yml` o `sync-to-production.sh`.

- [ ] **26. Ventana de doble mantenimiento** — `kilombo.top` (SPIP/YunoHost) y el espejo GitHub Pages son actualmente dos fuentes de verdad en paralelo. Cada cambio de contenido debe razonarse en ambos sistemas hasta que el deploy a `kilombo.top` se complete (ítem YunoHost-A/C/D). No es un bug — es deuda intencional de la estrategia de migración incremental documentada en `MIGRATION.md`. **Acción futura:** una vez que el primer deploy a `kilombo.top` funcione, crear un checklist de "fase out" que cierre explícitamente la ventana de doble mantenimiento y archive el flujo de GitHub Pages como preview-only o lo descontinúe.

---

## ⏸ Aplazado — fase YunoHost / deploy a `kilombo.top`

Solo requiere abrir el puerto 22 desde el panel YunoHost — el cliente puede hacerlo directamente sin necesitar a los administradores técnicos. Ver `MIGRATION.md` y `TROUBLESHOOTING.md` sección 4.

- [ ] **YunoHost-A. Abrir puerto 22** → `https://kilombo.top/yunohost/admin/` → Herramientas → Firewall → TCP 22
- [ ] **YunoHost-C. Crear app `my_webapp` para `kilombo.top` raíz** desde el panel YunoHost
- [ ] **YunoHost-D. Ejecutar `./end-of-session.sh`** y verificar deploy en `kilombo.top`
- [ ] **YunoHost-E. Migrar autenticación a clave SSH** — una vez que el primer deploy funcione con contraseña, generar un par de claves ed25519 y añadir la pública al servidor para eliminar la dependencia de `sshpass` y `KILOMBOTOP_PASSWORD`. Instrucciones en el encabezado de `sync-to-production.sh`.

---


- [x] **40. Fuga sistemática de barra lateral/sidebar en artículos importados de PI** — los 10 artículos importados desde Proletarios Internacionalistas (PI) (`proletariosinternacionalistas.kilombo.top/spip.php?article{41,43,44,48,49,50,51,52,53,54}`) incluían al final de `contentHtml` el bloque completo de sidebar de SPIP: ancla `#forum`, campo de búsqueda, lista de artículos relacionados ("Also in this section" / "Dans la même rubrique" con 10 enlaces), sección "Portfolio" con miniatura de imagen y bloque "CRITIQUE (Fr)" con enlaces a rubricas. Total: entre 1.545 y 1.556 chars basura por artículo (5,9%–27,4% del `contentHtml` de cada uno). Era el bug previsible documentado en TO_FIX #36 (pipeline de importación es doc, no código) — el truncamiento documentado en TROUBLESHOOTING §8 "encontrar `<section id=` o `<footer`" no se aplicó.
  - **Fix aplicado en sesión 2026-08-09:** corte limpio al inicio del ancla `<a href="#forum" name="forum">` en los 10 artículos. Script `tmp-clean-pi-articles.py` ejecutado y auditado con `tmp-audit-articles.py` (ambos archivos eliminados tras aplicar).
  - **Artículos afectados y chars eliminados:**
    - `contra-genocidio-guerras-infinitas-pi` — 1.521 chars (22,3%)
    - `contre-genocide-guerres-infinites-pi` — 1.152 chars (16,7%) + portfolio 90×90
    - `falsos-internacionalistas-1` a `-6` — 1.556 chars × 6 artículos (6,1%–23,0%)
    - `1-mayo-2023-contra-militarizacion` — 1.545 chars (27,4%)
    - `plandemismo-y-domesticacion-11` — 1.545 chars (5,9%)

- [x] **41. HTML malformado: `<strong>` anidado/desbalanceado en `contra-genocidio-guerras-infinitas-pi`** — el encabezado del artículo ES tenía la secuencia: `</p>\n<strong>\n ¡Contra el genocidio...! \n<p><strong></strong> </strong></p>`: un `<strong>` abierto fuera de párrafo + un `<strong></strong>` vacío interior + cierre desbalanceado. No rompía el render pero sí la estructura semántica y provocaba warnings de anidamiento.
  - **Fix aplicado en sesión 2026-08-09:** reemplazado por `<p><strong>¡Contra el genocidio...!</strong></p>` párrafo bien formado, sin strong vacíos ni anidamiento roto.

- [x] **42. HTML inconsistente en `contre-genocide-guerres-infinites-pi`** — el encabezado FR tenía `<strong>Contre le génocide...&nbsp;! </strong>` **fuera** de cualquier etiqueta de párrafo (`<p>`), colgado directamente como hijo del `contentHtml`. El hermano ES ya lo tenía dentro de `<p><strong>…</strong></p>` (diferencia de estructura entre los dos de la traducción).
  - **Fix aplicado en sesión 2026-08-09:** envuelto en `<p>` (igual que el ES), y eliminado el espacio sobrante antes de `</strong>`: `…agendas&nbsp;! </strong>` → `…agendas&nbsp;!</strong>`.

---

## Resumen

| # | Archivo | Problema | Estado |
|---|---------|----------|--------|
| **27** | `scripts/encrypt.mjs` | Muta `site/` en lugar de escribir a `dist/` — riesgo de cifrar producción accidentalmente | ✅ Resuelto v0.20.0 |
| **28** | `scripts/encrypt.mjs` | Paso HTML no idempotente — doble cifrado produce página corrupta | ✅ Resuelto v0.20.0 |
| 23 | `.env` | Cambiar PASSWORD por FUTURE_PASSWORD cuando el cliente confirme | 🔴 Acción pendiente |
| 6 | `index.html` | Tarjetas P.I. — confirmar si URL única es correcta | ✅ Resuelto v0.8.0 |
| 11 | `plandemismo.html` + `.css` | `page-lead` centrado — confirmar intención visual | ✅ Resuelto v0.8.0 |
| A-2 | JSON data files | CTAs con URL raíz Canal7 — necesitan URLs reales por vídeo | 🟡 Esperando datos |
| 21 | `main.js` | `.card:not(a)` sin coincidencias hoy (intencionado) | 🟡 Sin acción |
| **32** | `articles.json` + flujo scraping | `alt=""` vacío en imágenes importadas — viola MIRROR_GROWING §4.6 | ✅ Dato corregido; checklist pendiente |
| **33** | TROUBLESHOOTING.md §8 | Flujo de importación sin paso de dedup contra articles.json | ✅ Resuelto |
| **34** | MIRROR_GROWING.md §2 | No hay referencia cruzada a TROUBLESHOOTING.md §8 (selectores SPIP) | ✅ Resuelto |
| **31** | `articles.json` + `validate-data.mjs` | URLs relativas en contentHtml dan 404 en el espejo | ✅ Resuelto v0.23.0 |
| **30** | `articles.json` | `el-fraude-de-los-pcr` es un stub imagen-only — pendiente de contenido real | 🟡 Pendiente de revisión |
| 29 | `test/encrypt-decrypt.test.mjs` | Docstring sobreestima cobertura — no ejercita `decrypt.mjs` directamente | 🟡 Deuda técnica |
| 24 | `scripts/` | Script de rotación de contraseñas para KILOMBOTOP + STATICRYPT | 🟡 Deuda técnica |
| **35** | `decrypt.mjs` | Storage key incorrecto — articulos.html vacía tras login | ✅ Resuelto v0.25.0 |
| **36** | `scripts/` | Pipeline de importación es doc, no código — debería ser `import-article.mjs` | 🟡 Deuda técnica |
| **37** | `INICIO/ROADMAP.md` | Ambigüedad de nombre con `ROADMAP.md` activo | ✅ Resuelto — renombrado a `ROADMAP-fase-diagnostico.md` |
| **38** | `articles.json` | Deuda traducción ES/FR sin visión estructurada — falta `check-translations.mjs` | 🟡 Deuda técnica |
| **39** | `plandemismo.css` | Tokens de color duplicados con `style.css` — pueden divergir | 🟡 Baja prioridad |
| **40** | `articles.json` (10 entradas PI) | Fuga sidebar/footer SPIP + ancla #forum + "Also in this section" — hasta 27% de contenido basura por artículo | ✅ Resuelto 2026-08-09 |
| **41** | `articles.json` / contra-genocidio-pi (ES) | `<strong>` desbalanceado + strong vacío en encabezado del artículo | ✅ Resuelto 2026-08-09 |
| **42** | `articles.json` / contre-genocide-pi (FR) | `<strong>` fuera de `<p>` en encabezado (inconsistencia con ES) | ✅ Resuelto 2026-08-09 |
| 25 | tooling | Deploy.yml invisible en compact-bundle — incluir manualmente en sesiones CI | 🟡 Solución adoptada (nota en deploy.yml) |
| 26 | global | Doble mantenimiento kilombo.top + espejo — cerrar ventana tras primer deploy | 🟡 Deuda futura |
| **43** | `site/js/decrypt.mjs` | Offset IV incorrecto — JSON cifrado siempre falla tras login | ✅ Resuelto v0.26.0 |
| **44** | `.env.example` / `index.html` / `README.md` | URLs de red en 3 fuentes de verdad paralelas — solo detectado, no eliminado | 🟡 Deuda técnica |
| YunoHost-A/C/D | servidor | Abrir puerto 22, crear app, primer deploy | ⏸ Pendiente cliente |

- [x] **43. CRÍTICO: `decrypt.mjs` usa offset de IV incorrecto — ✅ Resuelto en v0.26.0.** El formato real del ciphertext de staticrypt es `hmac(64 hex) + iv(32 hex) + datos`. `aesDecrypt()` trataba los primeros 32 hex como IV (parte del HMAC), produciendo fallo silencioso de decifrado en toda página con JSON cifrado. Fix: `HMAC_HEX_LEN = 64` añadido, slices corregidos a `ciphertext.slice(64, 96)` para IV y `ciphertext.slice(96)` para datos.

- [ ] **44. Las URLs de la red Kilombo tienen 3 fuentes de verdad en paralelo, sin una fuente única** — `.env.example`, el bloque `<!-- CONFIG -->` de `site/index.html`, y la tabla de `README.md` declaran las mismas URLs de forma independiente. `scripts/check-urls.mjs` existe únicamente para *detectar* el drift entre las tres — no lo elimina, y una sesión puede seguir editando solo una de las tres fuentes y no descubrirlo hasta que `npm test` falle (o, si no se corre el test, nunca).
  - **Fix propuesto:** centralizar la lista en un único archivo, p. ej. `assets/data/network-urls.json` (formato `{ tierra: "...", gci: "...", gci_en: "...", ... }`), y hacer que las otras tres fuentes lo consuman en vez de declarar valores propios:
    1. `.env.example` — generar sus líneas `KILOMBO_SITE_*` a partir del JSON con un script pequeño, o documentar que el JSON es la fuente y `.env.example` solo referencia sus keys
    2. `site/index.html` — el bloque `<!-- CONFIG -->` deja de ser comentario informativo y pasa a construirse (o al menos verificarse) desde el mismo JSON en build/test
    3. `README.md` — la tabla "Sitios reales de la red Kilombo" se genera desde el JSON, o `check-urls.mjs` la valida contra el JSON en vez de comparar tres fuentes libres entre sí
  - Con esto, `check-urls.mjs` pasa de ser un detector de drift a ser (opcionalmente) redundante — o se reduce a validar que nadie haya hardcodeado una URL fuera del JSON central.
  - Relacionado con el ítem **39** (mismo patrón de duplicación, en CSS en vez de URLs) — si se aborda uno, vale la pena revisar el otro con el mismo criterio.
