# SK8S Bootstrap Service

A secure, type-safe bootstrap service for SK8S (Serverless Kubernetes) components.

**Production Service:** https://bootstrap.sk8s.net

## Overview

This service generates dynamic bootstrap scripts for Kubernetes components like kubelet, controller-manager, scheduler, cri-dockerd, and kube-proxy. It uses content negotiation to return either bash scripts or JSON responses based on the client's Accept header.

## Features

- **Dynamic Script Generation** - Generates component-specific bootstrap scripts
- **Content Negotiation** - Supports `text/x-shellscript` and `application/json`
- **Security** - Built-in sanitization prevents injection attacks
- **Type Safety** - Written in TypeScript with full type coverage
- **Tested** - Comprehensive unit and integration tests (91% coverage)
- **Clean Architecture** - Modular design with separation of concerns

## API Usage

### Get Bootstrap Script

Request a bootstrap script using the User-Agent header to specify the component:

```bash
curl -H "Accept: text/x-shellscript" \
     -H "User-Agent: kubelet/v1.28.0" \
     -H "X-Machine-ID: prod-node-01" \
     https://bootstrap.sk8s.net/
```

Response:
```bash
#!/bin/bash
set -Eeuo pipefail
exec >&2

# SK8S Kubelet Bootstrap Script
# Generated on: 2026-01-12T11:35:20.548Z

echo "=== SK8S Kubelet Bootstrap ==="
echo "    Machine ID: prod-node-01"
echo "    Component: kubelet"
echo "    Version: v1.28.0"
echo ""

export KUBELET_BOOTSTRAPPED="true"
export KUBELET_BOOTSTRAPPED_BY="sk8s.net"
export KUBELET_BOOTSTRAPPED_AT="2026-01-12T11:35:20.548Z"
```

### User-Agent Formats

The service supports multiple User-Agent formats:

- **Standard format:** `kubelet/v1.28.0`
- **SK8S prefix:** `sk8s-kubelet/v1.28.0`
- **Component only:** `kubelet` (defaults to version "latest")

### Headers

- **Accept** (required): `text/x-shellscript` or `application/json`
- **User-Agent** (required): Component name and version
- **X-Machine-ID** (optional): Machine identifier (defaults to "unknown")
- **X-Machine-Token** (optional): Authentication token

### Supported Components

- `kubelet` - ✅ Implemented
- `controller-manager` - ⏳ Coming soon
- `scheduler` - ⏳ Coming soon
- `cri-dockerd` - ⏳ Coming soon
- `kube-proxy` - ⏳ Coming soon

## Security

The service includes comprehensive security measures to prevent injection attacks.

### Input Sanitization

All user-controlled inputs are sanitized:

- **Allowed characters:** Alphanumeric, dash, underscore, dot, colon, forward slash
- **Blocked patterns:** Semicolons, dollar signs, backticks, pipes, ampersands, newlines

### Examples of Blocked Attacks

```bash
# Command injection - BLOCKED
X-Machine-ID: test; rm -rf /

# Variable expansion - BLOCKED
User-Agent: kubelet/$(whoami)

# Command substitution - BLOCKED
User-Agent: kubelet/`id`
```

All injection attempts are automatically rejected with clear error messages.

## License

Functional Source License, Version 1.1, Apache 2.0 Future License (FSL-1.1-ALv2)

See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Links

- [GitHub Organization](https://github.com/sk8s-co)
- [Repository](https://github.com/sk8s-co/bootstrap.sk8s.net)
- [Production Service](https://bootstrap.sk8s.net)
