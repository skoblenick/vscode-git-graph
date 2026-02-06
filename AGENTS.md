# AI Agent Instructions

This is a VS Code extension for visualizing Git history as a graph. This fork is being modernized and actively maintained.

## Quick Commands

```bash
# Via devbox (recommended):
devbox shell          # Enter devbox environment
pnpm install          # Install dependencies
pnpm compile          # Full build (lint → clean → compile-src → compile-web)
pnpm compile-src      # Backend only (src/ → out/)
pnpm compile-web      # Frontend only (web/ → media/)
pnpm test             # Run Jest tests
pnpm package          # Create .vsix package

# Or install devbox first:
# https://www.jetpack.io/devbox
# devbox install && devbox shell
```

**Important:** Run `compile-src` before `compile-web` — webview types depend on backend output.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension Host                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ src/extension.ts → activates managers & providers     │   │
│  │ src/gitGraphView.ts → owns WebviewPanel, routes msgs │   │
│  │ src/dataSource.ts → executes git commands via spawn  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↕ postMessage                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Webview (browser sandbox)                │   │
│  │ web/main.ts → UI controller, renders graph/table     │   │
│  │ web/graph.ts → graph visualization                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture.

## Key Files

| File | Purpose |
|------|---------|
| `src/extension.ts` | Entry point, activation, wiring |
| `src/gitGraphView.ts` | Webview panel host, message routing |
| `src/dataSource.ts` | Git command execution engine |
| `src/types.ts` | Shared types (Request/Response protocol) |
| `web/main.ts` | Main UI controller (⚠️ monolithic, needs refactor) |
| `web/graph.ts` | Graph rendering logic |

## Current Status & Priorities

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed task tracking.

### Phase 1: Stabilization (Current)
- [ ] Add package-lock.json
- [ ] Update CI to modern Node LTS
- [ ] Update dependencies (TypeScript, Jest, ESLint)
- [ ] Bump minimum VS Code engine version

### Phase 2: Modernization
- [ ] Reduce activation scope from `*` to on-demand
- [ ] Modernize build pipeline (consider esbuild/vite)
- [ ] Refactor monolithic `web/main.ts`

## Code Conventions

- **No comments** unless code is complex
- Follow existing patterns in adjacent files
- Types live in `src/types.ts`, webview imports via `../out/types`
- Message protocol: webview sends `RequestMessage`, backend responds with `ResponseMessage`

## Testing

```bash
pnpm test                    # Run all tests
pnpm test -- --watch         # Watch mode
pnpm test -- path/to/test    # Single file
```

Tests use Jest with mocked VS Code API (`tests/mocks/vscode.ts`) and mocked git spawn (`tests/mocks/spawn.ts`).

## Known Technical Debt

1. **`web/main.ts`** — 170KB+ monolithic UI controller
2. **Activation `*`** — Extension loads on every VS Code start
3. **Custom build pipeline** — Concat + UglifyJS instead of modern bundler
4. **Old dependencies** — Node 12 in CI, TS 4.0, VS Code 1.38 engine

## Documentation Index

| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full architecture documentation |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Tasks, priorities, phase planning |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Original contribution guide |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

---

**⚠️ AI AGENTS: Keep this file and docs/ updated when making changes.**
