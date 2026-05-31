# TASK-322-03: Posts Feed and Shared Picker Consumer Session-Expiry Adoption

# FileName: TASK-322-03_Posts_Feed_and_Shared_Picker_Consumer_Session_Expiry_Adoption.md

**Priority:** High
**Category:** Widgets + Admin UI + Consumer Adoption
**Estimated Effort:** Large
**Dependencies:** TASK-322-01, TASK-322-02
**Status:** Done (2026-05-21)

---

## Overview

Adopt the shared expired-session contract in Posts Feed and related picker
surfaces that currently expose raw `ApiClientError` messaging.

This leaf owns consumer adoption only. It must not duplicate shared API-client
classification or page-editor dirty-state handling.

## Sub-Tasks

- None. This is an execution-ready leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Replace raw auth/session error messaging with the shared expired-session contract for picker and preview states. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover expired-session picker messaging and no-regression for existing editor flows. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Mark `BUG-06` and the shared root-cause slice of `BUG-09` with the correct shared owner evidence. |

## Implementation Pseudocode

```tsx
function renderPostsFeedQueryError(error: ApiClientError | null) {
  if (!error) return null;
  if (error.sharedFailureKind === "session_expired") {
    return "Your admin session expired. Sign in again to refresh Posts Feed data.";
  }
  return error.message;
}
```

## Data Flow

1. Posts Feed editor consumers receive shared API-client failures from existing
   query, preview, and save flows.
2. The editor maps `session_expired` into bounded actionable copy instead of
   surfacing raw `ApiClientError` text.
3. Existing loading, empty, and generic failure states remain intact.
4. Report evidence and widget-local tests point at this consumer-adoption leaf
   instead of reopening shared client ownership.

Error handling:

- Preserve generic error text or existing diagnostics for non-session failures.
- Do not introduce widget-local auth retries or alternate request paths.
- Keep success and stale-preview behavior unchanged outside the error mapping.

Regression-test shape:

```tsx
test("posts feed picker shows shared expired-session guidance instead of raw client text", async () => {
  const editor = renderPostsFeedExpiredSessionHarness();
  await editor.loadQueryPicker();
  expect(editor.findText(/sign in again to refresh posts feed data/i)).toBeTruthy();
});
```

## Security Contract

This leaf changes existing internal admin editor behavior only.

- Endpoint visibility: existing internal admin content/query read routes only.
- Auth model: authenticated admin session.
- RBAC: unchanged `content:read` and widget edit permissions.
- CSRF: unchanged shared admin client behavior.
- Rate-limit bucket: unchanged admin read bucket.
- Reject-unknown validation: unchanged picker/query payloads.
- Anti-abuse: no widget-local auth bypasses or privileged browser storage.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-322-03_Posts_Feed_and_Shared_Picker_Consumer_Session_Expiry_Adoption.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/890-2026-05-21-task-322-session-expiry-resilience.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Posts Feed editor surfaces the shared expired-session contract instead of raw
  auth failure text.
- Consumer adoption does not fork API-client recovery logic.
- Widget-local tests and report evidence point to the exact shared owner leaf.

## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx` -
  passed (`9` tests)
- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `bun run gates:coderso` - passed
- `bun run precommit` - passed

## Completion Notes

- 2026-05-21: Posts Feed picker and preview-resource consumers now use the
  shared expired-session contract and show bounded sign-in guidance instead of
  raw `ApiClientError` text.
