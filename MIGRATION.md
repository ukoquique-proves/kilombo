# MIGRATION — De kilombo.top al nuevo portal

Este documento define la relación entre los dos sitios activos del proyecto
y el proceso de migración gradual entre ambos.

---

## Los dos sitios

### Sitio actual — `kilombo.top` (SPIP CMS)

El sitio de producción real. Gestionado con **SPIP 4.4.15** bajo YunoHost.
Tiene su propia estructura editorial, secciones, artículos, plantillas y usuarios.
No es un sitio estático — el contenido vive en una base de datos.

URL: `https://www.kilombo.top/`

### Sitio espejo / referencia — GitHub Pages (estático)

El nuevo diseño propuesto, construido como portal estático (HTML/CSS/JS).
**No es un clon de `kilombo.top`** — es una arquitectura nueva que reorganiza
y amplía el contenido de toda la red Kilombo bajo un único punto de entrada.

URL: `https://ukoquique-proves.github.io/kilombo/`

---

## Relación entre ambos sitios

Los dos sitios son **estructuralmente diferentes** y eso es intencionado:

| Aspecto | `kilombo.top` (SPIP) | GitHub Pages (nuevo portal) |
|---|---|---|
| Tecnología | SPIP CMS + base de datos | HTML/CSS/JS estático |
| Contenido | Editorial propio de Tierra y Libertad | Portal-índice de toda la red Kilombo |
| Estructura | Secciones SPIP (rubriques) | 4 secciones: ETL · GCI · PI · NOM |
| Idiomas | ES / FR (con atraso de traducción) | ES · FR · EN (objetivo) |
| Vídeos | No | Sección Plandemismo con render desde JSON |
| Actualización | Manual desde el backend SPIP | Push a `main` → GitHub Actions |

El nuevo portal **no reemplaza** el CMS de Tierra y Libertad — lo **envuelve**:
apunta a él como sección destacada y centraliza el acceso al resto de la red
(GCI, PI, NOM, CD-Rom, etc.) que hoy no tiene ningún punto de entrada unificado.

---

## El proceso de migración

La migración es **gradual e incremental**, no un corte abrupto. El objetivo
a largo plazo es que `kilombo.top` sirva el nuevo portal estático en su raíz,
con el CMS de Tierra y Libertad accesible como subdominio o subruta.

### Fases

**Fase actual (activa):**
Construir y refinar el nuevo portal en GitHub Pages. Cada sección que se
completa en el espejo sirve como referencia visual y funcional de cómo
quedará esa parte de `kilombo.top` tras la migración.

**Fase siguiente (cuando el equipo YunoHost esté disponible):**
- Crear una app `my_webapp` para `kilombo.top` raíz en YunoHost
- Desplegar el portal estático en esa app con `./sync-to-production.sh`
- `kilombo.top` raíz pasa a servir el nuevo portal
- `www.kilombo.top` sigue siendo el CMS de Tierra y Libertad

**Fase final:**
- Migrar el contenido editorial del CMS a ficheros estáticos o a un
  generador de sitios ligero (si se decide abandonar SPIP)
- O mantener SPIP como backend editorial y el portal como frontal estático
  que consume su contenido via API/RSS

---

## Cómo usar el espejo durante el desarrollo

El espejo en GitHub Pages cumple tres funciones durante el proceso:

1. **Referencia visual para el cliente** — el cliente puede ver en tiempo real
   cómo va a quedar cada sección antes de tocar `kilombo.top`. Cualquier
   push a `main` actualiza el espejo en ~30 segundos.

2. **Banco de pruebas** — cambios de diseño, nuevas secciones, reorganizaciones
   de contenido se prueban aquí sin riesgo. `kilombo.top` no se toca hasta que
   el cliente aprueba lo que ve en el espejo.

3. **Documentación viva de la arquitectura propuesta** — el espejo es la
   especificación ejecutable de cómo quedará `kilombo.top`. Lo que se ve en
   `https://ukoquique-proves.github.io/kilombo/` es exactamente lo que se
   desplegará en producción cuando llegue el momento.

---

## Qué hay en el espejo que no está (aún) en `kilombo.top`

| Elemento | En `kilombo.top` | En el espejo |
|---|---|---|
| Portal-índice centralizado de toda la red | ❌ No existe | ✅ `index.html` |
| Sección Plandemismo con vídeos de Canal7 | Parcialmente (dentro del CMS) | ✅ `plandemismo.html` con JSON render |
| Inventario de vídeos editable sin tocar HTML | ❌ | ✅ `assets/data/*.json` |
| Subtítulos FR para vídeos | ❌ Pendiente | ✅ Estructura lista (`assets/subtitles/`) |
| Tarjetas por plataforma con estado y idioma | ❌ | ✅ `index.html` secciones 01–03 |
| Acceso unificado a GCI, PI, CD-Rom, ICG-old | ❌ Disperso | ✅ `index.html` |

---

## Qué hay en `kilombo.top` que aún no está en el espejo

| Elemento | En `kilombo.top` | En el espejo |
|---|---|---|
| Artículos editoriales propios | ✅ Decenas de artículos SPIP | ❌ Pendiente (Fase 2 ROADMAP) |
| Textos programáticos GCI (ES/FR/EN) | ✅ En `icg-gci.kilombo.top` | ❌ Solo enlace externo por ahora |
| Archivo histórico CD-Rom | ✅ En `cdrom.kilombo.top` | ❌ Solo enlace externo por ahora |
| Audios históricos de WhatsApp | ❌ Tampoco | ❌ Pendiente (Paso 3 ROADMAP) |
| Traducciones completas ES↔FR | ❌ Con atraso | ❌ Pendiente (Paso 5 ROADMAP) |

---

## Referencias cruzadas

- `ROADMAP.md` — pasos técnicos numerados de construcción del espejo y migración
- `TROUBLESHOOTING.md` — estado del acceso a `kilombo.top` y opciones para desbloquearlo
- `TO_FIX.md` — bugs y pendientes activos del portal
- `CHANGELOG.md` — historial de versiones del portal espejo
