#!/bin/bash
# =========================================================
# start-preview.sh
# =========================================================
# Arranca (o reinicia) el servidor local del sitio y crea
# un túnel HTTPS público a través de Serveo para poder
# compartir el estado actual del portal con el cliente.
#
# USO:
#   chmod +x start-preview.sh    (solo la primera vez)
#   ./start-preview.sh
#
# Luego abre la URL "HTTPS pública" que imprime el script.
# Esa URL se la puedes mandar directamente al cliente para
# que vea el sitio — no necesita acceso a tu máquina local.
# =========================================================

set -e

SITE_DIR="$(cd "$(dirname "$0")/site" && pwd)"
LOCAL_PORT=8080
# Note: named Serveo aliases require a registered account at serveo.net.
# Without an account, Serveo ignores the alias and assigns a random URL anyway.
# Using the unaliased form (-R 80:...) ensures consistent behaviour for all users.
PREVIEW_ALIAS=""

# ---- 1. Matar cualquier proceso anterior que use el puerto ----
if command -v lsof >/dev/null 2>&1; then
  EXISTING_PID="$(lsof -t -i tcp:${LOCAL_PORT} 2>/dev/null || true)"
  if [ -n "${EXISTING_PID}" ]; then
    echo "[preview] Deteniendo servidor anterior (pid ${EXISTING_PID})..."
    kill ${EXISTING_PID} 2>/dev/null || true
    sleep 1
  fi
fi

# ---- 2. Arrancar servidor HTTP local en segundo plano ----
echo "[preview] Arrancando servidor local en http://localhost:${LOCAL_PORT} ..."
cd "${SITE_DIR}"
nohup python3 -m http.server ${LOCAL_PORT} >/tmp/kilombo-local-server.log 2>&1 &
SERVER_PID=$!
sleep 1.5

# Verificar que levantó
if kill -0 ${SERVER_PID} 2>/dev/null; then
  echo "[preview] Servidor local OK (pid ${SERVER_PID}). Log: /tmp/kilombo-local-server.log"
else
  echo "[preview] ERROR: no se pudo arrancar el servidor local."
  exit 1
fi

# ---- 3. Arrancar túnel Serveo en segundo plano ----
echo "[preview] Abriendo túnel público HTTPS (Serveo)..."
nohup ssh -o StrictHostKeyChecking=no \
         -o ServerAliveInterval=60 \
         -o ExitOnForwardFailure=yes \
         -R "80:localhost:${LOCAL_PORT}" serveo.net \
         >/tmp/kilombo-serveo.log 2>&1 &
TUNNEL_PID=$!
sleep 10

# ---- 4. Extraer la URL pública del log ----
PUBLIC_URL=""
for i in 1 2 3 4 5; do
  PUBLIC_URL="$(grep -oE 'https://[^ ]+' /tmp/kilombo-serveo.log 2>/dev/null | head -n1 || true)"
  [ -n "${PUBLIC_URL}" ] && break
  sleep 2
done

# ---- 5. Resumen ----
echo ""
echo "============================================================"
echo " 🏠  Local (solo tú):        http://localhost:${LOCAL_PORT}"
if [ -n "${PUBLIC_URL}" ]; then
  echo " 🌍  Cliente (pública):      ${PUBLIC_URL}"
  echo "    (envía esta URL al cliente)"
else
  echo " ⚠️   No se pudo leer URL pública del log."
  echo "     Revisa: cat /tmp/kilombo-serveo.log"
fi
echo "============================================================"
echo ""
echo "• Para detener todo:  kill ${SERVER_PID} ${TUNNEL_PID}"
echo "• Cada modificación en ./site/ se ve INSTANTÁNEAMENTE en ambas URLs"
echo "• Cuando quieras pasar a producción, usa ./sync-to-production.sh"
echo ""
