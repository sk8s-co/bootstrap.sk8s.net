#!/bin/sh
set -eu

echo "Waiting for cri-dockerd socket..."
while [ ! -S "/var/run/cri-dockerd.sock" ]; do
    sleep 1
done
echo "cri-dockerd socket is ready."

RUN +env +raw https://bootstrap.sk8s.net/kubelet.yaml > ${KUBELET_CONFIG}
RUN +env +raw https://bootstrap.sk8s.net/kubeconfig.yaml > ${KUBECONFIG}

echo "Starting kubelet..."
exec /srv/kubelet \
--config=${KUBELET_CONFIG} \
--kubeconfig=${KUBECONFIG} \
--root-dir=/var/run/kube \
--cert-dir=/var/run/kube/pki \
--hostname-override=${NODE_NAME} \
--cluster-domain=${CLUSTER_DOMAIN} \
--cluster-dns=${CLUSTER_DNS}
