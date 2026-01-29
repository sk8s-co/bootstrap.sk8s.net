#!/bin/sh
set -eu

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <port> [cloudflared-args...]" >&2
    exit 1
fi

PORT="$1"
shift 1

URL="https://127.0.0.1:${PORT}"
# Deterministic port in ephemeral range (49152-65535) based on URL
METRICS_PORT=$(echo "${URL}" | cksum | awk '{print ($1 % 16384) + 49152}')

mkdir -p "/var/run/${PORT}"
HOSTNAME_FILE="/var/run/${PORT}/hostname"
PORT_FILE="/var/run/${PORT}/port"

# Wait for tunnel to be ready and write hostname (background)
(
    while true; do
        HOSTNAME=$(curl -fsSL "http://localhost:${METRICS_PORT}/quicktunnel" 2>/dev/null | jq -r '.hostname // empty') || true
        if [ -n "${HOSTNAME}" ]; then
            echo "${HOSTNAME}" > "${HOSTNAME_FILE}"
            echo "443" > "${PORT_FILE}"
            echo "Hostname: ${HOSTNAME}" >&2
            echo "Port: 443" >&2
            break
        fi
        sleep 1
    done
) &

# Pretty print the execution
echo "cloudflared.sh (bootstrap.sk8s.net) >>>" >&2
echo "  URL: ${URL}" >&2
echo "  Metrics Port: ${METRICS_PORT}" >&2
echo "  Hostname File: ${HOSTNAME_FILE}" >&2
echo "  Port File: ${PORT_FILE}" >&2
echo "" >&2

# allow non-root ping
echo "0 2147483647" > /proc/sys/net/ipv4/ping_group_range || echo "Failed to set ping_group_range" >&2

exec /srv/cloudflared \
tunnel \
--metrics="localhost:${METRICS_PORT}" \
--no-tls-verify \
--url="${URL}" \
--loglevel warn \
"$@"
