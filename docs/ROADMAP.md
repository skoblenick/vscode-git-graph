# Roadmap & Task Tracking

## Status Legend

- ⬜ Not started
- 🟡 In progress
- ✅ Complete
- ❌ Blocked/Cancelled

---

## Phase 1: Stabilization (Priority: High)

Goal: Make the codebase maintainable and CI reliable.

| Task | Status | Notes |
|------|--------|-------|
| Add `package-lock.json` | ⬜ | Reproducible builds, security audits |
| Update CI to Node LTS (20.x or 22.x) | ⬜ | Currently Node 12 (EOL) |
| Run `npm audit` in CI | ⬜ | After lockfile added |
| Update TypeScript to 5.x | ⬜ | Currently 4.0.2 |
| Update ESLint to 8.x+ | ⬜ | Currently 7.15.0 |
| Update Jest to 29.x | ⬜ | Currently 26.6.3 |
| Update `@types/node` | ⬜ | Currently 8.10.62 |
| Bump `engines.vscode` to 1.70+ | ⬜ | Currently 1.38 (2019) |
| Update `@types/vscode` to match | ⬜ | |
| Update `iconv-lite` | ⬜ | Currently 0.5.0, latest 0.6.x |

### Phase 1 Dependency Order

```
1. Add package-lock.json
2. Update Node in CI
3. Update TypeScript + @types
4. Update ESLint + Jest
5. Bump vscode engine + @types/vscode
6. Update iconv-lite (test encoding edge cases)
```

---

## Phase 2: Build Modernization (Priority: Medium)

Goal: Modern build tooling, faster iteration.

| Task | Status | Notes |
|------|--------|-------|
| Reduce activation from `*` to on-demand | ⬜ | `onCommand:`, `onView:` |
| Evaluate esbuild/vite for webview | ⬜ | Replace concat+UglifyJS |
| Evaluate esbuild for backend | ⬜ | Faster builds |
| Remove `original-fs` patching if possible | ⬜ | May be unnecessary on modern VS Code |
| Add source maps for debugging | ⬜ | Currently stripped |

---

## Phase 3: Webview Refactor (Priority: Medium)

Goal: Break up `web/main.ts` monolith for maintainability.

| Task | Status | Notes |
|------|--------|-------|
| Extract state management | ⬜ | Separate from rendering |
| Extract message handlers | ⬜ | One module per command type |
| Extract renderers | ⬜ | Table, detail pane, dialogs |
| Consider lightweight framework | ⬜ | Svelte? Or stay vanilla DOM |
| Add webview tests | ⬜ | Currently untested |

---

## Phase 4: Testing Improvements (Priority: Low)

| Task | Status | Notes |
|------|--------|-------|
| Add integration tests | ⬜ | `@vscode/test-electron` |
| Improve coverage | ⬜ | `askpass/`, `life-cycle/` untested |
| Add webview browser tests | ⬜ | Playwright/Puppeteer |

---

## Phase 5: Features (Priority: Depends)

Track new features here as they're planned.

| Feature | Status | Notes |
|---------|--------|-------|
| (none planned yet) | | |

---

## Technical Debt Inventory

### Critical

| Item | Location | Impact |
|------|----------|--------|
| Monolithic UI controller | `web/main.ts` | Hard to maintain/test |
| Activation `*` | `package.json` | Perf impact on all users |
| No lockfile | project root | Build reproducibility |
| Ancient dependencies | `package.json` | Security, compatibility |

### Moderate

| Item | Location | Impact |
|------|----------|--------|
| Custom build pipeline | `.vscode/package-web.js` | Fragile, slow |
| Broad file watching | `src/repoFileWatcher.ts` | Perf in large repos |
| Many deprecated settings | `src/config.ts` | Code complexity |

### Low

| Item | Location | Impact |
|------|----------|--------|
| Lifecycle telemetry | `src/life-cycle/` | Privacy concern |
| Avatar rate limiting | `src/avatarManager.ts` | Missing avatars |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-03 | Initial roadmap created |

---

**⚠️ AI AGENTS: Update this file when completing tasks or adding new ones.**
