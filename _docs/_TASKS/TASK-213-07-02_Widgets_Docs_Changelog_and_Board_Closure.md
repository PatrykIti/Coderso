# TASK-213-07-02: Widgets Docs Changelog and Board Closure
# FileName: TASK-213-07-02_Widgets_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** Documentation + Changelog + Task Board
**Estimated Effort:** Small
**Dependencies:** TASK-213-07-01
**Status:** To Do

---

## Overview

Close the TASK-213 family in the repo documentation system after implementation
and validation land.

This leaf owns docs, changelog, task statuses, and board statistics. It should
not mark the family complete until the Playwright source report and validation
matrix are truthful.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md`
- `docs/coderso/widget-library.md`
- `docs/coderso/widget-template-editor.md`
- affected `_docs/_WIDGETS/*`
- `_docs/_TASKS/TASK-213*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/<next>-2026-..-task-213-widget-library-qa-followups.md`
- `_docs/_CHANGELOG/README.md`

## Implementation Direction

Follow `_docs/_CHANGELOG/README.md` for numbering and index updates.

Status update order:

1. Update source report with fixed/open/deferred states.
2. Update product/API/cache/widget docs to match shipped behavior.
3. Add changelog entry with validation evidence.
4. Mark TASK-213 family files `Done` with date.
5. Move task board rows from To Do to Done and update statistics.

Do not close a leaf whose implementation was intentionally deferred. Mark the
finding open in the source report and keep the corresponding task To Do or split
a new follow-up.

Pseudocode:

```ts
for (const task of task213Family) {
  if (task.findings.every((finding) => finding.status === "fixed" || finding.status === "verified")) {
    markDone(task.id, completionDate);
  } else {
    keepOpen(task.id, listOpenFindings(task.findings));
  }
}

updateBoardStatistics();
appendChangelogEntry({ taskId: "TASK-213", validationEvidence });
```

## Security Contract

- Visibility: documentation-only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: docs must identify actual schema/normalizer owners.
- Anti-abuse: changelog/source report must not include secrets, tokens, raw
  private payloads, or unredacted screenshots.

## Testing Requirements

- No new code tests unless documentation edits reveal missing validation.
- Verify task board statistics by counting moved rows.
- Verify changelog README index includes the new entry.

## Documentation Updates Required

- Same as Files to Change.

## Acceptance Criteria

1. TASK-213 source report, docs, changelog, and board are synchronized.
2. Changelog entry includes exact validation evidence.
3. No deferred/open finding is incorrectly marked Done.
