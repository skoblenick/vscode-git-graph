# Architecture

## Overview

VS Code Git Graph is a **dual-process architecture**:
- **Backend** (extension host): Node.js process with full VS Code API + filesystem access
- **Frontend** (webview): Browser sandbox with DOM access, no Node.js

Communication is via **postMessage** with a typed request/response protocol.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VS Code Extension Host                            │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      src/extension.ts                            │    │
│  │  Activation entry point. Wires up all managers and providers.    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│         ┌──────────────────────────┼──────────────────────────┐         │
│         ▼                          ▼                          ▼         │
│  ┌─────────────┐          ┌─────────────────┐         ┌─────────────┐   │
│  │ RepoManager │          │  GitGraphView   │         │ DataSource  │   │
│  │             │◄────────►│                 │◄───────►│             │   │
│  │ - discovery │          │ - WebviewPanel  │         │ - git spawn │   │
│  │ - watching  │          │ - msg routing   │         │ - parsing   │   │
│  └─────────────┘          └────────┬────────┘         └─────────────┘   │
│         ▲                          │                          ▲         │
│         │                   postMessage                       │         │
│         │                          │                          │         │
│  ┌──────┴──────┐                   │                   ┌──────┴──────┐  │
│  │AvatarManager│                   │                   │ExtensionState│  │
│  │ - fetching  │                   │                   │ - persistence│  │
│  │ - caching   │                   │                   │ - avatars    │  │
│  └─────────────┘                   │                   └─────────────┘  │
│                                    ▼                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                         Webview (Browser Sandbox)                        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         web/main.ts                              │    │
│  │  GitGraphView class - monolithic UI controller                   │    │
│  │  - State management       - Event handling                       │    │
│  │  - DOM rendering          - Request/response dispatch            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│         ┌──────────────────────────┼──────────────────────────┐         │
│         ▼                          ▼                          ▼         │
│  ┌─────────────┐          ┌─────────────────┐         ┌─────────────┐   │
│  │  web/graph  │          │   web/dialog    │         │ web/dropdown│   │
│  │ - SVG lines │          │ - modal dialogs │         │ - selects   │   │
│  └─────────────┘          └─────────────────┘         └─────────────┘   │
│                                                                          │
│  ┌─────────────┐          ┌─────────────────┐         ┌─────────────┐   │
│  │ contextMenu │          │   findWidget    │         │settingsWidget│  │
│  └─────────────┘          └─────────────────┘         └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Backend Components (`src/`)

### Core

| File | Responsibility |
|------|----------------|
| `extension.ts` | Entry point. Registers commands, creates managers, handles activation lifecycle. |
| `gitGraphView.ts` | Owns WebviewPanel. Routes messages between webview and backend services. Giant switch statement for request handling. |
| `dataSource.ts` | **Git engine**. Spawns git commands, parses output. Handles: log, refs, branches, commits, diffs, remotes, file retrieval, all git operations. |
| `types.ts` | Shared TypeScript types for backend + webview. Defines `RequestMessage`, `ResponseMessage`, domain models. |

### State & Persistence

| File | Responsibility |
|------|----------------|
| `extensionState.ts` | Persistence layer. Workspace state (repos, ignored repos) + global state (avatars, last git path). |
| `repoManager.ts` | Repo discovery. Scans workspace for git repos, persists list, watches for changes. |
| `config.ts` | Settings reader. Normalizes VS Code settings, handles deprecated/renamed settings. |

### Features

| File | Responsibility |
|------|----------------|
| `avatarManager.ts` | Fetches + caches GitHub/GitLab/Gravatar avatars. Rate-limit aware. |
| `diffDocProvider.ts` | TextDocumentContentProvider for `git-graph:` URI scheme. Powers VS Code diff viewer. |
| `repoFileWatcher.ts` | FileSystemWatcher for `.git/` changes. Triggers refresh with debounce. |
| `statusBarItem.ts` | Status bar integration. Shows current branch. |
| `commands.ts` | VS Code command registrations. |
| `logger.ts` | Output channel logging. |

### Subdirectories

| Directory | Purpose |
|-----------|---------|
| `askpass/` | Git credential prompting via VS Code. IPC server for `GIT_ASKPASS`. |
| `life-cycle/` | Install/update/uninstall telemetry (anonymous). |
| `utils/` | Shared utilities: `event.ts`, `bufferedQueue.ts`, `disposable.ts`. |

## Frontend Components (`web/`)

| File | Responsibility |
|------|----------------|
| `main.ts` | **Monolithic UI controller**. 170KB+. Handles all rendering, state, events, message dispatch. ⚠️ Primary tech debt target. |
| `graph.ts` | Graph visualization. Draws branch lines, commit dots. |
| `utils.ts` | DOM helpers, `sendMessage()`, escaping, formatting. |
| `dialog.ts` | Modal dialog component. |
| `dropdown.ts` | Dropdown/select component. |
| `contextMenu.ts` | Right-click context menus. |
| `findWidget.ts` | Search/find widget. |
| `settingsWidget.ts` | Settings panel widget. |
| `textFormatter.ts` | Commit message formatting. |
| `global.d.ts` | TypeScript declarations. Imports `../out/types` for backend types. |

## Message Protocol

### Flow

1. **Webview → Backend**: `sendMessage(msg: GG.RequestMessage)` via `VSCODE_API.postMessage()`
2. **Backend receives**: `panel.webview.onDidReceiveMessage()`
3. **Backend processes**: Switch on `msg.command` in `gitGraphView.ts`
4. **Backend → Webview**: `panel.webview.postMessage(response)`
5. **Webview receives**: `window.addEventListener('message', ...)`

### Example: Load Commits

```
Webview                              Backend
   │                                    │
   │──── {command: 'loadCommits'} ─────►│
   │                                    │
   │                          DataSource.getCommits()
   │                          git log --format=...
   │                                    │
   │◄─── {command: 'loadCommits',  ─────│
   │      commits: [...],               │
   │      moreCommitsAvailable: true}   │
   │                                    │
```

### Message Types

Defined in `src/types.ts`:
- `RequestMessage`: Union of all webview→backend messages
- `ResponseMessage`: Union of all backend→webview messages

## Build Pipeline

### Backend Build (`pnpm run compile-src`)

```
src/*.ts  ──► esbuild (bundle, CJS, node16)  ──► out/extension.js
              3 entry points:                     out/askpass/askpassMain.js
              + tsc --emitDeclarationOnly          out/life-cycle/uninstall.js
              + copy askpass .sh scripts           out/types.d.ts (for webview)
```

### Frontend Build (`pnpm run compile-web`)

```
web/*.ts  ──► tsc (module: none) ──► media/*.js  ──► concat IIFE ──► esbuild minify ──► media/out.min.js
web/styles/*.css  ──────────────────────────────────── concat ───────────────────────►  media/out.min.css
```

The webview uses `module: none` (global scripts), so files are concatenated in order (utils first, main last) and wrapped in an IIFE before esbuild minification.

## Security

### Webview CSP

```
default-src 'none';
script-src 'nonce-...';
style-src ... 'unsafe-inline';
img-src data:;
```

### Git Command Execution

- Uses `child_process.spawn()` with argument arrays (no shell injection)
- `GIT_ASKPASS` integration for credential prompts

## Key Data Flows

### Startup

1. `extension.ts` activates on `onStartupFinished` (deferred) or `onCommand:` (any registered command)
2. Creates `DataSource`, `RepoManager`, `ExtensionState`, etc.
3. `RepoManager` discovers git repos in workspace
4. User opens Git Graph → `GitGraphView` creates WebviewPanel
5. WebviewPanel injects `initialState` into HTML
6. Webview boots, sends `loadRepoInfo`, `loadCommits`
7. Backend responds, webview renders

### Commit Details

1. User clicks commit row
2. Webview sends `commitDetails` request
3. Backend runs `git show --format=...`
4. Backend responds with file list, signature status, etc.
5. Webview renders commit detail panel

### File Diff

1. User clicks file in commit details
2. Webview sends `viewDiff` request
3. Backend opens VS Code diff editor with `git-graph:` URIs
4. `DiffDocProvider` fetches file content via `DataSource`

---

**Last updated**: 2026-02-03
