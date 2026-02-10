#!/bin/sh
set -eu

# Pretty print the execution
echo ".stop.sh (bootstrap.sk8s.net) >>>"
echo "  Node Name: ${NODE_NAME:-}"
echo ""

# Gather container IDs and pods upfront
containers=$(docker ps -q --filter "label=io.kubernetes.docker.type" 2>/dev/null || true)
pods=$(kubectl get pods --all-namespaces --field-selector spec.nodeName="${NODE_NAME:-}" -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} {end}' 2>/dev/null || true)

echo "Containers to stop:"
for id in $containers; do echo "  - $id"; done

echo "Pods to update:"
for pod in $pods; do echo "  - $pod"; done

echo ""

# Run all commands in parallel
echo "Applying NoSchedule taint to ${NODE_NAME:-}..."
kubectl taint node "${NODE_NAME:-}" node.kubernetes.io/not-ready:NoSchedule --overwrite &

echo "Applying NoExecute taint to ${NODE_NAME:-}..."
kubectl taint node "${NODE_NAME:-}" node.kubernetes.io/not-ready:NoExecute --overwrite &

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
}' &

for id in $containers; do
    echo "Stopping container: $id"
    docker stop -t 1 "$id" &
done

for pod in $pods; do
    echo "Updating pod $pod..."
    kubectl patch pod "${pod##*/}" -n "${pod%%/*}" --subresource=status --type=json -p '[{"op":"replace","path":"/status","value":{"phase":"Pending"}}]' &
done

wait

echo "Shutdown complete."
exit 0
