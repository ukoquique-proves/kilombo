# TO_FIX — Bugs y problemas de consistencia detectados

Auditoría completa del proyecto. Ordenado por severidad.

---

## 🔴 Bugs (rompen o fallan silenciosamente)

- [x] **1. `warning-block` tiene un `margin` inválido** — `plandemismo.css`
  - Línea: `.warning-block { margin-top: 1.5rem 0 0; }`
  - `margin-top` solo acepta un valor. Los `0 0` se ignoran.
  - **Fix:** cambiar `margin-top: 1.5rem 0 0` → `margin: 1.5rem 0 0`

- [ ] **2. Rutas de subtítulos `.vtt` incorrectas en `plandemismo.html`** — todos los `data-subtitles-fr`
  - Las rutas apuntan a `subtitles/167-fr.vtt`, `subtitles/1111-fr.vtt`, etc.
  - El ROADMAP define la estructura como `assets/subtitles/{id}-fr.vtt`
  - Cuando se conecte un reproductor JS, todas las rutas darán 404.
  - **Fix:** añadir el prefijo `assets/` → `assets/subtitles/167-fr.vtt`, etc. (afecta a los IDs 167, 1111, 2250, 2252)

- [x] **3. Clase `cards-grid--featured` usada pero nunca definida en CSS** — `index.html` + `style.css`
  - Se usa en dos secciones del índice: "Espacio Tierra y Libertad" y "Nuevo Orden Mundial".
  - No existe ninguna regla para `.cards-grid--featured` en `style.css` ni en `plandemismo.css`.
  - El grid se renderiza por fallback al base `.cards-grid`, pero el comportamiento de columna única intencionado (tarjeta grande a ancho completo) no se aplica.
  - **Fix:** añadir en `style.css`:
    ```css
    .cards-grid--featured {
      grid-template-columns: 1fr;
    }
    ```

- [ ] **4. Navegación por teclado incompleta en el tablist de `plandemismo.js`**
  - El patrón WAI-ARIA para `role="tablist"` requiere navegación con teclas ←/→ entre pestañas.
  - El JS actual solo maneja `click`. Los usuarios de teclado y lectores de pantalla no pueden cambiar de pestaña con las flechas.
  - **Fix:** añadir un listener `keydown` en cada `.tab` que responda a `ArrowLeft` / `ArrowRight` moviendo el foco y activando la pestaña adyacente no deshabilitada.

- [ ] **5. `scp` en `sync-to-production.sh` despliega al directorio incorrecto**
  - `rsync` con trailing slash en el source copia el *contenido* de `site/` al destino. Correcto.
  - `scp -r "${SOURCE}"` (donde `SOURCE="…/site/"`) no interpreta el trailing slash igual: puede crear `REMOTE_PATH/site/` en vez de copiar directamente al `REMOTE_PATH`.
  - **Fix:** en el bloque `scp`, usar `"${SOURCE}."` o `"${SITE_DIR}/*"` para garantizar que se copian los contenidos, no el directorio padre.

---

## 🟡 Inconsistencias y problemas de mantenibilidad

- [ ] **6. Las dos tarjetas de "Proletarios Internacionalistas" apuntan a la misma URL** — `index.html`
  - Tanto la tarjeta ES como la FR enlazan a `https://proletariosinternacionalistas.kilombo.top/`.
  - Si la edición FR está en otro subdominio o ruta, el enlace es incorrecto.
  - Si realmente comparten URL, debería documentarse en el HTML (comentario) o unificarse en una sola tarjeta con doble chip de idioma.

- [x] **7. `--red-dark` y `--plandem-red` son la misma variable con dos nombres** — `style.css` + `plandemismo.css`
  - `style.css`: `--red-dark: #8b0000`
  - `plandemismo.css`: `--plandem-red: #8b0000`
  - Valor idéntico, nombre diferente. Si alguna vez cambia el color, hay que actualizarlo en dos sitios.
  - **Fix:** eliminar `--plandem-red` de `plandemismo.css` y usar `var(--red-dark)` en su lugar (o renombrar la variable en `style.css` a `--plandem-red` de forma consistente).

- [x] **8. `plandemismo.css` depende implícitamente de `var(--rule)` definido en `style.css`**
  - `.section-subheader h2 { border-bottom: 2px solid var(--rule); }` — `--rule` solo existe en `style.css`.
  - Funciona porque `plandemismo.html` carga ambas hojas, pero es una dependencia no declarada.
  - **Fix:** añadir `--rule` como variable en el bloque `:root` de `plandemismo.css` (aunque sea duplicada), o documentar la dependencia con un comentario.

- [x] **9. `main.js` añade `tabindex="0"` a elementos `<a>`** — `main.js` + `index.html`
  - Todos los `.card` en `index.html` son etiquetas `<a href="...">`, que ya son focusables de forma nativa.
  - El `tabindex="0"` es redundante y puede causar doble foco en algunos lectores de pantalla.
  - La tecla Enter en un `<a>` nativo ya activa el href sin necesidad del listener.
  - **Fix:** o bien guardar el script solo para cards que *no* sean `<a>` (ej. `<article>`, `<div>`), o eliminarlo para `index.html` ya que no aporta nada.

- [x] **10. Typo en el tagline de la sección GCI** — `index.html`
  - `"archivo histórico y plataforms internacionales"` → debería ser **"plataformas"**.

- [ ] **11. `page-lead` centrado vs. contenido posterior a ancho completo** — `plandemismo.html` + `plandemismo.css`
  - El bloque introductorio tiene `max-width: 80ch; margin: 0 auto`, centrándolo.
  - Las tabs y el grid de videos debajo van a ancho completo del contenedor.
  - El salto visual puede ser intencionado (bloque editorial acotado → contenido expansivo), pero vale revisar con el cliente si es la sensación deseada.

- [x] **12. `start-preview.sh` usa alias de Serveo sin cuenta registrada** — `start-preview.sh`
  - El script hace `-R "kilombo-preview:80:localhost:8080" serveo.net`.
  - Los subdominios personalizados en Serveo requieren cuenta. Sin cuenta, Serveo asigna una URL aleatoria de todas formas (lo que ocurrió en la sesión anterior), ignorando el alias.
  - **Fix:** cambiar el flag a `-R "80:localhost:${LOCAL_PORT}"` (sin alias) para comportamiento consistente sin cuenta, o documentar que se requiere cuenta en serveo.net para que el alias funcione.

---

## Resumen

| # | Archivo | Problema | Severidad |
|---|---------|----------|-----------|
| 1 | `plandemismo.css` | `margin-top` con shorthand inválido en `.warning-block` | 🔴 Bug |
| 2 | `plandemismo.html` | Rutas `.vtt` sin prefijo `assets/` | 🔴 Bug |
| 3 | `style.css` / `index.html` | `.cards-grid--featured` usada pero no definida | 🔴 Bug |
| 4 | `plandemismo.js` | Navegación ←/→ faltante en el tablist | 🔴 Bug accesibilidad |
| 5 | `sync-to-production.sh` | Fallback `scp` puede desplegar al directorio incorrecto | 🔴 Bug deploy |
| 6 | `index.html` | Ambas tarjetas P.I. (ES y FR) apuntan a la misma URL | 🟡 Inconsistencia de datos |
| 7 | `style.css` + `plandemismo.css` | `--red-dark` y `--plandem-red` duplican el mismo valor | 🟡 Mantenibilidad |
| 8 | `plandemismo.css` | Dependencia implícita en `var(--rule)` de otra hoja | 🟡 Dependencia frágil |
| 9 | `main.js` | `tabindex="0"` redundante en elementos `<a>` | 🟡 Código innecesario |
| 10 | `index.html` | Typo: "plataforms" → "plataformas" | 🟡 Error de texto |
| 11 | `plandemismo.html` / `plandemismo.css` | `page-lead` centrado vs. grid a ancho completo | 🟡 Inconsistencia visual |
| 12 | `start-preview.sh` | Alias Serveo sin cuenta no funciona, sin fallback | 🟡 Problema operacional |
