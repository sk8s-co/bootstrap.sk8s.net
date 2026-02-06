#!/bin/sh
set -eu

PROVIDER_CRI="${PROVIDER_CRI:-${1:-docker}}"
shift || true

if [ "$PROVIDER_CRI" = "docker" ]; then
    echo "Waiting for docker socket..."
    while [ ! -S "/var/run/docker.sock" ]; do
        sleep 1
    done
    echo "Docker socket is ready."
    
    CONTAINER_RUNTIME_ENDPOINT="unix:///var/run/cri-dockerd.sock"
    CRI_ROOT_DIRECTORY="/var/run/kube/cri-dockerd"
    NETWORK_PLUGIN="cni"
    HAIRPIN_MODE="hairpin-veth"
    
    # Pretty print the execution
    echo ".cri.sh ${PROVIDER_CRI} (bootstrap.sk8s.net) >>>" >&2
    echo "  Container Runtime Endpoint: ${CONTAINER_RUNTIME_ENDPOINT}" >&2
    echo "  CRI Root Directory: ${CRI_ROOT_DIRECTORY}" >&2
    echo "  Network Plugin: ${NETWORK_PLUGIN}" >&2
    echo "  Hairpin Mode: ${HAIRPIN_MODE}" >&2
    echo "" >&2
    
    exec cri-dockerd \
    --container-runtime-endpoint=${CONTAINER_RUNTIME_ENDPOINT} \
    --cri-dockerd-root-directory=${CRI_ROOT_DIRECTORY} \
    --network-plugin=${NETWORK_PLUGIN} \
    --hairpin-mode=${HAIRPIN_MODE} \
    "$@"
else
    echo "Unsupported CRI provider: ${PROVIDER_CRI}" >&2
    sleep infinity
fi
