#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════════════════
# SK8S Installer
# Join your machine to a Serverless Kubernetes cluster
# ═══════════════════════════════════════════════════════════════════════════════
IMAGE_NAME="ghcr.io/sk8s-co/node:1.35"

# ─────────────────────────────────────────────────────────────────────────────────
# Parse Arguments
# ─────────────────────────────────────────────────────────────────────────────────
TEST_MISSING=""
KUBE_APISERVER=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --test-missing=*)
            TEST_MISSING="${1#*=}"
            shift
        ;;
        --*)
            # Skip unknown flags
            shift
        ;;
        *)
            # First positional argument is the API server
            if [ -z "$KUBE_APISERVER" ]; then
                KUBE_APISERVER="$1"
            fi
            shift
        ;;
    esac
done

# Helper to check if a tool should be simulated as missing
is_test_missing() {
    [[ -n "$TEST_MISSING" && ("$TEST_MISSING" == "all" || ",$TEST_MISSING," == *",$1,"*) ]]
}

# ─────────────────────────────────────────────────────────────────────────────────
# Colors & Formatting (disabled if not a TTY)
# ─────────────────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    MAGENTA='\033[0;35m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    DIM='\033[2m'
    RESET='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    MAGENTA=''
    CYAN=''
    BOLD=''
    DIM=''
    RESET=''
fi

# ─────────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────────
print_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    cat << 'EOF'
███████╗██╗  ██╗ █████╗ ███████╗
██╔════╝██║ ██╔╝██╔══██╗██╔════╝
███████╗█████╔╝ ╚█████╔╝███████╗
╚════██║██╔═██╗ ██╔══██╗╚════██║
███████║██║  ██╗╚█████╔╝███████║
╚══════╝╚═╝  ╚═╝ ╚════╝ ╚══════╝
EOF
    echo -e "${RESET}"
    echo -e "${DIM}Serverless Kubernetes${RESET}"
    echo ""
}

info() {
    echo -e "  ${BLUE}→${RESET} $1"
}

success() {
    echo -e "  ${GREEN}✓${RESET} $1"
}

warn() {
    echo -e "  ${YELLOW}!${RESET} $1"
}

error() {
    echo -e "  ${RED}✗${RESET} $1"
}

header() {
    echo ""
    echo -e "${BOLD}$1${RESET}"
}

# Run a command with confirmation
# Usage: command_confirm "description" <<'CMD'
#   docker run --rm hello-world
# CMD
command_confirm() {
    local description="$1"
    local cmd
    cmd=$(cat)  # read from stdin (heredoc)

    echo ""
    echo -e "  ${BOLD}${description}${RESET}"
    echo ""
    # Print each line with indentation
    while IFS= read -r line; do
        [[ -n "$line" ]] && printf "    ${DIM}%s${RESET}\n" "$line"
    done <<< "$cmd"
    echo ""

    printf "  ${BOLD}Proceed?${RESET} [Y/n] "
    read -r confirm < /dev/tty

    if [[ -z "$confirm" || "$confirm" =~ ^[Yy]$ ]]; then
        eval "$cmd"
    else
        echo ""
        warn "Cancelled"
        exit 0
    fi
}

# ─────────────────────────────────────────────────────────────────────────────────
# Prerequisite Checks
# ─────────────────────────────────────────────────────────────────────────────────
check_prerequisites() {
    header "Checking prerequisites..."
    
    local missing=()
    
    # Check Docker
    if is_test_missing "docker"; then
        error "Docker not found"
        missing+=("docker")
        elif command -v docker &> /dev/null; then
        local docker_version=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        success "Docker ${DIM}${docker_version}${RESET}"
    else
        error "Docker not found"
        missing+=("docker")
    fi
    
    # Check kubectl
    if is_test_missing "kubectl"; then
        error "kubectl not found"
        missing+=("kubectl")
        elif command -v kubectl &> /dev/null; then
        local kubectl_version=$(kubectl version --client -o json 2>/dev/null | grep -oE '"gitVersion":\s*"[^"]+"' | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        success "kubectl ${DIM}${kubectl_version}${RESET}"
    else
        error "kubectl not found"
        missing+=("kubectl")
    fi
    
    # Check kubelogin
    if is_test_missing "kubelogin"; then
        error "kubelogin not found"
        missing+=("kubelogin")
        elif kubectl oidc-login --version &> /dev/null; then
        local kubelogin_version=$(kubectl oidc-login --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        success "kubelogin ${DIM}${kubelogin_version}${RESET}"
    else
        error "kubelogin not found"
        missing+=("kubelogin")
    fi
    
    # If anything is missing, show installation help and exit
    if [ ${#missing[@]} -gt 0 ]; then
        echo ""
        header "Please install the missing dependencies:"
        echo ""
        
        for dep in "${missing[@]}"; do
            case $dep in
                docker)
                    echo -e "  ${BOLD}Docker${RESET}"
                    echo -e "    ${DIM}https://docs.docker.com/get-docker/${RESET}"
                    echo ""
                ;;
                kubectl)
                    echo -e "  ${BOLD}kubectl${RESET}"
                    echo -e "    ${DIM}https://kubernetes.io/docs/tasks/tools/${RESET}"
                    echo ""
                ;;
                kubelogin)
                    echo -e "  ${BOLD}kubelogin${RESET}"
                    echo -e "    ${DIM}https://github.com/int128/kubelogin${RESET}"
                    echo ""
                ;;
            esac
        done
        
        echo -e "Once installed, run this script again:"
        echo -e "  ${CYAN}curl -fsSL https://bootstrap.sk8s.net/install.sh | bash${RESET}"
        echo ""
        exit 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────────
# Prompt for Configuration
# ─────────────────────────────────────────────────────────────────────────────────
prompt_configuration() {
    header "Configuration"
    
    # If API server wasn't provided as argument, prompt for it
    if [ -z "$KUBE_APISERVER" ]; then
        echo ""
        echo -e "  Enter your Serverless Kubernetes API server URL:"
        echo -e "  ${DIM}(e.g., https://xxxxxx.lambda-url.us-east-1.on.aws)${RESET}"
        echo ""
        printf "  ${BOLD}API Server:${RESET} "
        read -r KUBE_APISERVER
        
        if [ -z "$KUBE_APISERVER" ]; then
            error "API server URL is required"
            exit 1
        fi
        echo ""
    fi
    
    success "API Server: ${DIM}${KUBE_APISERVER}${RESET}"
}

# ─────────────────────────────────────────────────────────────────────────────────
# Configure Kubeconfig
# ─────────────────────────────────────────────────────────────────────────────────
configure_kubeconfig() {
    header "Configuring kubeconfig..."
    
    # Check if context already exists
    if kubectl config get-contexts -o name 2>/dev/null | grep -q "^${KUBE_APISERVER}$"; then
        success "Context ${DIM}${KUBE_APISERVER}${RESET} already exists"

        # Verify connection
        info "Verifying connection..."
        local cluster_info
        if ! cluster_info=$(kubectl --context "$KUBE_APISERVER" cluster-info 2>&1); then
            error "Failed to connect to cluster"
            exit 1
        fi
        local control_plane=$(echo "$cluster_info" | grep -oE 'https://[^ ]+' | head -1)
        success "Control plane ${DIM}${control_plane}${RESET}"

        # Verify authentication
        info "Verifying authentication..."
        local auth_info
        if ! auth_info=$(kubectl --context "$KUBE_APISERVER" auth whoami 2>&1); then
            error "Failed to authenticate"
            exit 1
        fi
        local username=$(echo "$auth_info" | grep -E '^Username' | awk '{print $2}')
        success "Authenticated as ${DIM}${username}${RESET}"

        return
    fi

    info "Setting up new context: ${DIM}${KUBE_APISERVER}${RESET}"

    # Set cluster
    command_confirm "Configure cluster:" <<CMD
kubectl config set-cluster $KUBE_APISERVER --server=$KUBE_APISERVER
CMD

    # Set credentials (OIDC via kubelogin)
    command_confirm "Configure credentials:" <<CMD
kubectl config set-credentials $KUBE_APISERVER \\
    --exec-api-version=client.authentication.k8s.io/v1beta1 \\
    --exec-interactive-mode=IfAvailable \\
    --exec-command=kubectl \\
    --exec-arg=oidc-login \\
    --exec-arg=get-token \\
    --exec-arg=--oidc-issuer-url=https://auth.sk8s.net/ \\
    --exec-arg=--oidc-client-id=CkbKDkUMWwmj4Ebi5GrO7X71LY57QRiU \\
    --exec-arg=--oidc-use-access-token=true \\
    --exec-arg=--oidc-extra-scope=offline_access,system:authenticated,system:masters,system:nodes \\
    --exec-arg=--oidc-auth-request-extra-params=audience=$KUBE_APISERVER
CMD

    # Set context
    command_confirm "Configure context:" <<CMD
kubectl config set-context $KUBE_APISERVER --cluster=$KUBE_APISERVER --user=$KUBE_APISERVER
CMD

    # Re-run to verify
    configure_kubeconfig
    
    success "Kubeconfig configured"
}

# ─────────────────────────────────────────────────────────────────────────────────
# Start Kubelet
# ─────────────────────────────────────────────────────────────────────────────────
start_kubelet() {
    header "Starting kubelet..."
    
    local hostname=$(hostname -s)
    
    info "Hostname: ${DIM}${hostname}${RESET}"
    
    # Remove existing container if present
    if docker ps -a --format '{{.Names}}' | grep -q '^kubelet$'; then
        command_confirm "Remove existing kubelet container:" <<CMD
docker rm -f kubelet
CMD
    fi
    
    # Run docker with confirmation
    command_confirm "Starting kubelet:" <<CMD
docker run -d \\
    --name kubelet \\
    --pull always \\
    --restart always \\
    --hostname $hostname \\
    --privileged \\
    --network host \\
    --pid host \\
    --ipc host \\
    -v /etc/machine-id:/etc/machine-id:ro \\
    -v /var/run/kube:/var/run/kube \\
    -v /var/run/docker.sock:/var/run/docker.sock \\
    -v /var/lib/docker:/var/lib/docker \\
    -v /sys/fs/cgroup:/sys/fs/cgroup \\
    -v ${HOME}/.kube/cache:/root/.kube/cache \\
    -e OIDC_AUD=$KUBE_APISERVER \\
    $IMAGE_NAME
CMD
    
    success "Kubelet container started"
}

# ─────────────────────────────────────────────────────────────────────────────────
# Success Message
# ─────────────────────────────────────────────────────────────────────────────────
print_success() {
    echo ""
    echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${RESET}"
    echo -e "${GREEN}${BOLD}  Installation complete!${RESET}"
    echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════${RESET}"
    echo ""
    echo -e "  Your machine is now joining the cluster. Here's what you can do:"
    echo ""
    echo -e "  ${BOLD}Switch to this context:${RESET}"
    echo -e "    ${CYAN}kubectl config use-context ${KUBE_APISERVER}${RESET}"
    echo ""
    echo -e "  ${BOLD}Watch the logs:${RESET}"
    echo -e "    ${CYAN}docker logs -f kubelet${RESET}"
    echo ""
    echo -e "  ${BOLD}Check container status:${RESET}"
    echo -e "    ${CYAN}docker ps | grep kubelet${RESET}"
    echo ""
    echo -e "  ${BOLD}Stop the kubelet:${RESET}"
    echo -e "    ${CYAN}docker stop kubelet${RESET}"
    echo ""
    echo -e "  ${BOLD}Start it again:${RESET}"
    echo -e "    ${CYAN}docker start kubelet${RESET}"
    echo ""
    echo -e "  ${BOLD}Remove completely:${RESET}"
    echo -e "    ${CYAN}docker rm -f kubelet${RESET}"
    echo ""
    echo -e "  ${DIM}Need help? https://github.com/sk8s-co/node${RESET}"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────────
main() {
    print_banner
    check_prerequisites
    prompt_configuration
    configure_kubeconfig
    start_kubelet
    print_success
}

main "$@"
