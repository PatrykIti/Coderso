# TASK-462-02: Browser-Safe Contract And Server Runtime Split
# FileName: TASK-462-02-Browser-Safe-Contract-And-Server-Runtime-Split.md

**Parent Task:** TASK-462
**Priority:** High
**Category:** Architecture / Admin Build / Runtime Boundary
**Estimated Effort:** Large
**Dependencies:** TASK-462-01-L01
**Status:** ⏳ To Do

---

## Overview

Implement the boundary split defined by TASK-462-01. This subtask owns the
actual code refactor: browser/admin import paths must see only pure contracts,
while server/runtime paths keep DB/provider/auth functionality behind explicit
runtime modules or injected dependencies.

This is not a Vite config task. Build configuration changes are allowed only for
new validation gates or chunking after the architecture is fixed; they must not
be the primary way to hide server-only code from the browser build.

---

## Sub-Tasks

- [ ] TASK-462-02-L01: Extract browser-safe contracts from runtime loaders.
- [ ] TASK-462-02-L02: Rewire server runtime loaders and default dependencies.

---

## Security Contract

- **Endpoint visibility:** unchanged; no new endpoint is required.
- **Auth model:** unchanged admin session and public runtime auth behavior.
- **RBAC:** unchanged for media, settings, listings, users, and runtime routes.
- **CSRF expectations:** unchanged; no new write surface.
- **Rate-limit bucket:** unchanged.
- **Validation:** schemas and normalizers remain the source of truth; reject
  unknown fields behavior must not be weakened.
- **Anti-abuse controls:** public form/booking nonce/captcha and API-key
  behavior must remain on their existing server-only paths.
- **Secret handling:** provider credentials, password pepper, bot secrets,
  storage keys, API key hashes, DB settings, and signed/runtime-only data must
  not enter browser bundles, browser cache, localStorage, or debug payloads.

---

## Testing Requirements

- Tests listed by the implementation leaves.
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun run check:admin-boundary` or the documented equivalent source
  import-boundary command
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-462*.md`
- `_docs/ARCHITECTURE.md` or `_docs/TESTING_STRATEGY.md` if a reusable named
  seam is introduced.
- `_docs/_CHANGELOG/` entry when the family closes.
