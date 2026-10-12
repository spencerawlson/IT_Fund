#!/usr/bin/env bash
# Build the road-to-cissp lab images on the VM (FedServ).
#
# Usage:
#   ./build.sh                 build all images (road-to-cissp/*:latest)
#   TAG=v1 ./build.sh          build with a custom tag
#   ./build.sh python          build only the python image (3 tags)
#
# Requires: Docker daemon running, internet access (apt/pip/downloads).
# Images are local-only; nothing is pushed anywhere.
set -euo pipefail
cd "$(dirname "$0")"

TAG="${TAG:-latest}"
REGISTRY="${REGISTRY:-road-to-cissp}"

if ! docker info >/dev/null 2>&1; then
    echo "error: Docker daemon is not reachable (docker info failed)." >&2
    echo "Start it first, e.g.:  sudo systemctl start docker" >&2
    exit 1
fi

build() {
    # build <name> <dockerfile> [extra_tag ...] [--build-arg ...]
    local name="$1" dockerfile="$2"; shift 2
    local -a tags=(-t "$REGISTRY/$name:$TAG")
    local -a args=()
    while [ $# -gt 0 ]; do
        case "$1" in
            --build-arg) args+=("$1" "$2"); shift 2;;
            *) tags+=(-t "$REGISTRY/$1:$TAG"); shift;;
        esac
    done
    echo "=== building $REGISTRY/$name:$TAG ($dockerfile) ==="
    docker build -f "$dockerfile" "${tags[@]}" "${args[@]}" .
}

only="${1:-all}"
case "$only" in
    all|"")
        # NOTE: the python image is tagged three times - the three Python lab
        # definitions name different images but the environments are identical.
        build python Dockerfile.python python-basics python-automation python-netauto
        build log-triage Dockerfile.logtriage
        build security-tools Dockerfile.sectools
        # portblast extends security-tools: build order matters.
        build portblast-lab Dockerfile.portblast --build-arg "BASE_TAG=$TAG"
        build cloudshell Dockerfile.cloudshell
        build iac Dockerfile.iac
        # Phase 3 images.
        # NOTE: Dockerfile.linux-admin and Dockerfile.linux-admin-hardening are
        # created on FedServ (see deploy/DOCKER_LABS.md); the definitions
        # reference road-to-cissp/linux-admin:latest and
        # road-to-cissp/linux-admin-hardening:latest.
        build wireshark Dockerfile.wireshark
        build webapp Dockerfile.webapp
        build gitleaks Dockerfile.gitleaks
        build trivy Dockerfile.trivy
        build iac-policy Dockerfile.iac-policy
        build python-tools Dockerfile.python-tools
        ;;
    python)   build python Dockerfile.python python-basics python-automation python-netauto ;;
    log-triage) build log-triage Dockerfile.logtriage ;;
    security-tools) build security-tools Dockerfile.sectools ;;
    portblast-lab) build portblast-lab Dockerfile.portblast --build-arg "BASE_TAG=$TAG" ;;
    cloudshell) build cloudshell Dockerfile.cloudshell ;;
    iac)      build iac Dockerfile.iac ;;
    wireshark) build wireshark Dockerfile.wireshark ;;
    webapp)   build webapp Dockerfile.webapp ;;
    gitleaks) build gitleaks Dockerfile.gitleaks ;;
    trivy)    build trivy Dockerfile.trivy ;;
    iac-policy) build iac-policy Dockerfile.iac-policy ;;
    python-tools) build python-tools Dockerfile.python-tools ;;
    linux-admin) build linux-admin Dockerfile.linux-admin ;;
    linux-admin-hardening) build linux-admin-hardening Dockerfile.linux-admin-hardening ;;
    *) echo "unknown image: $only (try: all, python, log-triage, security-tools, portblast-lab, cloudshell, iac, wireshark, webapp, gitleaks, trivy, iac-policy, python-tools, linux-admin, linux-admin-hardening)" >&2; exit 1 ;;
esac

echo
echo "=== road-to-cissp images ==="
docker images --format '{{.Repository}}:{{.Tag}}\t{{.Size}}' | grep "^$REGISTRY/" | sort
