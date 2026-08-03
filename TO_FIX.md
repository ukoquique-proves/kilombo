# TO_FIX — Bugs y problemas de consistencia detectados

Auditoría activa del proyecto. Solo problemas abiertos.
Última actualización: 2026-08-03 (v0.10.0).

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

## Resumen

| # | Archivo | Problema | Estado |
|---|---------|----------|--------|
| 6 | `index.html` | Tarjetas P.I. — confirmar si URL única es correcta | 🟡 Esperando cliente |
| 11 | `plandemismo.html` + `.css` | `page-lead` centrado — confirmar intención visual | 🟡 Esperando cliente |
| A-2 | JSON data files | CTAs con URL raíz Canal7 — necesitan URLs reales por vídeo | 🟡 Esperando datos |
| 21 | `main.js` | `.card:not(a)` sin coincidencias hoy (intencionado) | 🟡 Sin acción |
