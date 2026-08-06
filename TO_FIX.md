# TO_FIX — Bugs y problemas de consistencia detectados

Auditoría activa del proyecto. Solo problemas abiertos.
Última actualización: 2026-08-06 (v0.15.0).

---

## 🔴 Acción pendiente urgente

- [ ] **23. Cambiar `KILOMBOTOP_PASSWORD` por `KILOMBOTOP_FUTURE_PASSWORD` en `.env`**
  - En cuanto el cliente confirme que el nuevo password está activo en el servidor, ejecutar:
    1. Copiar el valor de `KILOMBOTOP_FUTURE_PASSWORD` a `KILOMBOTOP_PASSWORD` en `.env`
    2. Eliminar la línea `KILOMBOTOP_FUTURE_PASSWORD` del `.env`
    3. Verificar acceso: `./sync-to-production.sh` (o el test de login de TROUBLESHOOTING.md)
  - El valor actual del password futuro está en `.env` entre comillas simples para preservar los caracteres especiales (`$$`, `&&`).

---

## 🟡 Pendiente de confirmación del cliente

- [ ] **6. Ambas tarjetas de P.I. apuntan a la misma URL** — `index.html`
  - Tarjeta ES y FR enlazan ambas a `https://proletariosinternacionalistas.kilombo.top/`.
  - **Fix:** confirmar con el cliente si el sitio PI es bilingüe en una sola URL — si es así, unificar en una tarjeta con doble chip ES+FR.

- [ ] **11. `page-lead` centrado vs. contenido a ancho completo** — `plandemismo.html` + `plandemismo.css`
  - El bloque introductorio usa `max-width: 80ch; margin: 0 auto` creando un salto visual con las tabs y el grid.
  - **Fix:** confirmar con el cliente si el estrechamiento es intencionado; si no, cambiar a `max-width: 100%; margin: 0 0 2.5rem`.

---

## 🟡 Pendiente de datos externos

- [ ] **A-2 (parcial). URLs reales de los vídeos en Canal7** — `assets/data/plandemismo-actualidad.json`, `assets/data/plandemismo-sida-covid.json`
  - Todos los `ctaUrl` en los JSON apuntan a `https://tv.canal7salta.com/` (raíz).
  - Cuando se conozcan las URLs concretas de cada vídeo, actualizar el campo `ctaUrl` en los JSON y cambiar `ctaPlaceholder` a `false`.
  - Los TODOs correspondientes están marcados en `plandemismo.js` (renderCard) y en los propios JSON.

---

## 🟡 Notas de mantenimiento (sin acción inmediata)

- [ ] **21. `main.js` — `.card:not(a)` no coincide con nada actualmente**
  - Todos los `.card` en `index.html` son `<a>`. El script no hace nada hoy.
  - Future-proofing intencionado. Sin acción necesaria salvo que se añadan cards no-anchor.

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
| 23 | `.env` | Cambiar PASSWORD por FUTURE_PASSWORD cuando el cliente confirme | 🔴 Acción pendiente |
| 6 | `index.html` | Tarjetas P.I. — confirmar si URL única es correcta | 🟡 Esperando cliente |
| 11 | `plandemismo.html` + `.css` | `page-lead` centrado — confirmar intención visual | 🟡 Esperando cliente |
| A-2 | JSON data files | CTAs con URL raíz Canal7 — necesitan URLs reales por vídeo | 🟡 Esperando datos |
| 21 | `main.js` | `.card:not(a)` sin coincidencias hoy (intencionado) | 🟡 Sin acción |
| YunoHost-A/C/D | servidor | Abrir puerto 22, crear app, primer deploy | ⏸ Pendiente cliente |
