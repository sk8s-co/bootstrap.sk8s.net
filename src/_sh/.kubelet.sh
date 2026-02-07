#!/bin/sh
set -eu

echo "Waiting for CRI socket..." >&2
while [ ! -S "/var/run/cri.sock" ]; do
    sleep 1
done
echo "CRI socket is ready." >&2

# If OIDC_AUD is set, run kubectl oidc-login
if [ -n "${OIDC_AUD:-}" ]; then
    OIDC_LOGIN=$(kubectl oidc-login get-token \
        --oidc-use-access-token=true \
        --oidc-issuer-url="${OIDC_ISS:-}" \
        --oidc-client-id="${OIDC_AZP:-}" \
        --oidc-extra-scope="${OIDC_SCP:-}" \
        --oidc-auth-request-extra-params="audience=${OIDC_AUD:-}" \
    2>/dev/null) || OIDC_LOGIN=""
    MACHINE_TOKEN="$(printf '%s' "${OIDC_LOGIN}" | jq -r '.status.token // empty')"
    export MACHINE_TOKEN
fi

RUN +env +raw https://bootstrap.sk8s.net/kubelet.yaml > "${KUBELET_CONFIG}"
RUN +env +raw https://bootstrap.sk8s.net/kubeconfig > "${KUBECONFIG}"

ROOT_DIR="/var/run/kube"
CERT_DIR="/var/run/kube/pki"
HOSTNAME_OVERRIDE="${NODE_NAME}"
CLUSTER_DOMAIN="${CLUSTER_DOMAIN:-}"
CLUSTER_DNS="${CLUSTER_DNS:-}"

# DEVNOTE: KUBELET_EXTERNAL_DNS/PORT are custom environment
#          variables that were added to our patched version of
#          kubelet.
#          They set the ExternalDNS field in the Node status.
echo "Waiting for tunnel..." >&2
export KUBELET_EXTERNAL_DNS="$(until cat "/var/run/${KUBELET_PORT}/hostname" 2>/dev/null; do sleep 1; done)"
export KUBELET_EXTERNAL_PORT="$(until cat "/var/run/${KUBELET_PORT}/port" 2>/dev/null; do sleep 1; done)"

{
    # Pretty print the execution
    echo ".kubelet.sh (bootstrap.sk8s.net) >>>"
    echo "  Kubelet Port: ${KUBELET_PORT}"
    echo "  Kubelet Config: ${KUBELET_CONFIG}"
    echo "  Kubeconfig: ${KUBECONFIG}"
    echo "  Root Directory: ${ROOT_DIR}"
    echo "  Certificate Directory: ${CERT_DIR}"
    echo "  Cluster Domain: ${CLUSTER_DOMAIN}"
    echo "  Cluster DNS: ${CLUSTER_DNS}"
    echo "  Hostname: ${HOSTNAME_OVERRIDE}"
    echo "  Host: ${KUBELET_EXTERNAL_DNS}:${KUBELET_EXTERNAL_PORT}"
} >&2

echo "Starting kubelet on port ${KUBELET_PORT}..." >&2
exec kubelet \
--feature-gates="$(RUN +env https://bootstrap.sk8s.net/.features.sh)" \
--port="${KUBELET_PORT}" \
--config="${KUBELET_CONFIG}" \
--kubeconfig="${KUBECONFIG}" \
--root-dir="${ROOT_DIR}" \
--cert-dir="${CERT_DIR}" \
--hostname-override="${HOSTNAME_OVERRIDE}" \
--cluster-domain="${CLUSTER_DOMAIN}" \
--cluster-dns="${CLUSTER_DNS}" \
"$@"
