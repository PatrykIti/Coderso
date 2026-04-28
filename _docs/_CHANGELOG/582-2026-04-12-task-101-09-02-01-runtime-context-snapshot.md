# 582. TASK-101-09-02-01 runtime context snapshot

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-101-09-02, TASK-101-09-02-01, TASK-101-09-02-01-01, TASK-101-09-02-01-02, TASK-101-09-02-01-03

## Key Changes

### Admin Context
- Added an assistant admin runtime snapshot for route, active href, selected resource, visible action hints, and advisory permission hints.
- Reused `AdminRouterContext` and `AdminShell` instead of reading only raw `window.location`.
- `AssistantPanel` now sends runtime snapshot context with LLM Guide planning prompts.

### Security
- Runtime snapshot is advisory-only and does not replace route/domain RBAC.
- Server-side context normalization drops unsafe hrefs and secret-like permission/resource hints.
- Snapshot data excludes user PII, raw roles, raw permission lists, session ids, cookies, CSRF tokens, and access logs.

### Tests
- Added Vitest coverage for the UI runtime context hook and server-side context normalization.
- Extended route coverage for schema-owned runtime snapshot context.
- Updated assistant context docs, security docs, task board, and parent task status.
