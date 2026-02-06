#!/bin/sh
set -eu

eval "$(RUN +env https://bootstrap.sk8s.net/.env.sh)"

exec concurrently -P \
--names "tunnel,cri,kubelet" \
--teardown stop \
"RUN +env https://bootstrap.sk8s.net/.tunnel.sh ${PROVIDER_TUNNEL:-cloudflare} ${KUBELET_PORT}" \
"RUN +env https://bootstrap.sk8s.net/.cri.sh ${PROVIDER_CRI:-docker}" \
"RUN +env https://bootstrap.sk8s.net/.kubelet.sh {*}" \
-- "$@"
