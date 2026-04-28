# 291 - TASK-058-05 Admin Shell Global Request Minimization

- **Date:** 2026-02-21
- **Version:** 0.1.291
- **Tasks:** TASK-058, TASK-058-05

## Key Changes

### Auth Bootstrap Stabilization
- Reworked admin auth bootstrap in `core/admin/app/AdminApp.tsx` to use cached single-shot flow (`resolveAuthBootstrap`).
- Added auth bootstrap cache helpers in `core/admin/services/authClient.ts`:
  - `resolveAuthBootstrap`
  - `clearAuthBootstrapCache`
- Removed repeated route-coupled `me()` calls from protected/public navigation effects.

### Assistant Panel Runtime Minimization
- Moved assistant runtime loading to lazy-on-open behavior in `core/admin/ui/assistant/AssistantPanel.tsx`.
- Added runtime snapshot cache and in-flight dedupe:
  - `loadAssistantRuntimeStateCached`
  - `clearAssistantRuntimeStateCache`
  - `shouldLoadAssistantRuntimeState`
- Panel no longer pulls assistant status/user settings while closed.

### Theme Reads and Event Scope
- `AdminThemeSwitcher` now reads profiles via cached client (`listAdminThemeProfilesCached`) and loads on dropdown open.
- `AdminApp` theme refresh now uses cached theme clients and the `theme:updated` event refreshes only theme tokens.
- Removed theme-update-triggered settings refresh cascade.

### Tests
- Added:
  - `tests/unit/ui/assistant-panel-lazy-load.test.tsx`
  - `tests/integration/ui/admin-shell-request-budget.test.tsx`
- Updated:
  - `tests/unit/admin/adminApp.test.tsx` (theme refresh scope assertion)

### Documentation Sync
- Updated `_docs/ADMIN_CACHE.md` with shell lifecycle policy for auth bootstrap, assistant lazy-load, theme switcher, and theme update scope.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/admin/adminApp.test.tsx tests/unit/ui/assistant-panel.test.tsx tests/unit/ui/assistant-panel-lazy-load.test.tsx tests/unit/ui/theme-switcher.test.tsx tests/integration/ui/admin-shell-request-budget.test.tsx`

## Result
- TASK-058-05 is closed with reduced global shell/topbar reads and explicit request-budget regression coverage.
