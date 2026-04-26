# TASK-215-05-02: Widgets Docs, Changelog, and Board Closure
# FileName: TASK-215-05-02_Widgets_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** Docs + Changelog + Task Board
**Estimated Effort:** Small
**Dependencies:** TASK-215-05, TASK-215-05-01
**Status:** To Do

---

## Overview

Close the docs and task-board side of TASK-215 after implementation. The final
docs must describe the section dropdown, default table mode, grid mode,
resource-specific actions, favorites behavior, template actions, cache policy,
and validation evidence.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/WIDGETS.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if API/errors changed.
- `_docs/ARCHITECTURE.md` if admin IA/route behavior changed.
- `_docs/_CHANGELOG/NNN_*.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/TASK-215*.md`
- `_docs/_TASKS/README.md`

## Security Contract

- Visibility: documentation only.
- Auth model: unchanged.
- RBAC: docs must reflect final Widgets read/write permissions.
- CSRF: docs must preserve existing admin write CSRF expectations.
- Rate-limit buckets: docs must not invent new buckets unless implementation
  actually changed them.
- Reject-unknown validation: docs must keep schema ownership and strict
  validation notes accurate.
- Anti-abuse: changelog/test notes must not expose private payloads, tokens,
  stack traces, or secrets.

## Pseudocode

```md
Closure checklist:

1. Move TASK-215 family files from To Do to Done with dated status lines.
2. Recalculate `_docs/_TASKS/README.md` statistics after every moved row.
3. Add `_docs/_CHANGELOG/NNN_*.md` with implementation summary and validation.
4. Add the changelog entry to `_docs/_CHANGELOG/README.md`.
5. Update product/cache docs only for behavior that actually shipped.
6. Record skipped checks with reason and owner follow-up.
```

## Testing Requirements

- Verify task files have required headers, required sections, status dates, and
  Security Contract sections where applicable.
- Verify `_docs/_TASKS/README.md` statistics match moved TASK-215 files.
- Verify changelog number and README index follow `_docs/_CHANGELOG/README.md`.
- Commands:
  - `rg -n "TASK-215" _docs/_TASKS _docs/_CHANGELOG`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_CHANGELOG/*`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. TASK-215 statuses, board rows, statistics, and changelog are synchronized.
2. Product docs describe the final table/grid Widgets workflow.
3. Any skipped checks are explicitly recorded with reason and follow-up.
