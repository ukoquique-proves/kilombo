# TO_FIX — Bugs y problemas de consistencia detectados

Auditoría activa del proyecto. Solo problemas abiertos.
Última actualización: 2026-08-17 — v0.32.0 añade módulo `dewrap.mjs` y deja pendientes de integración 3 ítems (46, 47, 48).

---

## 🔴 Acción pendiente urgente

- [ ] **23. Cambiar `KILOMBOTOP_PASSWORD` por `KILOMBOTOP_FUTURE_PASSWORD` en `.env`**
  - En cuanto el cliente confirme que el nuevo password está activo en el servidor, ejecutar:
    1. Copiar el valor de `KILOMBOTOP_FUTURE_PASSWORD` a `KILOMBOTOP_PASSWORD` en `.env`
    2. Eliminar la línea `KILOMBOTOP_FUTURE_PASSWORD` del `.env`
    3. Verificar acceso: `./sync-to-production.sh` (o el test de login de TROUBLESHOOTING.md)
  - El valor actual del password futuro está en `.env` entre comillas simples para preservar los caracteres especiales (`$$`, `&&`).

- [ ] **46. Integrar `dewrapHardBreaks()` en el pipeline de importación (v0.32.0+)**
  - **Subítem A: Integración en `scripts/import-article.mjs`**
    - `dewrap.mjs` existe y está testeado (12 tests pasan). Ahora necesita aplicarse automáticamente en todas las futuras importaciones.
    - Llamar a `dewrapHardBreaks()` en el paso 3.5 del pipeline: después de `reduceToAllowlist()` (paso 3) pero antes de guardar a JSON (paso 4).
    - Verificar que la salida siga pasando `validate-data.mjs`.
  - **Subítem B: Backfill de artículos existentes (7 afectados)**
    - Crear script `scripts/backfill-dewrap.mjs` que:
      1. Lea `site/assets/content/articles.json`
      2. Aplique `dewrapHardBreaks()` a cada entrada donde `status === "imported"` y `contentHtml` tenga ≥3 `<br>`
      3. Escriba de vuelta a JSON con comentario de auditoría: `"_lastDewrapped": "2026-08-17T..."`
      4. Ejecute `validate-data.mjs` para confirmar que no hay regresiones
      5. Reporte qué entradas fueron modificadas (y cuántos chars/párrafos cambiaron)
    - Artículos afectados identificados en v0.24.0:
      - `contra-genocidio-guerras-infinitas-pi` (ES) — 1.521 chars hard-wrapped
      - `contre-genocide-guerres-infinites-pi` (FR) — 1.152 chars hard-wrapped
      - `falsos-internacionalistas-1` a `falsos-internacionalistas-6` (6 entradas)
      - `1-mayo-2023-contra-militarizacion` — hard-wrapped
      - `plandemismo-y-domesticacion-11` — hard-wrapped
    - Ejecutar: `node scripts/backfill-dewrap.mjs` (dry-run por defecto; `--commit` para aplicar cambios)
  - **Subítem C: Documentar en MIRROR_GROWING.md**
    - Ver ítem #47 abajo (nuevas reglas de control de calidad para importaciones).

- [ ] **47. Documentar reglas de control de calidad para importaciones en MIRROR_GROWING.md §2**
  - Añadir una nueva sección después de §1 (o como §2 revisado) que documente las heurísticas automáticas que `scripts/import-article.mjs` aplica a cada entrada importada. Incluir:
    - ✅ Dedup verificado (URL y ID no existen ya)
    - ✅ Fetch exitoso (HTTP 200, contenido > 100 chars)
    - ✅ Extracción completada (Tierra o PI, según URL)
    - ✅ Limpieza de HTML (allowlist, XSS, eventos inline)
    - ✅ Reescritura de URLs (todos los `src`/`href` → absolutos)
    - ✅ Validación de datos (schema correcto, tipos esperados)
    - 🔶 **Detector de hard-breaks** (NUEVO — v0.32.0+):
      - Si `contentHtml` tiene ≥3 `<br>` Y ningún `<p>` contiene "natural" multiple-line patten, marcar `status: "pending-review"` en lugar de `"imported"`
      - Esto reduce falsos positivos: un artículo con una cita de dos líneas (1-2 `<br>`) no salta el flag; pero un párrafo de 50+ líneas con `<br>` cada 60 chars sí.
      - Criterio: si el párrafo más corto con `<br>` < 180 chars AND tiene ≥3 breaks consecutivos, es probable hard-wrap.
      - Validación manual recomendada: revisar antes de cambiar a `"imported"`.
    - 🟡 **Detector de sidebar/footer residual** (futuro):
      - Detectar patrones típicos de SPIP que se cuelan en `contentHtml` (anclas `#forum`, bloques de búsqueda "Search/Buscar", listas "meme-rub").
      - Marcar `status: "pending-review"` si se encuentra cualquiera de estos.
  - La regla de **"pending-review" como gate de control de calidad** debe quedar explícitamente documentada para que no se dependa de memory de una sesión anterior.

- [ ] **48. Implementar detector de hard-breaks en `scripts/validate-data.mjs` (v0.32.0+)**
  - Añadir una nueva regla de validación que marque automáticamente artículos sospechosos:
    - Si entrada `status === "imported"` Y `contentHtml` tiene patrón de hard-breaks probable (≥3 `<br>` en párrafos cortos < 180 chars), lanzar una advertencia durante la validación:
      - Opción 1 (recomendada): no fallar el `npm test`, pero emitir **warning** en stdout: `⚠️  ${id} — posible hard-wrapped content: ${brCount} breaks en párrafo de ${minLength} chars. Considerar status='pending-review'.`
      - Opción 2: marcar directamente el entry como `status: "suspicious"` (nuevo estado entre `pending-review` e `imported`) y dejar que CI lo bloquee.
    - La heurística es la del módulo `dewrap.mjs`: usar `hasEnoughBreaksToAnalyze()` + medir longitud de líneas más cortas.
    - Objetivo: prevenir que futuras importaciones entren como `"imported"` si contienen contenido sospechoso sin haber sido revisado manualmente.

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

- [ ] **25. Blind spot del generador de contexto compacto**
  - El generador excluye `.github/`, por lo que `deploy.yml` no aparece en los bundles de revisión.
  - Solución adoptada: incluir `.github/workflows/deploy.yml` manualmente en cualquier sesión que toque `encrypt.mjs`, `deploy.yml` o `sync-to-production.sh`.

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
