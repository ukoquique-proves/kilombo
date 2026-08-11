✅ ACCESO AUTOMÁTICO A KILOMBO.TOP — ESTADO ACTUAL

## Resumen Ejecutivo
Sí, podemos visitar **automáticamente toda la infraestructura de kilombo.top** usando las credenciales en `.env`. Sin embargo, el contenido está cifrado con StatiCrypt (AES-256), lo que requiere un paso adicional de descifrado.

---

## ¿Qué Podemos Hacer?

### ✅ Acceso Autenticado (100% funcional)
- Autenticación YunoHost SSO mediante curl (sin necesidad de Chrome)
- Mantener sesión activa con cookies HTTP
- Acceder a áreas protegidas de administración
- Descargar todo el contenido de los sitios espejo

**Pruebas exitosas:**
```
https://kilombo.top/yunohost/admin/        → HTTP 200 ✓
https://www.kilombo.top/                   → HTTP 200 ✓
https://icg-gci.kilombo.top/               → HTTP 200 ✓
https://proletariosinternacionalistas...   → HTTP 200 ✓
```

---

## ¿Qué Falta? El Descifrado de StatiCrypt

### El Problema
El contenido principal de Kilombo está cifrado **en el cliente** usando [StatiCrypt](https://staticrypt.js.org/) (AES-256-GCM):

1. **Descargamos** el HTML cifrado → ✅ Funciona
2. **Autentica contra SSO** → ✅ Funciona
3. **Desciframos el contenido** → ❌ Requiere pasos adicionales

### ¿Por Qué Está Cifrado?
StatiCrypt es una capa de seguridad **opcional** para contenido que se quiere compartir offline de forma segura (ej: mirrors, descargas, compartir con aliados). La contraseña en `.env` (`STATICRYPT_PASSWORD=otario2021`) es la clave de descifrado.

---

## Soluciones para Descifrar

### Opción 1: Navegador (más simple)
```bash
# Descargar la página cifrada
npm run scrape

# Abrir en cualquier navegador
open ./scraped-content/index.html

# Ingresar contraseña: otario2021
# → El navegador descifra automáticamente con JavaScript
```

### Opción 2: Playwright (automatizado completo)
```bash
# Ejecutar scrape.cjs que:
# 1. Autentica con YunoHost SSO
# 2. Navega a la página cifrada
# 3. Inyecta la contraseña de StatiCrypt
# 4. Guarda el HTML descifrado
node scrape.cjs
```

### Opción 3: Descifrado en Node.js (futuro)
Implementar descifrado AES-256-GCM que coincida exactamente con los parámetros de staticrypt.
(Actualmente pendiente — requiere reverse-engineering de los parámetros exactos o usar la librería `sjcl` que staticrypt usa internamente.)

---

## Flujo Técnico Actual

```
┌─────────────────────────────────────────────────────────┐
│ 1. AUTENTICACIÓN (curl-based, sin Chrome)              │
├─────────────────────────────────────────────────────────┤
│ POST https://kilombo.top/yunohost/sso/login            │
│   user:     kilombo                                     │
│   password: otario2021                      ← de .env   │
│ ✓ Sesión establecida, cookies guardadas               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. DESCARGA DE CONTENIDO (curl, con cookies activa)    │
├─────────────────────────────────────────────────────────┤
│ GET https://www.kilombo.top/                          │
│   cookies: YNH_SSO_... + session                       │
│ ✓ Descargamos HTML (11KB+)                            │
│   Contenido: CIFRADO (staticrypt-html)                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. DESCIFRADO (AES-256-GCM con staticrypt)            │
├─────────────────────────────────────────────────────────┤
│ Opción A: Navegador (manual) — Copiar/pegar contraseña│
│ Opción B: Playwright — Inyectar contraseña automático  │
│ Opción C: Node.js + sjcl — Descifrar en servidor     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. RESULTADO                                            │
├─────────────────────────────────────────────────────────┤
│ ✓ HTML descifrado + accesible                         │
│ ✓ Listo para indexar, analizar, o reeditar            │
└─────────────────────────────────────────────────────────┘
```

---

## Scripts Disponibles

| Script | Función | Requiere | Estado |
|--------|---------|----------|--------|
| `scrape-curl.sh` | Descarga contenido cifrado | .env | ✅ Prod |
| `scrape.cjs` | Descifra automático (Playwright) | Chrome | ⚠️ CDP bloqueado aquí |
| `decrypt-staticrypt.mjs` | Descifra en Node.js | sjcl config | 🔧 WIP |

---

## Por Qué Se Usa StatiCrypt?

Kilombo es un archivo/espejo de publicaciones internacionalistas. StatiCrypt permite:

1. **Distribución offline segura** — Compartir archivos .html sin servidor
2. **Acceso autenticado doble** — SSO + contraseña adicional
3. **Redundancia** — Mirrors cifrados que se pueden alojar en cualquier servidor estático
4. **Privacidad** — Ningún servidor descifra; solo el navegador del usuario lo hace

---

## Credenciales Relevantes (de `.env`)

```env
# YunoHost SSO (acceso a toda la infraestructura)
KILOMBOTOP_USER=kilombo
KILOMBOTOP_PASSWORD=otario2021

# StatiCrypt (descifrado de contenido)
STATICRYPT_PASSWORD=otario2021

# Nota: Ambas usan la misma contraseña (coincidencia en este setup)
```

---

## Estado de la Infraestructura

✅ **Autenticación SSO** — Funcional  
✅ **Acceso a sitios espejo** — Funcional  
✅ **Descarga de contenido cifrado** — Funcional  
⚠️ **Descifrado automatizado en el sandbox** — Requiere Opción A (navegador) u Opción B (Playwright en máquina local)  

---

## Próximos Pasos

1. **Corto plazo:** Usar `npm run scrape` + navegador (Opción 1) para acceso manual
2. **Mediano plazo:** Ejecutar `scrape.cjs` en máquina local donde Chrome funciona
3. **Largo plazo:** Implementar descifrado Node.js nativo (reverse-engineer sjcl o usar librería equivalente)