#!/bin/sh
set -eu

RUN +env https://bootstrap.sk8s.net/.assert.sh
eval "$(RUN +env https://bootstrap.sk8s.net/.env.sh)"

RUN +env +raw https://bootstrap.sk8s.net/.stop.sh > /usr/local/bin/stop
chmod +x /usr/local/bin/stop

exec concurrently -P \
--names "tunnel,cri,kubelet" \
--teardown "stop" \
"RUN +env https://bootstrap.sk8s.net/.tunnel.sh ${PROVIDER_TUNNEL:-cloudflare} ${KUBELET_PORT}" \
"RUN +env https://bootstrap.sk8s.net/.cri.sh ${PROVIDER_CRI:-docker}" \
"RUN +env https://bootstrap.sk8s.net/.kubelet.sh {*}" \
-- "$@"
