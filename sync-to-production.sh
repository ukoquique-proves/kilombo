#!/bin/bash
# =========================================================
# sync-to-production.sh
# =========================================================
# Copia TODO el contenido de ./site/ al servidor real de
# kilombo.top por rsync/SCP via SFTP, sustituyendo la
# versión del portal publicada.
#
# FLUJO DE TRABAJO:
#   - Durante la sesión: usa GitHub Pages para previsualizar
#     (push a main → auto-deploy en ~30s)
#   - Al finalizar la sesión: ejecuta este script para
#     sincronizar también el servidor real kilombo.top
#
# REQUISITOS PREVIOS:
#   1. Puerto 22 abierto en el firewall del servidor
#      → Panel YunoHost: https://kilombo.top/yunohost/admin/
#      → Herramientas → Firewall → TCP 22
#   2. Credenciales correctas en .env:
#      KILOMBOTOP_USER, KILOMBOTOP_PASSWORD, KILOMBOTOP_REMOTE_PATH
#   3. rsync o scp disponible en esta máquina
#
# USO:
#   chmod +x sync-to-production.sh   (solo la primera vez)
#   ./sync-to-production.sh
# =========================================================

set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="${HERE}/site"

# Cargar .env
if [ -f "${HERE}/.env" ]; then
  set -a; . "${HERE}/.env"; set +a
fi

# Valores por defecto
: "${KILOMBOTOP_HOST:=kilombo.top}"
: "${KILOMBOTOP_PORT:=22}"
: "${KILOMBOTOP_USER:=kilombo}"
: "${KILOMBOTOP_REMOTE_PATH:=/var/www/kilombo.top}"

# ---- Pre-flight validation ----
PREFLIGHT_OK=1

if [ -z "${KILOMBOTOP_PASSWORD}" ] || echo "${KILOMBOTOP_PASSWORD}" | grep -qi "cambia\|change\|placeholder\|your_password"; then
  echo "❌ KILOMBOTOP_PASSWORD no está configurado en .env (valor vacío o placeholder)."
  PREFLIGHT_OK=0
fi

if ! command -v rsync >/dev/null 2>&1 && ! command -v scp >/dev/null 2>&1; then
  echo "❌ Ni rsync ni scp están disponibles. Instala uno de los dos antes de continuar."
  PREFLIGHT_OK=0
fi

if ! command -v sshpass >/dev/null 2>&1; then
  echo "⚠️  sshpass no encontrado — la conexión SSH pedirá la contraseña de forma interactiva."
  echo "   Instala sshpass para automatizar: apt install sshpass"
  SSHPASS_CMD=""
else
  SSHPASS_CMD="sshpass -p ${KILOMBOTOP_PASSWORD}"
fi

# Verify port 22 is reachable before asking for confirmation
if ! nc -zw5 "${KILOMBOTOP_HOST}" "${KILOMBOTOP_PORT}" 2>/dev/null; then
  echo "❌ Puerto ${KILOMBOTOP_PORT} no accesible en ${KILOMBOTOP_HOST}."
  echo "   Abre el puerto SSH desde el panel YunoHost antes de continuar:"
  echo "   https://${KILOMBOTOP_HOST}/yunohost/admin/ → Herramientas → Firewall → TCP ${KILOMBOTOP_PORT}"
  PREFLIGHT_OK=0
fi

if [ "${PREFLIGHT_OK}" = "0" ]; then
  echo ""
  echo "Corrige los errores anteriores antes de continuar. Abortando."
  exit 1
fi
# ---- /Pre-flight validation ----

echo "============================================================"
echo "🚀 Subida a producción → ${KILOMBOTOP_USER}@${KILOMBOTOP_HOST}:${KILOMBOTOP_REMOTE_PATH}"
echo "============================================================"
echo ""

if [ ! -d "${SITE_DIR}" ]; then
  echo "❌ Carpeta ./site no existe. Abortando."
  exit 1
fi

echo "Esto SOBREESCRIBIRÁ el contenido remoto de:"
echo "   ${KILOMBOTOP_REMOTE_PATH}"
echo ""
read -p "¿Seguro? Escribe PROD para continuar:  " CONFIRM
if [ "${CONFIRM}" != "PROD" ]; then
  echo "Cancelado."
  exit 0
fi

# ---- Subida: rsync preferido, scp como fallback ----
SOURCE="${SITE_DIR}/"
REMOTE="${KILOMBOTOP_USER}@${KILOMBOTOP_HOST}:${KILOMBOTOP_REMOTE_PATH}"

if command -v rsync >/dev/null 2>&1; then
  echo ""
  echo "[sync] Usando rsync..."
  ${SSHPASS_CMD} rsync -avz --delete \
        -e "ssh -p ${KILOMBOTOP_PORT} -o StrictHostKeyChecking=no" \
        "${SOURCE}" "${REMOTE}"
else
  echo ""
  echo "[sync] rsync no encontrado — usando scp..."
  ${SSHPASS_CMD} scp -P "${KILOMBOTOP_PORT}" -o StrictHostKeyChecking=no \
        -r "${SITE_DIR}/." "${REMOTE}"
fi

echo ""
echo "✅ Hecho. El contenido de ./site/ está ahora en producción:"
echo "   https://${KILOMBOTOP_HOST}"
echo ""
