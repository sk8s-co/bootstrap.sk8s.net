#!/bin/sh
set -eu

# Read from KUBE_FEATURE_* environment variables (set by .env.sh)
API_SERVER_IDENTITY="${KUBE_FEATURE_APIServerIdentity:-false}"
WATCH_LIST_CLIENT="${KUBE_FEATURE_WatchListClient:-false}"
RUNTIME_CLASS_IN_IMAGE_CRI_API="${KUBE_FEATURE_RuntimeClassInImageCriApi:-false}"

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
