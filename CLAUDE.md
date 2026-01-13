# Claude Development Documentation

This project was built collaboratively with Claude (Anthropic's AI assistant). This document captures the development process, architectural decisions, and context for future maintainers.

## Project Overview

**SK8S Bootstrap Service** (discovery.sk8s.net) - A secure, type-safe bootstrap service for Serverless Kubernetes components. The service generates dynamic bootstrap scripts for Kubernetes components (kubelet, controller-manager, scheduler, cri-dockerd, kube-proxy) with built-in security features and content negotiation.

### The Bigger Picture: Serverless Kubernetes

This service is part of the **SK8S (Serverless Kubernetes)** ecosystem, which aims to run Kubernetes nodes in containerized, serverless environments. The key innovation is that traditional Kubernetes nodes require persistent infrastructure, but SK8S enables ephemeral, on-demand Kubernetes nodes that can be spun up in containers.

**Related Repository**: [sk8s-co/node](https://github.com/sk8s-co/node) - A pre-built Kubelet container that includes:
- Kubernetes 1.34 kubelet
- CRI-Dockerd 0.3.21 (container runtime interface)
- CNI plugins (container networking)
- Bootstrap tooling

### How the Bootstrap Process Works

1. **Node Startup**: When an SK8S node container starts, it runs `/bin/_initialize`
2. **Discovery Call**: The initialization script makes an HTTP request to `https://bootstrap.sk8s.net` (this service):
   ```bash
   curl https://bootstrap.sk8s.net \
     -H "Accept: text/x-shellscript" \
     -H "User-Agent: dockerd-kubelet/v1.28.0" \
     -H "X-Machine-ID: node-abc123" \
     -H "X-Machine-Token: <optional-auth-token>" \
     -H "X-Debug: true"  # optional
   ```
3. **Bootstrap Script Generation**: Our service dynamically generates a bash script that:
   - Exports environment variables (`KUBELET_FLAGS`, `CRI_DOCKERD_FLAGS`)
   - Generates a machine-specific kubelet configuration file (`/etc/kubernetes/kubelet/{machineId}.yaml`)
   - Creates a symlink from `${KUBELET_CONFIG}` to the machine-specific file
   - Sets bootstrap metadata environment variables
4. **Execution**: The node sources the returned script, configuring itself
5. **Startup**: The node starts kubelet and cri-dockerd in parallel using `concurrently`
6. **Fallback**: If the bootstrap service is unavailable, the node falls back to `/bin/_standalone` with a static `standalone.yaml` configuration

### Why Dynamic Bootstrap?

Instead of baking configuration into container images:
- **Machine Identity**: Each node gets a unique configuration file named after its machine ID
- **Centralized Management**: Configuration can be updated without rebuilding containers
- **Observability**: Bootstrap service can track which nodes have bootstrapped and when
- **Flexibility**: Different nodes can receive different configurations based on headers
- **Security**: Machine tokens can enable authentication and authorization

## Development Timeline

### Initial Setup
- Express + TypeScript server with modern tooling
- Multi-stage Docker build for production optimization
- Test infrastructure with Jest and Supertest
- ESLint + Prettier for code quality

### Core Features Implemented

1. **Content Negotiation**
   - `Accept: text/x-shellscript` → Bash scripts
   - `Accept: application/json` → JSON responses
   - Browser User-Agent → HTML documentation

2. **Security Layer**
   - Input sanitization middleware to prevent injection attacks
   - Whitelist approach: only alphanumeric, dash, underscore, dot, colon, forward slash
   - Blacklist patterns: semicolons, dollar signs, backticks, pipes, ampersands, newlines
   - All user inputs (User-Agent, X-Machine-ID) sanitized before use

3. **Template System**
   - Handlebars for dynamic script generation
   - Separate templates for success (kubelet.sh.hbs) and error (error.sh.hbs) cases
   - Custom helpers (uppercase) registered globally
   - Templates imported and bundled directly into compiled output

4. **Asset Bundling**
   - All .hbs and .md files imported as ES modules
   - tsup loader converts text files to string modules
   - Single 25KB bundle includes all templates and documentation
   - No external file dependencies at runtime

5. **Documentation System**
   - README.md and CONTRIBUTING.md split for different audiences
   - `marked` library converts Markdown to HTML for browsers
   - Embedded CSS styling for professional appearance
   - Both served as HTML: / (README) and /CONTRIBUTING.md
   - Files bundled into compiled output, no runtime file reads

6. **Testing Strategy**
   - 64 tests total (32 unit, 32 integration)
   - Comprehensive code coverage
   - Tests cover: API endpoints, security validation, browser detection, error handling, debug mode, YAML generation
   - Integration tests use app factory for isolation
   - Custom Jest transformer (tests/fileTransformer.cjs) handles .hbs/.md/.yaml imports

7. **Dynamic YAML Generation** (January 2026)
   - Kubelet configuration generated dynamically from template (`kubelet.yaml`)
   - YAML parsed with `js-yaml` library for validation at startup
   - Machine-specific config files: `/etc/kubernetes/kubelet/{machineId}.yaml`
   - Timestamp comment added to generated files: `# Generated at {ISO8601}`
   - Symlink created from `${KUBELET_CONFIG}` to machine-specific file
   - YAML bundled into output via tsup loader (`.yaml: 'text'`)
   - Past-tense status messages for retroactive display (infos/warns/fatals)

8. **Debug Mode** (January 2026)
   - `X-Debug` header support (accepts: `true`, `1`, `yes`)
   - Uses bash `set -x` for automatic command tracing in debug mode
   - Debug header block includes: timestamp, component, version, machine ID, user-agent, token length
   - Machine tokens redacted in debug output with length shown
   - Verbose error output with stack traces when debug enabled
   - Both script and JSON error responses support debug mode

## Architectural Decisions

### Factory Pattern
Chose factory functions over classes for dependency injection:

```typescript
// Enables clean testing with fresh instances
const app = createApp();
const router = router();
const middleware = sanitized();
```

**Rationale**: Easier to test, no constructor complexity, clear separation of concerns.

### Middleware Pipeline
```
express.json()
→ express.urlencoded()
→ sanitized()           # Skips: documentation paths (/CONTRIBUTING.md), browser requests
→ router()
→ errorHandler
```

**Rationale**: Documentation paths and browser requests skip sanitization, errors formatted based on Accept header.

### Module Structure
- `app.ts` - App factory (testable)
- `index.ts` - Server startup only
- `router.ts` - Route definitions with browser detection, documentation routes
- `middleware.ts` - Sanitization and error handling
- `readme.ts` - README.md → HTML converter
- `contributing.ts` - CONTRIBUTING.md → HTML converter
- `kubelet.ts` - Kubelet script generator
- `utils.ts` - Pure functions (sanitization, parsing, browser detection)
- `types.ts` - TypeScript interfaces

**Rationale**: Clear separation between testable business logic and runtime concerns. Each generator module imports its template/markdown file.

### Type Safety Approach
- Made all required fields non-optional in types
- Provide defaults at application layer, not template layer
- Example: `machineId: 'unknown'`, `version: 'latest'`

**Rationale**: Templates should never handle null/undefined, eliminates edge cases.

### Asset Bundling Strategy
All text assets (templates, markdown, YAML) imported as ES modules:

```typescript
// Import as module (tsup handles the conversion)
import templateSource from './templates/kubelet.sh.hbs';
import readmeContent from '../README.md';
import kubeletYamlSource from './templates/kubelet.yaml';

// Use directly at runtime
const template = Handlebars.compile(templateSource);
const html = marked(readmeContent);
const parsed = yaml.load(kubeletYamlSource);
```

**Rationale**:
- Single bundle, no external file dependencies
- Faster startup (no fs.readFileSync calls)
- Works identically in all environments
- Easier deployment (just copy dist/index.js)
- tsup loader configuration: `{ '.hbs': 'text', '.md': 'text', '.yaml': 'text' }`
- Jest transformer handles same file types for testing

## Security Considerations

### Input Validation
All external inputs validated before use:

1. **User-Agent Header**
   - Parsed to extract component and version
   - Component must be in allowed list
   - Sanitized for shell safety

2. **X-Machine-ID Header**
   - Sanitized for shell safety
   - Defaults to "unknown" if missing

3. **X-Machine-Token Header**
   - Optional, for future authentication
   - Not currently used in scripts

### Injection Prevention
Examples of blocked attacks:

```bash
# Command injection
X-Machine-ID: test; rm -rf /

# Variable expansion
User-Agent: kubelet/$(whoami)

# Command substitution
User-Agent: kubelet/`id`
```

All rejected with clear error messages in bash script format.

## Testing Philosophy

### Test Organization
- Unit tests colocated with source (`utils.test.ts`)
- Integration tests in separate directory (`tests/`)
- Factory pattern enables isolated test instances

### Coverage Goals
- Focus on business logic and security (91.62% statements)
- Main entry point (index.ts) has 0% coverage by design (not testable)
- Templates tested via integration tests

### Test Categories
1. **Sanitization Tests** - Validate allowed/blocked characters
2. **Component Tests** - Valid component detection
3. **Parser Tests** - User-Agent parsing logic
4. **API Tests** - Full request/response cycles
5. **Browser Tests** - HTML rendering for browsers
6. **Security Tests** - Injection attempt handling

## Build & Deploy

### Development
```bash
yarn dev    # Watch mode with auto-reload
```

### Production
```bash
yarn build  # TypeScript → JavaScript with tsup
yarn start  # Build + Start server
```

### Docker
```bash
docker build -t sk8s-bootstrap:latest .
docker run -p 3000:3000 sk8s-bootstrap:latest
```

Multi-stage build:
- Stage 1 (builder): Full dev dependencies, build TypeScript (bundles all assets)
- Stage 2 (runner): Production dependencies only, copy dist/ only (self-contained bundle)

## Configuration Files

### tsup.config.ts
- Entry: `src/index.ts`
- Target: Node 18
- Format: CommonJS (for compatibility)
- Loader: `{ '.hbs': 'text', '.md': 'text', '.yaml': 'text' }` - Bundles text files as string modules

### jest.config.js
- Preset: ts-jest
- ESM transformation for marked library
- Custom transformer for `.hbs`, `.md`, and `.yaml` files: `tests/fileTransformer.cjs`
- Coverage thresholds not enforced (informational)

### tests/fileTransformer.cjs
- Jest transformer that reads `.hbs`, `.md`, and `.yaml` files
- Returns file content as CommonJS module string export
- Enables Jest to handle the same imports that tsup processes
- Uses `.cjs` extension to explicitly mark as CommonJS

### .dockerignore
- Excludes: node_modules, dist, coverage, .git, logs
- **Note**: README.md and templates now bundled, not copied separately

### .gitignore
- Minimally permissive: only ignores node_modules, dist, coverage, .env, logs, .DS_Store
- Allows: IDE configs, .claude/, editor settings (team can decide what to commit)

## License Decision

**FSL-1.1-ALv2** (Functional Source License)

- First 2 years: Restricts commercial competing uses
- After 2 years: Automatically converts to Apache 2.0
- Chosen for: Patent protections, contributor clarity

## Known Issues & Future Work

### Warnings
- `marked` library ESM import warning (Node.js experimental feature)
  - Non-blocking, works correctly
  - Will resolve when Node.js stabilizes ESM in require()

- License warning in Docker build
  - FSL-1.1-ALv2 not yet in SPDX registry
  - Functionally correct, cosmetic warning only

### Future Enhancements
1. **Authentication** - Use X-Machine-Token for auth
2. **Component Implementations** - controller-manager, scheduler, cri-dockerd, kube-proxy
3. **Database Integration** - Track bootstrapped machines
4. **Metrics** - Prometheus endpoint for observability
5. **Rate Limiting** - Prevent abuse

## API Routes

### Current Endpoints
1. **GET /** - Bootstrap API or README (based on User-Agent/Accept)
   - Browser User-Agent → HTML (README.md)
   - `Accept: text/x-shellscript` → Bash script
   - `Accept: application/json` → JSON response

2. **GET /CONTRIBUTING.md** - Contributing guide as HTML
   - Always returns HTML regardless of User-Agent
   - Skips sanitization middleware
   - Useful for developers to read guidelines in browser

## Development Tips

### Adding New Components
1. Create template in `src/templates/component.sh.hbs`
2. Add component to `Component` type in `types.ts`
3. Update `isValidComponent()` in `utils.ts`
4. Add route handler in `router.ts`
5. Write integration tests

### Modifying Sanitization Rules
1. Update regex in `sanitizeForBash()` in `utils.ts`
2. Add unit tests for new allowed/blocked patterns
3. Update README.md security section

### Updating HTML Style
1. Modify `styles` constant in `src/readme.ts` and `src/contributing.ts`
2. Both files use identical styles for consistency
3. Changes apply to all documentation pages automatically

## Development Process Notes

### Iterative Refinement
- Started with basic Express setup
- Added security layer after initial implementation
- Refactored to factory pattern for testability
- Switched from Handlebars template to marked for README

### Key Refactorings
1. **Middleware Extraction** - Moved sanitization from route to middleware
2. **App Factory** - Enabled testing by separating app creation from server startup
3. **Router Factory** - Isolated routing logic from app configuration
4. **Template Safety** - Moved null handling from templates to application layer
5. **README Generation** - Switched from static HTML to dynamic Markdown rendering
6. **Asset Bundling** - Converted from runtime file reads to compile-time bundling
7. **Documentation Split** - Separated README (users) from CONTRIBUTING (developers)
8. **Dynamic YAML Generation** (Jan 2026) - Replaced static file copy with templated YAML generation
9. **Debug Mode with set -x** (Jan 2026) - Replaced manual echo statements with bash trace mode
10. **Past-Tense Messaging** (Jan 2026) - Changed status messages to past tense for retroactive display

### Testing Approach Evolution
- Initially: Manual curl testing
- Added: Unit tests for utilities
- Expanded: Integration tests for full API
- Added: Debug mode and YAML generation tests
- Achieved: 64 tests with comprehensive coverage

## Code Quality Tools

### ESLint
- TypeScript-specific rules
- Prettier integration
- No console statements (except in index.ts)

### Prettier
- Consistent code formatting
- Single quotes, trailing commas
- 80 character line length (where practical)

### TypeScript
- Strict mode enabled
- No implicit any
- Full type coverage

## Performance Considerations

### Asset Loading
- All assets bundled at compile time (templates, markdown files, YAML configurations)
- No file I/O at runtime (no fs.readFileSync calls)
- Templates compiled once at startup (not per-request)
- YAML parsed and validated once at startup with js-yaml
- Marked parsing happens per-request (fast enough for this use case)
- Bundle size: ~48KB (includes all templates, documentation, and configurations)

### Docker Image Size
- Multi-stage build reduces final image size
- Production dependencies only in runner stage
- No dev dependencies (jest, eslint, etc.)
- Single self-contained bundle (dist/index.js)

## Documentation Philosophy

This CLAUDE.md file serves as:
1. **Context** for future developers
2. **Rationale** for architectural decisions
3. **Guide** for extending the project
4. **History** of how the project evolved

The goal is to make it easy for new contributors to understand not just *what* the code does, but *why* it was built this way.

## Questions for Future Development

If you're extending this project, consider:

1. **Should authentication be required?** Currently optional (X-Machine-Token)
2. **Should we log bootstrap events?** Currently no persistence
3. **Should we support YAML output?** Currently only bash/JSON
4. **Should scripts be versioned?** Currently only one version per component
5. **Should we support custom scripts?** Currently template-based only
6. **Should we support multi-cluster configurations?** Currently assumes single cluster

## Recent Development (January 2026)

### Dynamic kubelet.yaml Generation

**Problem**: The original implementation copied a static `standalone.yaml` file, which didn't allow for per-node customization or tracking when configurations were generated.

**Solution**: Implemented dynamic YAML generation from a template with the following features:
- Template file (`kubelet.yaml`) imported and bundled at compile time
- YAML validated with `js-yaml` library at startup
- Machine-specific config files generated: `/etc/kubernetes/kubelet/{machineId}.yaml`
- Timestamp comment added to track generation time: `# Generated at 2026-01-13T15:11:52.657Z`
- Symlink created from `${KUBELET_CONFIG}` to machine-specific file
- Past-tense status messages for retroactive display in node logs

**Benefits**:
- Each node has a unique, identifiable configuration file
- Troubleshooting easier with timestamps and machine IDs
- Centralized template management (no need to rebuild containers)
- Foundation for future per-node configuration customization

### Debug Mode Implementation

**Problem**: Debugging bootstrap failures required manually adding echo statements and rebuilding the service.

**Solution**: Implemented `X-Debug` header support with intelligent debug output:
- Bash `set -x` for automatic command tracing (shows actual execution, not manual echoes)
- Debug header block with bootstrap metadata (timestamp, component, version, machine ID, user-agent)
- Machine tokens redacted with length shown for security
- Stack traces included in error responses when debug enabled
- Works for both shellscript and JSON response formats

**Benefits**:
- On-demand debugging without code changes
- No duplicate output (bash trace shows execution directly)
- Security-conscious (tokens redacted)
- Better troubleshooting for node operators

### Technical Improvements

1. **TypeScript Module Declarations**: Created `src/types/modules.d.ts` for `.yaml` file imports
2. **Build Configuration**: Added `.yaml` loader to both tsup and Jest transformer
3. **Test Coverage**: Maintained 64 passing tests with YAML generation and debug mode coverage
4. **Bundle Size**: Increased to ~48KB (from ~25KB) due to YAML configurations
5. **Dependencies**: Added `js-yaml` and `@types/js-yaml` for YAML processing

### Integration with sk8s-co/node

The generated bootstrap scripts are designed to work seamlessly with the [sk8s-co/node](https://github.com/sk8s-co/node) container:

**Node Bootstrap Flow**:
1. Container starts → `/bin/start` → `/bin/_initialize`
2. `_initialize` checks if already bootstrapped (config file exists)
3. If not bootstrapped, fetches script from `https://bootstrap.sk8s.net` with headers
4. Sources the returned script which generates kubelet.yaml and sets environment variables
5. Displays infos/warns/fatals from bootstrap process
6. Falls back to `/bin/_standalone` if service unavailable
7. Starts kubelet and cri-dockerd in parallel

**Environment Variables Set**:
- `KUBELET_FLAGS`: Configuration path, root dir, cert dir, cluster domain/DNS
- `CRI_DOCKERD_FLAGS`: Runtime endpoint, root directory, network plugin, hairpin mode
- `{COMPONENT}_BOOTSTRAPPED`: Set to "true" after successful bootstrap
- `{COMPONENT}_BOOTSTRAPPED_BY`: Identifies bootstrap service ("sk8s.net")
- `{COMPONENT}_BOOTSTRAPPED_AT`: ISO8601 timestamp of bootstrap

This design enables stateless, ephemeral Kubernetes nodes that can be dynamically configured and tracked without persistent infrastructure or manual configuration management.

## Conclusion

This project demonstrates a modern, secure, type-safe approach to building a bootstrap service. The architecture prioritizes security, testability, and maintainability. The codebase is ready for production use and easy to extend with new components.

Built with Claude, January 2026.
