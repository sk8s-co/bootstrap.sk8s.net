# Contributing to SK8S Bootstrap Service

Thank you for your interest in contributing! This guide will help you get started with development.

## Development Setup

### Prerequisites

- Node.js 20+
- Yarn package manager
- Docker (optional, for container testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/sk8s-co/bootstrap.sk8s.net.git
cd bootstrap.sk8s.net

# Install dependencies
yarn install
```

### Development Server

```bash
# Start development server with hot reload
yarn dev
```

The server will start on `http://localhost:3000` and automatically reload when you make changes.

### Production Build

```bash
# Build for production
yarn build

# Start production server
yarn start
```

## Testing

### Run Tests

```bash
# Run all tests
yarn test

# Run with coverage report
yarn test:coverage

# Run unit tests only
yarn test:unit

# Run integration tests only
yarn test:integration

# Watch mode (re-run on changes)
yarn test:watch
```

### Test Coverage

The project maintains 91% test coverage. When adding new features, please include tests:

- **Unit tests** for utility functions and business logic
- **Integration tests** for API endpoints and full request/response cycles

## Code Quality

### Linting

```bash
# Check code style
yarn lint

# Auto-fix linting issues
yarn lint:fix
```

### Formatting

```bash
# Format code with Prettier
yarn format

# Check formatting without modifying
yarn format:check
```

### Type Checking

```bash
# Type check (runs during build)
yarn build
```

## Project Structure

```
src/
├── app.ts              # Express app factory
├── index.ts            # Server entry point
├── router.ts           # Route definitions
├── middleware.ts       # Middleware functions (sanitization, error handling)
├── kubelet.ts          # Kubelet script generator
├── readme.ts           # README HTML generator
├── utils.ts            # Utility functions (sanitization, parsing)
├── handlebars.ts       # Handlebars configuration and helpers
├── types.ts            # TypeScript type definitions
└── templates/
    ├── kubelet.sh.hbs  # Kubelet bootstrap script template
    └── error.sh.hbs    # Error response template

tests/
├── integration.test.ts # API integration tests
└── fileTransformer.cjs # Jest transformer for .hbs/.md files
```

## Architecture

### Factory Pattern

The application uses factory functions for clean dependency injection and testability:

```typescript
// App factory
const app = createApp();

// Router factory
app.use(router());

// Middleware factory
app.use(sanitized());
```

### Middleware Pipeline

```
express.json()
→ express.urlencoded()
→ sanitized()          # Skip for browser requests
→ router()
→ errorHandler         # Format errors based on Accept header
```

### Content Negotiation

The service automatically detects the desired response format:

- `Accept: text/x-shellscript` → Bash script
- `Accept: application/json` → JSON response
- Browser User-Agent → HTML documentation (from README.md)

### Template System

- **Handlebars** for dynamic script generation
- Templates are bundled into the compiled output (no external files needed)
- Custom helpers registered globally in `src/handlebars.ts`

### Error Handling

Errors are returned in the appropriate format based on the Accept header:

```bash
# Shellscript error format
#!/bin/bash
set -Eeuo pipefail
exec >&2

# SK8S Bootstrap Error
# Timestamp: 2026-01-12T11:35:20.548Z
# Error: Invalid Machine ID: contains unsafe characters

exit 1
```

## Adding New Components

To add support for a new component (e.g., `scheduler`):

1. **Create template** in `src/templates/scheduler.sh.hbs`
2. **Add component type** to `Component` union in `src/types.ts`
3. **Update validator** in `isValidComponent()` in `src/utils.ts`
4. **Create generator** similar to `src/kubelet.ts`
5. **Add route handler** in `src/router.ts`
6. **Write tests** in `tests/integration.test.ts`

Example:

```typescript
// src/types.ts
export type Component = 'kubelet' | 'scheduler' | ...;

// src/utils.ts
export const isValidComponent = (component: string): component is Component => {
  const validComponents: Component[] = ['kubelet', 'scheduler', ...];
  return validComponents.includes(component as Component);
};

// src/scheduler.ts
import Handlebars from './handlebars';
import { SchedulerData } from './types';
import templateSource from './templates/scheduler.sh.hbs';

const template = Handlebars.compile<SchedulerData>(templateSource);

export const generateSchedulerScript = (data: SchedulerData): string => {
  return template(data);
};
```

## Security Guidelines

### Input Sanitization

All user-controlled inputs **must** be sanitized using `sanitizeForBash()`:

```typescript
import { sanitizeForBash } from './utils';

const machineId = sanitizeForBash(req.get('X-Machine-ID') || 'unknown', 'Machine ID');
```

### Allowed Characters

- Alphanumeric: `a-zA-Z0-9`
- Dash: `-`
- Underscore: `_`
- Dot: `.`
- Colon: `:`
- Forward slash: `/`

### Blocked Patterns

- Semicolons: `;` (command chaining)
- Dollar signs: `$` (variable expansion)
- Backticks: `` ` `` (command substitution)
- Pipes: `|` (command piping)
- Ampersands: `&` (background execution)
- Newlines: `\n` (command injection)

### Testing Security

Always add tests for injection attempts when modifying sanitization logic:

```typescript
it('should block command injection', async () => {
  const response = await request(app)
    .get('/')
    .set('Accept', 'text/x-shellscript')
    .set('User-Agent', 'kubelet/v1.28.0')
    .set('X-Machine-ID', 'test; rm -rf /');

  expect(response.status).toBe(500);
  expect(response.text).toContain('Invalid Machine ID');
});
```

## Docker

### Build Image

```bash
docker build -t sk8s-bootstrap:latest .
```

### Run Container

```bash
docker run -p 3000:3000 sk8s-bootstrap:latest
```

### Multi-Stage Build

The Dockerfile uses a multi-stage build for optimization:

- **Stage 1 (builder):** Full dev dependencies, builds TypeScript
- **Stage 2 (runner):** Production dependencies only, copies built artifacts

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Pull Request Guidelines

Before submitting a PR, ensure:

1. ✅ All tests pass: `yarn test`
2. ✅ Code is properly formatted: `yarn format`
3. ✅ Linting passes: `yarn lint`
4. ✅ Type checking passes: `yarn build`
5. ✅ Test coverage is maintained or improved
6. ✅ Commit messages are clear and descriptive
7. ✅ PR description explains what and why

### Commit Message Format

```
type(scope): subject

body (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(kubelet): add support for version flags`
- `fix(sanitization): block additional injection patterns`
- `docs(readme): update API usage examples`
- `test(integration): add browser detection tests`

## Code Style

- **TypeScript strict mode** enabled
- **ESLint** for code quality
- **Prettier** for consistent formatting
- **No `console.log`** (except in `index.ts`)
- **JSDoc comments** for public APIs
- **Descriptive variable names** over comments

## Need Help?

- 📖 Read [CLAUDE.md](https://github.com/sk8s-co/bootstrap.sk8s.net/blob/main/CLAUDE.md) for architectural context
- 🐛 [Open an issue](https://github.com/sk8s-co/bootstrap.sk8s.net/issues)

## License

By contributing, you agree that your contributions will be licensed under the FSL-1.1-ALv2 license.
