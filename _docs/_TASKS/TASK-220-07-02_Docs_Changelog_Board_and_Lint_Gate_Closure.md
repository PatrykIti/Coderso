# TASK-220-07-02: Docs, Changelog, Board, and Lint Gate Closure
# FileName: TASK-220-07-02_Docs_Changelog_Board_and_Lint_Gate_Closure.md

**Priority:** Medium
**Category:** Docs + Changelog + Task Board
**Estimated Effort:** Small
**Dependencies:** TASK-220-07-01
**Status:** To Do

---

## Overview

Finalize the TASK-220 family once implementation and validation are complete.
This leaf owns task status transitions, changelog entry/index updates, and any
source-of-truth docs touched by the React Hooks Compiler cleanup.

## Sub-Tasks

- [ ] Move TASK-220 family files to `Done (YYYY-MM-DD)` after validation.
- [ ] Add `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-220-eslint-9-react-hooks-compiler-cleanup.md`.
- [ ] Update `_docs/_CHANGELOG/README.md`.
- [ ] Update `_docs/_TASKS/README.md` counts and Done table.
- [ ] Update `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache
  behavior changed during implementation.

## Files to Change

- `_docs/_TASKS/TASK-220*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-220-eslint-9-react-hooks-compiler-cleanup.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/ADMIN_CACHE.md` if changed by implementation leaves.
- `_docs/ADMIN_CACHE_MAP.md` if changed by implementation leaves.

## Security Contract

- Visibility: docs/changelog only.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: changelog must state that lint rules remain enabled and no
  scanner/lint exception was used.
- Secret handling: changelog and docs must not include secrets from local env.

## Pseudocode

```md
## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo`
- Focused Vitest suites: ...
- `bun run test:vitest` if shared helpers changed
```

## Testing Requirements

- `git diff --check`
- Re-run `bun --cwd core lint` after docs-only closure only if code changed since
  the final validation run.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` if applicable.

## Acceptance Criteria

1. TASK-220 family statuses and board counts are synchronized.
2. Changelog captures dependency context, lint-rule policy, implementation
   summary, and validation evidence.
3. No stale To Do rows remain for completed TASK-220 leaves.
