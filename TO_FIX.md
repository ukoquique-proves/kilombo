# TO_FIX — Bugs y problemas de consistencia detectados

Auditoría activa del proyecto. Solo problemas abiertos.
Última actualización: 2026-08-07 (v0.19.0+) — ítems 27–29 añadidos.

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

- [ ] **30. `el-fraude-de-los-pcr` — entrada stub, pendiente de contenido real** — el artículo original en `https://www.kilombo.top/spip.php?article37` es solo imágenes (dos PNG: `pcr1.png`, `pcr2.png`), sin texto en el cuerpo SPIP. Fue importado como stub de dos frases con enlace a la fuente. El campo `status` se ha corregido a `pending-review` para que no se confunda con un import completo.
  - **Opciones para resolver el gap:**
    1. **Transcripción manual del contenido de las imágenes** — si los PNG muestran texto (infografía, tabla, documento), transcribir el texto a `contentHtml` y cambiar `status` a `imported`. Ver §8 de TROUBLESHOOTING.md para el flujo de limpieza.
    2. **Solicitar al cliente el texto fuente** — el autor original (`kilombo`) puede tener el texto que usó para crear las imágenes.
    3. **Sustituir por otro artículo sobre PCR** — si existe un artículo equivalente con texto completo en cualquiera de las fuentes autorizadas, reemplazar esta entrada y mantener la misma `id` para no romper URLs.
    4. **Dejar como placeholder documentado** — si las imágenes son el contenido intencionado (sin texto transcribible), actualizar `contentHtml` para decirlo explícitamente y cambiar `status` a `external-only`.

- [ ] **21. `main.js` — `.card:not(a)` no coincide con nada actualmente**
  - Todos los `.card` en `index.html` son `<a>`. El script no hace nada hoy.
  - Future-proofing intencionado. Sin acción necesaria salvo que se añadan cards no-anchor.

---

## 🟡 Deuda técnica — arquitectura y operaciones

- [ ] **29. Docstring de `test/encrypt-decrypt.test.mjs` sobreestima lo que verifica** — el comentario de cabecera dice que el test "reimplementa la lógica de `decrypt.mjs` usando `crypto.webcrypto` de Node... sin importar `decrypt.mjs` directamente." En la práctica el test usa `codec.decode()` de staticrypt (no una reimplementación del `aesDecrypt()` manual de `decrypt.mjs`). El test valida correctamente el round-trip a nivel de la librería staticrypt, pero un bug específico del código manual de `decrypt.mjs` (p.ej. un off-by-one en `ciphertext.slice(IV_HEX_LEN)`) lo atravesaría sin ser detectado.
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
| **30** | `articles.json` | `el-fraude-de-los-pcr` es un stub imagen-only — pendiente de contenido real | 🟡 Pendiente de revisión |
| 29 | `test/encrypt-decrypt.test.mjs` | Docstring sobreestima cobertura — no ejercita `decrypt.mjs` directamente | 🟡 Deuda técnica |
| 24 | `scripts/` | Script de rotación de contraseñas para KILOMBOTOP + STATICRYPT | 🟡 Deuda técnica |
| 25 | tooling | Blind spot de `.github/` en generador de contexto compacto | 🟡 Deuda técnica |
| 26 | global | Doble mantenimiento kilombo.top + espejo — cerrar ventana tras primer deploy | 🟡 Deuda futura |
| YunoHost-A/C/D | servidor | Abrir puerto 22, crear app, primer deploy | ⏸ Pendiente cliente |
