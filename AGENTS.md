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
| `web/main.ts` | Main UI controller (1436 lines, refactored) |
| `web/graph.ts` | Graph rendering logic |
| `web/statePersistence.ts` | State save/restore (extracted from main.ts) |
| `web/tableRenderer.ts` | Table & graph rendering (extracted from main.ts) |
| `web/commitDetailsView.ts` | Commit details view rendering |
| `web/contextMenuActions.ts` | Context menu builders & actions |
| `web/messageHandler.ts` | Message handler (response processing) |

## Current Status & Priorities

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed task tracking.

### Phase 1: Stabilization — ✅ Complete
All tasks done: Node 20, TypeScript 5.9, ESLint 8, Jest 29, vscode engine 1.70, frozen lockfile, pnpm audit in CI.

### Phase 2: Build Modernization — ✅ Complete
All tasks done: Activation reduced to `onStartupFinished`, esbuild for backend + webview minification, original-fs patching removed, source maps added.

### Phase 3: Webview Refactor — ✅ Complete
All tasks done: State persistence, message handlers, context menus, CDV, renderers, helpers extracted. 115 webview tests added. main.ts reduced from 3964 to 1436 lines.

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

1. **`web/main.ts`** — Refactored from 3964 to 1436 lines; remaining code is core class with observers, data loading, and CDV management

## Documentation Index

| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full architecture documentation |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Tasks, priorities, phase planning |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Original contribution guide |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

---

## 📋 Roadmap Maintenance

**⚠️ ALL AI AGENTS: After completing any task or feature:**

1. **Update `docs/ROADMAP.md`** immediately:
   - Change task status: ⬜ → 🟡 (in progress) → ✅ (complete)
   - Add notes about any blockers or discoveries
   - Update the "Changelog" section with date and summary
   
2. **Follow dependency order** in Phase 1:
   ```
   1. Add package-lock.json
   2. Update Node in CI
   3. Update TypeScript + @types
   4. Update ESLint + Jest
   5. Bump vscode engine + @types/vscode
   6. Update iconv-lite (test encoding edge cases)
   ```

3. **Always verify** changes:
   - Run `pnpm compile` and fix any TypeScript errors
   - Run `pnpm test` and ensure tests pass
   - Run `pnpm lint` for code quality

**Current Phase Priority: Phase 1 - Stabilization (Node/TypeScript/Dependencies)**
