#!/bin/sh
set -eu

echo "Waiting for docker socket..."
while [ ! -S "/var/run/docker.sock" ]; do
    sleep 1
done
echo "Docker socket is ready."

exec /srv/cri-dockerd \
--container-runtime-endpoint=unix:///var/run/cri-dockerd.sock \
--cri-dockerd-root-directory=/var/run/kube/cri-dockerd \
--network-plugin=cni \
--hairpin-mode=hairpin-veth
