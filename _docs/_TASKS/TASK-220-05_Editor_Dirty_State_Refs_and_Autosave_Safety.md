# TASK-220-05: Editor Dirty-State, Refs, and Autosave Safety
# FileName: TASK-220-05_Editor_Dirty_State_Refs_and_Autosave_Safety.md

**Priority:** High
**Category:** Editors + Dirty State + React Compiler
**Estimated Effort:** Large
**Dependencies:** TASK-220-03
**Status:** Done (2026-04-29)

---

## Overview

Fix editor-specific findings where state effects interact with dirty-state
protection, autosave, route/detail cache hydration, revision loading, and manual
memoization. This slice carries higher data-integrity risk than simple loader
pages because background updates must not overwrite unsaved edits.

## Sub-Tasks

- [ ] TASK-220-05-01: Post Editor Ref and Autosave Signature Cleanup
- [ ] TASK-220-05-02: Page Editor Route, Cache, Revisions, and Template Loaders
- [ ] TASK-220-05-03: Entry Content Type and Relation Editor State

## Security Contract

- Visibility: internal admin editor surfaces.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: existing resource edit permissions.
- CSRF: existing admin write CSRF handling unchanged.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation: route/service schemas remain source of truth.
- Anti-abuse: background refresh and autosave must not amplify requests or
  overwrite dirty local edits.
- Secret handling: no editor state may store secrets or privileged settings.

## Testing Requirements

- Focused editor Vitest suites for dirty-state, autosave, cache, and revision
  behavior.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo`
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if editor cache semantics change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Post/Page/Entry editor findings are fixed without weakening dirty-state
   protection.
2. Autosave signatures remain deterministic.
3. Cached detail/revision refresh stays background-safe.
