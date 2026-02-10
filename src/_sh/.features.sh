#!/bin/sh
set -eu

API_SERVER_IDENTITY="${API_SERVER_IDENTITY:-false}"
WATCH_LIST_CLIENT="${WATCH_LIST_CLIENT:-false}"
RUNTIME_CLASS_IN_IMAGE_CRI_API="${RUNTIME_CLASS_IN_IMAGE_CRI_API:-false}"

{
    # Pretty print the execution
    echo ".features.sh (bootstrap.sk8s.net) >>>"
    echo "  APIServerIdentity: ${API_SERVER_IDENTITY}"
    echo "  WatchListClient: ${WATCH_LIST_CLIENT}"
    echo "  RuntimeClassInImageCriApi: ${RUNTIME_CLASS_IN_IMAGE_CRI_API}"
    echo ""
} >&2

# This is intended to be subshelled into startup flags for apiserver, controller-manager, scheduler, and kubelet
echo "APIServerIdentity=${API_SERVER_IDENTITY},WatchListClient=${WATCH_LIST_CLIENT},RuntimeClassInImageCriApi=${RUNTIME_CLASS_IN_IMAGE_CRI_API}"