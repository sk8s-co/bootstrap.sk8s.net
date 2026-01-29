#!/bin/sh
set -eu

echo "Waiting for cri-dockerd socket..."
while [ ! -S "/var/run/cri-dockerd.sock" ]; do
    sleep 1
done
echo "cri-dockerd socket is ready."

RUN +env +raw https://bootstrap.sk8s.net/kubelet.yaml > "${KUBELET_CONFIG}"
RUN +env +raw https://bootstrap.sk8s.net/kubeconfig.yaml > "${KUBECONFIG}"

ROOT_DIR="/var/run/kube"
CERT_DIR="/var/run/kube/pki"
HOSTNAME_OVERRIDE="${NODE_NAME}"
CLUSTER_DOMAIN="${CLUSTER_DOMAIN}"
CLUSTER_DNS="${CLUSTER_DNS}"

# DEVNOTE: KUBELET_EXTERNAL_DNS/PORT are custom environment
#          variables that were added to our patched version of
#          kubelet.
#          They set the ExternalDNS field in the Node status.
export KUBELET_EXTERNAL_DNS=$(until cat "/var/run/${KUBELET_PORT}/hostname" 2>/dev/null; do sleep 1; done)
export KUBELET_EXTERNAL_PORT=$(until cat "/var/run/${KUBELET_PORT}/port" 2>/dev/null; do sleep 1; done)

# Pretty print the execution
echo "kubelet.sh (bootstrap.sk8s.net) >>>" >&2
echo "  Kubelet Port: ${KUBELET_PORT}" >&2
echo "  Kubelet Config: ${KUBELET_CONFIG}" >&2
echo "  Kubeconfig: ${KUBECONFIG}" >&2
echo "  Root Directory: ${ROOT_DIR}" >&2
echo "  Certificate Directory: ${CERT_DIR}" >&2
echo "  Cluster Domain: ${CLUSTER_DOMAIN}" >&2
echo "  Cluster DNS: ${CLUSTER_DNS}" >&2
echo "  Hostname: ${HOSTNAME_OVERRIDE}" >&2
echo "  Host: ${KUBELET_EXTERNAL_DNS}:${KUBELET_EXTERNAL_PORT}" >&2

echo "Starting kubelet on port ${KUBELET_PORT}..."
exec /srv/kubelet \
--port="${KUBELET_PORT}" \
--config="${KUBELET_CONFIG}" \
--kubeconfig="${KUBECONFIG}" \
--root-dir=${ROOT_DIR} \
--cert-dir=${CERT_DIR} \
--hostname-override="${HOSTNAME_OVERRIDE}" \
--cluster-domain="${CLUSTER_DOMAIN}" \
--cluster-dns="${CLUSTER_DNS}" \
"$@"
