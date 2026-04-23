# TASK-204-02-02: Category Selector Friendly Error and Retry State
# FileName: TASK-204-02-02_Category_Selector_Friendly_Error_and_Retry_State.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-204-02-01
**Status:** To Do

---

## Overview

Keep the Posts category selector usable when taxonomy overview loading fails.
The UI should show friendly copy and retry, not raw SQL/query text.

Ownership:

- `PostBlockEditorShell` owns fetching taxonomy overview and mapping failures to
  safe view state.
- `DocumentInspector` owns presenting category options, failure copy, and retry
  action from props.
- `taxonomyClient` remains the API caller; the inspector must not fetch
  taxonomy data itself.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:239-254`
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:150-173`
- `tests/vitest/ui/post-document-inspector-wave.test.tsx`
- `tests/vitest/ui-integration/post-document-inspector.test.tsx`

## Implementation Notes

- Add a retry callback prop from shell to inspector.
- Use bounded user copy such as `Could not load categories.` plus `Try again`.
- Keep `No category` selectable if that is still valid for the current post.
- Do not show raw `error.message` when it contains SQL/query text.
- Keep unrelated editor actions available while taxonomy is failed.

## Security Contract

- Visibility: internal admin Posts UI only.
- No new endpoint, auth path, RBAC rule, CSRF behavior, or rate-limit bucket.
- Anti-abuse:
  - raw API errors, SQL, stack traces, and server details must not render in the
    browser,
  - retry must call the existing internal admin read path,
  - failure copy must not imply the post was saved or taxonomy changed.

## Testing Requirements

- `tests/vitest/ui/post-document-inspector-wave.test.tsx`
  - renders friendly taxonomy failure copy,
  - renders retry action,
  - does not render raw SQL/error text,
  - keeps `No category` behavior stable.
- `tests/vitest/ui-integration/post-document-inspector.test.tsx`
  - shell-to-inspector failure/retry props work through the real owner seam.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Category load failures are friendly and retryable.
2. Raw backend messages never appear in the Posts inspector.
3. The inspector remains presentational and does not own fetching.
