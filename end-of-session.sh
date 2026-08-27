#!/bin/bash
# =========================================================
# end-of-session.sh
# =========================================================
# Ejecutar AL TERMINAR cada sesión de trabajo.
#
# Hace dos cosas en orden:
#   1. Push a GitHub (main) → GitHub Pages se actualiza
#      automáticamente en ~30 segundos.
#   2. Deploy a kilombo.top → sincroniza el servidor real.
#
# El paso 2 requiere que el puerto SSH (22) esté accesible.
# Si está bloqueado, el script lo indica y termina el paso 1
# con éxito de todas formas (GitHub Pages queda actualizado).
#
# USO:
#   chmod +x end-of-session.sh   (solo la primera vez)
#   ./end-of-session.sh
# =========================================================

set -e

HERE="$(cd "$(dirname "$0")" && pwd)"

# Cargar .env
if [ -f "${HERE}/.env" ]; then
  set -a; . "${HERE}/.env"; set +a
fi

echo "============================================================"
echo " FIN DE SESIÓN — Kilombo deploy"
echo "============================================================"
echo ""

# ---- PASO 1: Push a GitHub → GitHub Pages ----
echo "[ 1/2 ] Subiendo cambios a GitHub (rama main)..."
cd "${HERE}"

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git status --porcelain)" ]; then
  echo "       Hay cambios sin commitear. Haz commit antes de continuar."
  echo "       Ejecuta: git add . && git commit -m 'tu mensaje'"
  echo "       Luego vuelve a ejecutar end-of-session.sh"
  exit 1
fi

# Check if there are commits to push
if git status | grep -q "Your branch is up to date"; then
  echo "       No hay commits nuevos — GitHub Pages ya está actualizado."
else
  TOKEN="${GITHUB_TOKEN:-}"
  if [ -n "$TOKEN" ]; then
    git remote set-url origin "https://${TOKEN}@github.com/ukoquique-proves/kilombo.git"
  fi
  git push origin main
  echo "       ✅ Push a GitHub completado."
  echo "       🌍 GitHub Pages: https://ukoquique-proves.github.io/kilombo/"
  echo "          (disponible en ~30 segundos)"
fi

echo ""

# ---- PASO 2: Deploy a kilombo.top ----
echo "[ 2/2 ] Sincronizando kilombo.top..."

: "${KILOMBOTOP_HOST:=kilombo.top}"
: "${KILOMBOTOP_PORT:=22}"

if ! nc -zw5 "${KILOMBOTOP_HOST}" "${KILOMBOTOP_PORT}" 2>/dev/null; then
  echo "       ⚠️  Puerto ${KILOMBOTOP_PORT} no accesible en ${KILOMBOTOP_HOST}."
  echo "       El servidor real NO se ha actualizado."
  echo ""
  echo "       Para habilitarlo:"
  echo "       → https://${KILOMBOTOP_HOST}/yunohost/admin/ → Herramientas → Firewall → TCP ${KILOMBOTOP_PORT}"
  echo "       → Luego ejecuta: ./sync-to-production.sh"
  echo ""
  echo "============================================================"
  echo " Sesión cerrada. GitHub Pages actualizado. kilombo.top pendiente."
  echo "============================================================"
  exit 0
fi

echo "       Puerto 22 accesible — lanzando sync-to-production.sh..."
echo ""
echo "       (Nota: sync-to-production.sh requiere input interactivo."
echo "        Ver docs/SYNC-TO-PRODUCTION-DESIGN.md para detalles de seguridad.)"
echo ""
"${HERE}/sync-to-production.sh"

echo ""
echo "============================================================"
echo " Sesión cerrada. Ambos destinos actualizados."
echo "   GitHub Pages: https://ukoquique-proves.github.io/kilombo/"
echo "   Producción:   https://kilombo.top"
echo "============================================================"
