# TASK-454-01-L01: Contract Corrections And Fresh Drift Pass
# FileName: TASK-454-01-L01-Contract-Corrections-And-Fresh-Drift-Pass.md

**Parent Subtask:** TASK-454-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Contract
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-06-17

---

## Overview

Verify the corrected TASK-454 task tree is still aligned with source code before
implementation. This leaf owns task-contract validation only. If source or task
state drifted, correct the task files first and rerun the audit before source
edits.

## Sub-Tasks

- [x] Compare all TASK-454 files with current Page Editor, Pages client,
      router blocker, Settings guard, and revision routes.
- [x] Confirm the decisions: explicit restore prompt, client-side revision
      filtering, host-neutral mount revalidation, page-only autosave recovery.
- [x] Record any audit notes in the task closeout before implementation starts.

## Files To Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-454*.md` | Correct any stale contract found by the fresh pass. |

## Implementation Pseudocode

```text
auditPrompt = {
  repo: "/home/coder/project/Coderso",
  head: git rev-parse HEAD,
  dirtyStatus: git status --short,
  taskIds: [
    "TASK-454",
    "TASK-454-01",
    "TASK-454-01-L01",
    "TASK-454-02",
    "TASK-454-02-L01",
    "TASK-454-02-L02",
    "TASK-454-02-L03",
    "TASK-454-03",
    "TASK-454-03-L01",
    "TASK-454-03-L02",
    "TASK-454-04",
    "TASK-454-04-L01",
    "TASK-454-04-L02",
    "TASK-454-05",
    "TASK-454-05-L01",
  ],
  noEdits: true,
  compare: [
    "_docs/_TASKS",
    "core/admin/ui/pages/PageEditor.tsx",
    "core/admin/ui/pages/editor/pageEditorHostContract.ts",
    "core/admin/services/pagesClient.ts",
    "core/admin/ui/contexts/AdminRouterContext.tsx",
    "core/admin/ui/settings/SettingsDirtyNavigation.tsx",
    "core/server/routes/pageRoutes.ts",
    "tests/vitest/ui/page-editor-v2-flow.test.tsx",
  ],
};

runReadOnlyAudit(auditPrompt);
if (findings.high || findings.medium || findings.low) {
  fixTaskContract();
  rerunReadOnlyAudit();
}
```

Data flow: task files only; no application runtime state.

Error handling: unresolved drift blocks TASK-454-02/03/04.

Regression-test shape: `git diff --check` plus fresh read-only audit output.

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `git diff --check`
- Fresh read-only drift pass.

## Documentation Updates Required

- `_docs/_TASKS/README.md` only if status/board rows change.

## Acceptance Criteria

1. No stale API names remain in the task contract.
2. No unresolved drift remains before source edits.
3. The audit output is summarized in the implementation closeout.
