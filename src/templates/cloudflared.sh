#!/bin/sh
set -eu

SERVICE="$1"
PORT="$2"
shift 2

URL="http://127.0.0.1:${PORT}"
METRICS_PORT=$(echo "${URL}" | cksum | awk '{print ($1 % 10000) + 2000}')
HOSTNAME_FILE="/var/run/${SERVICE}/hostname"

# Wait for tunnel to be ready and write hostname (background)
(
    while true; do
        HOSTNAME=$(curl -fsSL "http://localhost:${METRICS_PORT}/quicktunnel" 2>/dev/null | jq -r '.hostname // empty') || true
        if [ -n "${HOSTNAME}" ]; then
            echo "${HOSTNAME}" > "${HOSTNAME_FILE}"
            # Pretty print the execution
            echo "Hostname: ${HOSTNAME}" >&2
            echo "" >&2
            break
        fi
        sleep 1
    done
) &

# Pretty print the execution
echo "cloudflared.sh (bootstrap.sk8s.net) >>>" >&2
echo "  URL: ${URL}" >&2
echo "  Service: ${SERVICE}" >&2
echo "  Metrics Port: ${METRICS_PORT}" >&2
echo "  Hostname File: ${HOSTNAME_FILE}" >&2
echo "" >&2

exec /srv/cloudflared \
tunnel \
--metrics=localhost:"${METRICS_PORT}" \
--url="${URL}" \
"$@"
