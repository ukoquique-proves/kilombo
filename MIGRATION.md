# MIGRATION — Del sitio original al nuevo diseño

---

## El contexto

`kilombo.top` es el sitio original del cliente. Funciona con **SPIP 4.4.15** bajo YunoHost y tiene su propio contenido, estructura y usuarios. El cliente pidió **reordenarlo por completo**.

En lugar de modificar `kilombo.top` directamente — lo que obligaría a borrar el sitio existente antes de tener el nuevo listo — se optó por construir el diseño nuevo en un **sitio espejo separado** (GitHub Pages). Así se puede ver el original y el nuevo al mismo tiempo, comparar, ajustar, y hacer los cambios con calma sin riesgo.

---

## Los dos sitios

| | Original | Espejo / nuevo diseño |
|---|---|---|
| **URL** | `https://www.kilombo.top/` | `https://ukoquique-proves.github.io/kilombo/` |
| **Tecnología** | SPIP CMS + base de datos | HTML/CSS/JS estático |
| **Estado** | Sitio en producción activo | Propuesta en desarrollo |
| **Propósito** | El sitio que existe hoy | El sitio que reemplazará al anterior |

---

## El proceso

**Ahora:** se trabaja en el espejo. Cada push a `main` actualiza GitHub Pages en ~30 segundos. El cliente puede comparar el sitio original con la propuesta en cualquier momento.

**Cuando el cliente apruebe el espejo:** se ejecuta `./sync-to-production.sh` (o `./end-of-session.sh`), que copia el contenido del espejo directamente a `kilombo.top`. El nuevo diseño reemplaza al original en un único paso.

**El sitio original no se toca** hasta ese momento de aprobación.

---

## Flujo de aprobación

```
Trabajo en espejo (GitHub Pages)
        ↓
Cliente revisa y da el OK
        ↓
./end-of-session.sh  →  kilombo.top actualizado
```

---

## Referencias

- `TROUBLESHOOTING.md` — estado del acceso SSH a `kilombo.top` y qué hay que resolver para poder hacer el deploy final
- `ROADMAP.md` — pasos pendientes de construcción del espejo antes del deploy final
- `TO_FIX.md` — bugs y pendientes activos del espejo
