#!/bin/sh
set -eu

# Pretty print the execution
echo "kubelet.sh (bootstrap.sk8s.net) >>>" >&2
echo "  Kubelet Port: ${KUBELET_PORT}" >&2
echo "  Kubelet Arguments: $*" >&2
echo "" >&2

exec concurrently -P \
--names tunnel,kubelet \
"RUN +env https://bootstrap.sk8s.net/.tunnel.sh ${KUBELET_PORT}" \
"RUN +env https://bootstrap.sk8s.net/.kubelet.sh {*}" \
-- "$@"
