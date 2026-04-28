# 505. TASK-106 assistant drawer runtime UX and configuration separation

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-106, TASK-106-01, TASK-106-02, TASK-106-03, TASK-106-04

## Key Changes

### Assistant Drawer UX
- Reworked the topbar Assistant drawer into an explicit runtime-state surface with `loading`, `error`, `disabled`, `ready`, and `docs-not-ready` behavior.
- Starter prompts and the message composer now render only after assistant runtime hydration completes.
- `docs-not-ready` no longer falls through to the normal empty-chat prompt state.

### Preferences And Settings Separation
- Removed the default "inline configurator" feel from the main chat drawer.
- Moved drawer preferences behind an explicit user action instead of rendering mode/avatar controls immediately after load.
- Added a canonical `Settings -> Assistant` entrypoint from the drawer for global assistant configuration.

### Runtime Consistency
- Updated local runtime cache synchronization so changed drawer preferences do not immediately fall back to stale cached state on reopen.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
