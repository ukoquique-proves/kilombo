# DATA_VERIFICATION — Confirmación de Fuente Única

## Resumen

Los dos archivos que documentan `www.kilombo.top` provienen de **la misma fuente de datos en vivo**, extraída mediante scraping automático en la misma fecha (11 de agosto de 2026).

### Archivos Relacionados

| Archivo | Propósito | Formato | Estado |
|---------|-----------|---------|--------|
| **`kilombo_visitor_report.md`** | Informe de visita técnico directo | Markdown limpio | ✅ Producción |
| **`SOURCE_VISITING.md`** | Análisis ampliado + contexto de mirror | Markdown con metadatos | ✅ Producción |

---

## Verificación de Integridad de Datos

### ✅ Catálogo de Artículos
- **Archivo 1 (visitor_report):** 54 artículos (tablas)
- **Archivo 2 (SOURCE_VISITING):** 54 artículos (tablas)
- **Resultado:** ✓ **IDÉNTICOS** — mismos IDs, mismos títulos, misma ordenación

### ✅ Secciones (Rubriques)
- **Archivo 1:** 6 secciones identificadas
- **Archivo 2:** 6 secciones identificadas
- **Resultado:** ✓ **IDÉNTICOS** — rubrique4, 6, 19, 20, 24, 25

### ✅ Vídeos Identificados
- **Archivo 1:** 4 vídeos en cloud.kilombo.top (Curso Salud Holística)
- **Archivo 2:** 4 vídeos en cloud.kilombo.top (Curso Salud Holística)
- **URLs de descarga:** ✓ **IDÉNTICAS** — rgdncNYtfdsGFQk, dRr52dHQ8nSWwqH, KzRQproMb3A5epk, 7JcPz9w2xiTNzej

### ✅ Metadatos del Servidor
- IP: `80.67.181.245` — **Ambos mencionan**
- Motor: SPIP 4.4.15 — **Ambos mencionan**
- Tema: Escal 5.2.9 — **Ambos mencionan**
- Servidor: nginx — **Ambos mencionan**

---

## Origen de los Datos

Ambos archivos fueron generados por el **script `scrape-curl.sh`** que autentica con credenciales YunoHost (`KILOMBOTOP_USER` / `KILOMBOTOP_PASSWORD`) y descarga contenido de `https://www.kilombo.top/` mediante HTTP.

```bash
# Comando que generó ambas versiones
bash scrape-curl.sh

# Output
✓ Authenticated: YES (YunoHost SSO)
✓ Session stored: /tmp/kilombo-cookies.txt
✓ Content location: ./scraped-content/
```

---

## Uso en el Proyecto

### Para Construcción del Mirror
El contenido en ambos archivos define la **estructura y contenido del sitio original** que el portal espejo (GitHub Pages) debe replicar/mejorar:

| Dato | Uso |
|------|-----|
| 54 artículos | Mapeo 1:1 a fichas del portal (con campos adicionales: descripción, categorización) |
| 6 secciones | Mapeo a 4 divisiones del portal (con reorganización) |
| 5+ vídeos | Integración en sección "Plandemismo" del portal |
| Metadatos RSS | Fechas de publicación, autores, enlaces a fuente |

### Para Validación de Acceso
Confirma que el **acceso automatizado al sitio funciona** y que podemos descargar datos en vivo sin intervención manual.

---

## Diferencias de Formato

Aunque **los datos son idénticos**, los archivos tienen diferentes presentaciones:

### `kilombo_visitor_report.md`
- ✅ Más técnico y directo
- ✅ Enfoque en "lo que ve el visitante"
- ✅ Estructura lineal (secciones 1→7)
- ✅ Ideal para auditoría de contenido

### `SOURCE_VISITING.md`
- ✅ Más narrativo y contextual
- ✅ Incluye explicación del acceso (SSO, StatiCrypt, etc.)
- ✅ Agrupa datos por tema (estructura, artículos, vídeos, estado)
- ✅ Ideal para documentación del equipo de desarrollo

---

## Conclusión

✅ **Confirmado:** Ambos archivos documentan la misma realidad del servidor en vivo.

La información que hemos estado usando para construir el mirror site es **precisa, verificable y reproducible** mediante el script automatizado `scrape-curl.sh`.

**Próximo paso:** Usar estos datos para validar la cobertura del contenido en el mirror site y detectar cualquier gap.
