# TO_FIX — Bugs y problemas de consistencia detectados

Auditoría activa del proyecto. Solo problemas abiertos.
Última actualización: 2026-08-17 — v0.32.0 integró y aplicó `dewrapHardBreaks()` (#46, #47, #48 resueltos).

---

## 🔴 Acción pendiente urgente

- [ ] **23. Cambiar `KILOMBOTOP_PASSWORD` por `KILOMBOTOP_FUTURE_PASSWORD` en `.env`**
  - En cuanto el cliente confirme que el nuevo password está activo en el servidor, ejecutar:
    1. Copiar el valor de `KILOMBOTOP_FUTURE_PASSWORD` a `KILOMBOTOP_PASSWORD` en `.env`
    2. Eliminar la línea `KILOMBOTOP_FUTURE_PASSWORD` del `.env`
    3. Verificar acceso: `./sync-to-production.sh` (o el test de login de TROUBLESHOOTING.md)
  - El valor actual del password futuro está en `.env` entre comillas simples para preservar los caracteres especiales (`$$`, `&&`).

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

---

## 🟡 Notas de mantenimiento

- [ ] **21. `main.js` — `.card:not(a)` no coincide con nada actualmente**
  - Todos los `.card` en `index.html` son `<a>`. El script no hace nada hoy.
  - Future-proofing intencionado; sin acción necesaria salvo que se añadan cards no-anchor.

- [ ] **45. `dist/` contiene un artefacto cifrado obsoleto y desfasado**
  - El directorio `dist/` está correctamente ignorado por Git, así que no es un problema del repositorio.
  - En este estado, el build exportado sigue siendo un artefacto viejo que falta el módulo nuevo `site/js/shared/url-safety.mjs` y el archivo `site/assets/network-urls.json` que sí existen en `site/`.
  - No debe zipearse, compartirse ni entregarse al cliente hasta regenerar y validar el build correspondiente.

---

## 🟡 Deuda técnica — arquitectura y operaciones

- [ ] **29. `test/encrypt-decrypt.test.mjs` — cobertura incompleta del camino criptográfico**
  - El test actual valida el round-trip de `codec.decode()` de staticrypt, pero no ejerce el código manual de `decrypt.mjs` que usa `aesDecrypt()` y la gestión de IV.
  - Este es un gap de priorización alta porque toca el flujo de descifrado real del sitio y podría dejar errores de IV/parseo sin detectar.
  - Fix: extraer las funciones de descifrado a un módulo puro importable y añadir un test directo para `decrypt.mjs` que cubra tanto el caso feliz como un fallo de descifrado.

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
