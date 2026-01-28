#!/bin/sh
ENV=""
ENV="${ENV} CLUSTER_DNS=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf)"
ENV="${ENV} CLUSTER_DOMAIN=docker.internal"
ENV="${ENV} KUBECONFIG=/var/run/kube/kubeconfig"
ENV="${ENV} KUBELET_CONFIG=/var/run/kube/kubelet-config.yaml"
ENV="${ENV} MACHINE_ID=$(cat /etc/machine-id)"
ENV="${ENV} NODE_NAME=$(hostname -s | tr '[:upper:]' '[:lower:]')"
ENV="${ENV} OIDC_ISS=https://auth.sk8s.net/"
ENV="${ENV} OIDC_AUD=https://sk8s-co.us.auth0.com/userinfo"
ENV="${ENV} OIDC_AZP=CkbKDkUMWwmj4Ebi5GrO7X71LY57QRiU"
ENV="${ENV} OIDC_SCP=offline_access"
ENV="${ENV} WATCH_MIN_TIMEOUT=\"300\""
ENV="${ENV} WATCH_MAX_TIMEOUT=\"600\""
ENV="${ENV} WATCH_BACKOFF_INIT=\"1\""
ENV="${ENV} WATCH_BACKOFF_MAX=\"30\""
ENV="${ENV} WATCH_BACKOFF_RESET=\"120\""
ENV="${ENV} WATCH_BACKOFF_FACTOR=\"2.0\""
ENV="${ENV} WATCH_BACKOFF_JITTER=\"1.0\""
ENV="${ENV} WATCH_BACKOFF_RESET_THRESHOLD=\"0\""

# Note: env.sh is intended to be subshelled
#       so we use echo to output the exports
echo "export ${ENV}"
