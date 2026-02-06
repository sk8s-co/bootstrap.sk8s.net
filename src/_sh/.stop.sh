#!/bin/sh
set -eu

{
    # Pretty print the execution
    echo ".stop.sh (bootstrap.sk8s.net) >>>"
    echo "  Node Name: ${NODE_NAME:-}"
    echo ""

    # TODO Make sure this is graceful in standalone mode
    echo "Applying NoSchedule taint to ${NODE_NAME:-}..."
    kubectl taint node "${NODE_NAME:-}" node.kubernetes.io/not-ready:NoSchedule --overwrite || true

    echo "Applying NoExecute taint to ${NODE_NAME:-}..."
    kubectl taint node "${NODE_NAME:-}" node.kubernetes.io/not-ready:NoExecute --overwrite || true

    echo "Setting node ${NODE_NAME:-} status to NotReady..."
    kubectl patch node "${NODE_NAME:-}" --type=merge --subresource=status -p '{
      "status": {
        "conditions": [{
          "type": "Ready",
          "status": "False",
          "reason": "NodeShutdown",
          "message": "Node is shutting down"
        }]
      }
    }' || true

    for id in $(docker ps -q --filter "label=io.kubernetes.docker.type" 2>/dev/null || true); do
        echo "Stopping container: $id"
        docker stop "$id" || echo "Failed to stop container: $id"
    done

    for pod in $(kubectl get pods --all-namespaces --field-selector spec.nodeName="${NODE_NAME:-}" -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} {end}' 2>/dev/null || true); do
        echo "Updating pod $pod..."
        kubectl patch pod "${pod##*/}" -n "${pod%%/*}" --subresource=status --type=json -p '[{"op":"replace","path":"/status","value":{"phase":"Pending"}}]' || echo "Failed to patch pod status: $pod"
    done

    echo "Shutdown complete."
} >&2

exit 0
