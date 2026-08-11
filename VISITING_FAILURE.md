✅ PROBLEMA RESUELTO — ACCESO AUTOMÁTICO A KILOMBO.TOP

## El Problema (diagnosticado)
El entorno automatizado (sandbox) tenía bloqueadas las conexiones de red locales (127.0.0.1) para CDP (Chrome DevTools Protocol), lo que impedía que Playwright/Puppeteer controlara Chrome en headless.

## La Solución (implementada)
Se creó **`scrape-curl.sh`** — un script basado en curl que bypasea completamente la necesidad de Chrome:

```bash
# Opción 1: ejecutar directamente desde la CLI
bash scrape-curl.sh

# Opción 2: agregar a package.json scripts
npm run scrape
```

El script:
1. Lee credenciales de `.env` (`KILOMBOTOP_USER`, `KILOMBOTOP_PASSWORD`)
2. Autentica contra `https://kilombo.top/yunohost/sso/login`
3. Captura la cookie de sesión (`-c` flag en curl)
4. Descarga el contenido con la sesión activa (`-b` flag)
5. Guarda el HTML en `final_kilombo.html`
6. Detecta si está cifrado con StatiCrypt

## Resultado
✓ Acceso exitoso a kilombo.top sin necesidad de Chrome  
✓ No depende de CDP o localhost  
✓ Usa credenciales del `.env` (no necesita intervención manual)  
✓ Descarga la página 11+ KB completa  

## Archivos
- `scrape-curl.sh` — Script principal (curl-based)
- `scrape.cjs` — Script original de Playwright (comentado para referencia futura)
- `final_kilombo.html` — Salida (contenido descargado)