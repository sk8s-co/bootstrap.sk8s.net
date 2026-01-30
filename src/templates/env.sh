#!/bin/sh
set -e

export OIDC_ISS="https://auth.sk8s.net/"
export OIDC_AZP="CkbKDkUMWwmj4Ebi5GrO7X71LY57QRiU"
export OIDC_SCP="offline_access,system:authenticated,system:masters,system:nodes"
export OIDC_AUD="${OIDC_AUD:-}"

ENV="OIDC_ISS=${OIDC_ISS}"
ENV="${ENV} OIDC_AZP=${OIDC_AZP}"
ENV="${ENV} OIDC_SCP=${OIDC_SCP}"
ENV="${ENV} OIDC_AUD=${OIDC_AUD:-}"

# If OIDC_AUD is set, run kubectl oidc-login
if [ -n "${OIDC_AUD:-}" ]; then
    OIDC_LOGIN=$(kubectl oidc-login get-token \
        --oidc-use-access-token=true \
        --oidc-issuer-url="${OIDC_ISS}" \
        --oidc-client-id="${OIDC_AZP}" \
        --oidc-extra-scope="${OIDC_SCP}" \
        --oidc-auth-request-extra-params="audience=${OIDC_AUD}" \
    2>/dev/null) || OIDC_LOGIN=""
    MACHINE_TOKEN=$(printf '%s' "${OIDC_LOGIN}" | jq -r '.status.token // empty')
    ENV="${ENV} MACHINE_TOKEN=${MACHINE_TOKEN}"
fi

case "${USER_AGENT:-}" in
    kubelet-dockerd/*)
        ENV="${ENV} CLUSTER_DNS=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf)"
        ENV="${ENV} CLUSTER_DOMAIN=sk8s.net"
        MACHINE_ID=$(cat /etc/machine-id 2>/dev/null || echo 'standalone')
        ENV="${ENV} KUBECONFIG=/var/run/kube/kubeconfig"
        ENV="${ENV} KUBELET_CONFIG=/var/run/kube/kubelet-config.yaml"
        # Deterministic port in ephemeral range (49152-65535) based on machine ID
        ENV="${ENV} KUBELET_PORT=$(echo "${MACHINE_ID}" | cksum | awk '{print ($1 % 16384) + 49152}')"
        ENV="${ENV} MACHINE_ID=${MACHINE_ID}"
        ENV="${ENV} NODE_NAME=$(hostname | cut -d. -f1 | tr '[:upper:]' '[:lower:]')"
        # Kubelet Periodic Watch Settings
        # Fixed interval: watch 2s → wait 30s → watch 2s → wait 30s → ...
        # Worst-case reaction time: ~32 seconds
        ENV="${ENV} WATCH_MIN_TIMEOUT=\"2\""
        ENV="${ENV} WATCH_MAX_TIMEOUT=\"2\""
        ENV="${ENV} WATCH_BACKOFF_INIT=\"30\""
        ENV="${ENV} WATCH_BACKOFF_MAX=\"30\""
        ENV="${ENV} WATCH_BACKOFF_RESET=\"30\""
        ENV="${ENV} WATCH_BACKOFF_FACTOR=\"1.0\""
        ENV="${ENV} WATCH_BACKOFF_JITTER=\"1.0\""
        ENV="${ENV} WATCH_BACKOFF_ON_EMPTY=\"true\""
    ;;
    *)
        # Kubernetes Default Behavior
        # watch 5-10min → (reconnect) → watch 5-10min → ... (backoff only on errors)
        ENV="${ENV} WATCH_MIN_TIMEOUT=\"300\""
        ENV="${ENV} WATCH_MAX_TIMEOUT=\"600\""
        ENV="${ENV} WATCH_BACKOFF_INIT=\"1\""
        ENV="${ENV} WATCH_BACKOFF_MAX=\"30\""
        ENV="${ENV} WATCH_BACKOFF_RESET=\"120\""
        ENV="${ENV} WATCH_BACKOFF_FACTOR=\"2.0\""
        ENV="${ENV} WATCH_BACKOFF_JITTER=\"1.0\""
        ENV="${ENV} WATCH_BACKOFF_ON_EMPTY=\"false\""
    ;;
esac

# Pretty print the environment variables
echo "env.sh (bootstrap.sk8s.net) >>>" >&2
echo "  User-Agent: ${USER_AGENT:-}" >&2
echo "  Environment:" >&2
printf "%s\n" "${ENV}" | tr ' ' '\n' | sort -u | awk -F= '{printf "    %-25s %s\n", $1, $2}' >&2
echo "" >&2

# Note: env.sh is intended to be subshelled
#       so we use echo to output the exports
echo "export ${ENV}"
