#!/bin/sh
set -eu

API_SERVER_IDENTITY="${API_SERVER_IDENTITY:-false}"
WATCH_LIST_CLIENT="${WATCH_LIST_CLIENT:-false}"

{
    # Pretty print the execution
    echo ".features.sh (bootstrap.sk8s.net) >>>"
    echo "  API Server Identity: ${API_SERVER_IDENTITY}"
    echo "  Watch List Client: ${WATCH_LIST_CLIENT}"
    echo ""
} >&2

# This is intended to be subshelled into startup flags for apiserver, controller-manager, scheduler, and kubelet
echo "APIServerIdentity=${API_SERVER_IDENTITY},WatchListClient=${WATCH_LIST_CLIENT}"