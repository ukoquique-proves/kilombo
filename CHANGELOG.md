# Changelog — Kilombo Portal

Todas las modificaciones importantes del proyecto, en orden inverso (últimos cambios arriba).
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

---

## [0.5.0] — 2026-08-03

### Added (nuevo)
- **README → Sección "Sitios espejo, referencias y redes de Kilombo analizadas"**: tabla con el prototipo Replit (`kilombo-redesign--ukoquique.replit.app`) y los 6 sitios reales de la red YunoHost (Tierra y Libertad, GCI oficial, P.I., ICR inglés, ICG-old, CD-Rom), con idiomas, estado y función.
- **README → Sección "Sobre el contenido y las fuentes"**: explicita la relación de amistad política con espacios aliados (p. ej. Canal7 Salta TV), enumera los 4 principios respecto a fuentes (selección por línea, no filtrado de calidad, re-presentación ordenada, traducción, enlace SIEMPRE al origen).
- **Nuevo `CHANGELOG.md`**: este archivo.

### Changed (cambiado)
- **Tono en plandemismo.html, index.html y ROADMAP.md**: se elimina todo lenguaje de "curación" que podía ofender a espacios amigos. "Archivo curado" → "Recopilación de materiales compartidos por nuestros compañeros"; "criterios de curación" → "criterios de selección y estructura"; "nota de curación" → "criterio de presentación".
- **Tarjeta sección 03 (index.html)**: ya no enlaza a `www.kilombo.top` externo, sino internamente a `plandemismo.html`. Descripción actualizada y tags nuevos: `Videos Canal7`, `SIDA→COVID`.

---

## [0.4.0] — 2026-08-03

### Added (nuevo)
- **`.env` reformateado**: archivo estándar `KEY=VALUE` con secciones comentadas para GitHub, servidor YunoHost y credencial futura.
- **`.env.example`**: plantilla sin credenciales reales, lista para subir al repositorio público.
- **`start-preview.sh`** (ejecutable): arranca servidor local + túnel HTTPS Serveo en 1 paso. Imprime URLs local y pública para el cliente.
- **`sync-to-production.sh`** (ejecutable): sube TODO `./site/` 1:1 a `kilombo.top` por rsync (o scp), leyendo credenciales del `.env` y pidiendo confirmación `PROD`.
- **Subcarpetas `site/assets/`**: `data/`, `subtitles/`, `audios/`, `transcripts/` para inventarios JSON, subtítulos `.vtt`, MP3 y transcripciones con timestamps.
- **README → Sección "Mostrar avances al cliente"** y **"Subida a producción real"**: explica el flujo preview → producción 1:1.
- **URL preview pública activa (Serveo)**: `https://3e52f2a4e4aae552-179-29-35-153.serveousercontent.com`

---

## [0.3.0] — 2026-08-03

### Added (nuevo)
- **Página `plandemismo.html`**: sección 03 propia, independiente del índice, con:
  - 3 **pestañas (tabs)**: 01 Actualidad (activa por defecto) / 02 SIDA → COVID (Antecesores) / 03 Históricos (deshabilitada, "Próximamente").
  - **Lote 1 — Actualidad**: 9 videos de Canal7 Salta, **sin Chinda Brandolino** (cumpliendo criterio del cliente). Incluyen: "2020 el año del miedo", Analía Álvarez, APSIIN Chile, 100.000 médicos, Dr. Martínez, Dr. Monteverde (niños), Dr. David Martin Parlamento Europeo, Dra. Stückelberger (OMS), Dr. Yeadon ex-Pfizer.
  - **Lote 2 — SIDA→COVID**: documental **"ELISA MATO A RUTH" (España 2018, ID 167/1201)** en tarjeta GRANDE destacada, con el texto íntegro del cliente sobre "montaje SIDA antecesor de COVID", "del genocidio SIDA al humanicidio COVID", "víctimas atrapadas en los nada fiables test", keypoints y badge de subtítulos FR prioritarios ★★★.
  - Cada tarjeta lleva `data-subtitles-fr` / `data-subtitles-en` (estructura lista para enchufar `.vtt`).
  - Chips de idioma con 3 niveles de subtítulos FR: `pendiente` / `a subtitular ★` / `prioritarios ★★★`.
- **`css/plandemismo.css`**: paleta rojo oscuro NOM (`#8b0000`), miniaturas con botón play, chips de idioma coloreados, efecto pulse en "a subtitular", tab nav con subrayado activo, blockquote `warning-block` para la intro SIDA→COVID.
- **`js/plandemismo.js`**: navegación por tabs (click + teclado), focus + Enter/Space en tarjetas.

---

## [0.2.0] — 2026-08-03

### Added (nuevo)
- **ROADMAP.md técnico** (Pasos 1–11):
  1.  Flujo de subida / deploy
  2.  Videos Canal7 (Actualidad + SIDA→COVID + Históricos después, sin Chinda, subtítulos FR `.vtt`)
  3.  Transcripción audios de WhatsApp (inventario → MP3 normalizado → Whisper + corrección manual → página `audios-historicos.html`)
  4.  Contenido editorial por sección
  5.  **Traducciones / puesta al día de idiomas** (déficit GCI ES→FR, flujo DeepL + corrección humana obligatoria, regla "no publicar unilíngüe a partir de ahora")
  6.  Organización por idiomas en cada sección
  7–9. Revisión diseño, SEO, despliegue final
  10–11. Rutinas de actualización + monitoreo
- **Tabla "Resumen de prioridad"** al final de ROADMAP.md con tiempos estimados por bloque.

---

## [0.1.0] — 2026-08-03

### Added (nuevo)
- **Estructura inicial del proyecto local** en `site/`:
  - `index.html` — portal central con **4 secciones en orden de prioridad**:
    1.  ⭐ **Espacio Tierra y Libertad** (destacada: fondo tintado, barra roja superior, "Sección destacada", intro, tarjeta grande ES)
    2.  **01 GCI** — 4 tarjetas: Sitio Oficial ES/EN/FR, International Global Revolution (EN), CD-Rom (fondo rayado "archivo"), ICG Sitio Histórico "legado"
    3.  **02 Proletarios Internacionalistas** — 2 tarjetas lado a lado: ES + FR
    4.  **03 Nuevo Orden Mundial: plandemismo y domesticación** — tarjeta temática con borde izquierdo rojo oscuro
  - `css/style.css` — paleta papel + tinta + rojo revolucionario (`#f5f2eb / #0a0a0a / #c1121f`), Georgia editorial + Courier New mono para metadata, códigos de color por idioma (ES verde, FR azul, EN púrpura, Multi morado), status badges Activo / Archivo / Legado, tarjetas con sombra hover, fully responsive.
  - `js/main.js` — accesibilidad: tab + Enter/Espacio activan tarjetas.
- **README.md inicial** (versión 0.1): estructura del portal en 4 secciones, árbol de archivos, convenciones (IA-inglés vs. contenido-español), servidor local Python, paleta, próximos pasos.
- **Inventario inicial de la red**: documento ya presente en `INICIO/inventario-inicial-kilombo.md` (7 sitios detectados + priorización), `INICIO/pasos-trabajo-kilombo.md` (trabajo con/sin credenciales), `INICIO/ROADMAP.md` (5 fases: Diagnóstico → Clasificación → Preparación → Publicación → Mantenimiento).
