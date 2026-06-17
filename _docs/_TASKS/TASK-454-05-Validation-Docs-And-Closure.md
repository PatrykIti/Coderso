# TASK-454-05: Validation Docs And Closure
# FileName: TASK-454-05-Validation-Docs-And-Closure.md

**Parent Task:** TASK-454
**Priority:** High
**Category:** Pages / Validation / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-454-02, TASK-454-03, TASK-454-04
**Status:** ⏳ To Do

---

## Overview

Close TASK-454 after implementation: run targeted lanes, perform live
`coderso-dev-core-host` + `playwright-cli` replay, update docs, changelog, board
state, and run the final read-only drift pass.

## Sub-Tasks

- [ ] TASK-454-05-L01: Live Smoke Docs Changelog And Board Closure

## Files To Change

| File | Required change |
|---|---|
| `_docs/ADMIN_CACHE.md` | Final page detail hydration/recovery/dirty guard wording. |
| `docs/guide/screens/page-editor-preview-settings-and-history.md` | User-facing recovery behavior if UX changed. |
| `_docs/_TASKS/README.md` | Board/statistics/status sync. |
| `_docs/_CHANGELOG/` | Completion entry listing TASK-454 and closed descendants. |

## Implementation Pseudocode

```text
1. Run targeted Vitest/Bun/lint/type lanes, including the Pages, Page
   Templates, and Menu Design hosts that share `PageEditor`.
2. Start `coderso-dev-core-host`.
3. Use `playwright-cli` with .env admin credentials:
   a. Poison pages:detail localStorage, reload editor, prove fresh server detail wins.
   b. Insert content, wait for autosave, attempt SPA nav, prove guard prompts.
   c. Confirm/discard navigation, reopen, prove recovery prompt for draft version.
   d. Restore autosave, save, reload, publish, prove front renders restored content.
4. Record evidence under `.tmp/`.
5. Update docs/changelog/board.
6. Run final read-only drift pass against final working tree or final commit.
```

Data flow: closure validates the behavior implemented by TASK-454-02 through
TASK-454-04; it should not introduce new production behavior except small
diagnostic/test fixes found during validation.

Error handling: any failed live smoke routes back to the owning implementation
leaf before closure.

Regression-test shape: all targeted tests and live replay pass in one final
validation batch.

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** existing admin session for live smoke.
- **RBAC:** existing Pages permissions.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/admin/pagesClient.test.ts tests/vitest/ui/admin-router-context-blocker.test.tsx tests/vitest/ui/settings-shell.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/pages/pageRevisionAutosave.test.ts tests/unit/pages/revisionService.test.ts tests/integration/routes/pages.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `git diff --check`
- Live `coderso-dev-core-host` + `playwright-cli` replay.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `docs/guide/screens/page-editor-preview-settings-and-history.md` if UX changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/`

## Acceptance Criteria

1. All implementation leaves are terminal before TASK-454 closes.
2. Live replay proves poisoned-cache reload and autosave recovery flows.
3. Changelog and board statistics are synchronized.
4. Final read-only drift pass has no unresolved findings.
