# TASK-322-02: Page Editor Session Expiry Feedback and Dirty-State Preservation

# FileName: TASK-322-02_Page_Editor_Session_Expiry_Feedback_and_Dirty_State_Preservation.md

**Priority:** High
**Category:** Admin UI + Page Builder + Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-322-01
**Status:** Done (2026-05-21)

---

## Overview

Apply the shared expired-session contract to the long-lived page editor shell.

This leaf owns page-editor UX only: save/publish feedback, dirty-state
preservation, and actionable recovery guidance. It must not redefine shared API
error classification or invent widget-local auth handling.

## Sub-Tasks

- None. This is an execution-ready leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/PageEditor.tsx` | Surface actionable expired-session feedback for save/publish flows while preserving dirty-state and current draft context. |
| `tests/vitest/ui/page-editor-shell-wave.test.tsx` | Cover expired-session save/publish behavior, bounded feedback, and no-loss dirty-state handling. |
| `_docs/SECURITY_SPEC.md` | Update only if the editor-shell recovery UX materially changes security expectations. |

## Implementation Pseudocode

```tsx
function handlePageEditorSaveError(error: ApiClientError) {
  if (error.sharedFailureKind === "session_expired") {
    setSessionExpiryBanner({
      tone: "warning",
      message: "Your admin session expired. Sign in again before saving.",
    });
    return;
  }
  throw error;
}
```

## Data Flow

1. Page Editor issues save/publish requests through the shared admin client.
2. Shared client returns bounded expired-session or generic failure metadata.
3. Page Editor preserves local dirty state and renders actionable feedback
   instead of swallowing the failure.
4. Successful re-auth and retry continue through the existing save/publish flow
   without mutating unsaved draft data implicitly.

Error handling:

- Do not clear draft edits or dismiss dirty-state warnings on session expiry.
- Keep generic network or validation failures distinct from expired-session
  messaging.
- Retry affordances must be explicit user actions, not silent loops.

Regression-test shape:

```tsx
test("page editor keeps dirty state and shows expired-session feedback after save failure", async () => {
  const shell = renderPageEditorExpiredSessionHarness();
  await shell.save();
  expect(shell.isDirty()).toBe(true);
  expect(shell.findMessage(/sign in again before saving/i)).toBeTruthy();
});
```

## Security Contract

This leaf changes existing internal admin editor behavior only.

- Endpoint visibility: existing internal admin page save/publish routes only.
- Auth model: authenticated admin session.
- RBAC: unchanged page/template/widget write permission.
- CSRF: unchanged shared admin write protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged page payload schemas.
- Anti-abuse: no browser-persisted privileged state or silent auth bypasses.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` only if the page-editor recovery policy changes materially
- `_docs/_TASKS/TASK-322-02_Page_Editor_Session_Expiry_Feedback_and_Dirty_State_Preservation.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/890-2026-05-21-task-322-session-expiry-resilience.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Page Editor keeps dirty-state awareness when session expiry interrupts save or
  publish.
- Expired-session feedback is actionable and distinct from generic failures.
- The page-editor shell consumes the shared client contract instead of local
  auth heuristics.

## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx` -
  passed (`15` tests)
- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `bun run gates:coderso` - passed
- `bun run precommit` - passed

## Completion Notes

- 2026-05-21: PageEditor now keeps unsaved draft state visible and surfaces
  shared expired-session guidance for save, publish, and page-settings save
  flows instead of raw generic auth errors.
