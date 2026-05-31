# TASK-322: Admin Session and CSRF Expiry Resilience for Long-Lived Editors

# FileName: TASK-322_Admin_Session_and_CSRF_Expiry_Resilience_for_Long_Lived_Editors.md

**Priority:** High
**Category:** Admin UI + Auth + API Reliability
**Estimated Effort:** Very Large
**Dependencies:** TASK-277
**Status:** Done (2026-05-21)

---

## Overview

Repair the shared admin session-expiry and CSRF-expiry experience for long-lived
editing flows.

The Posts Feed report exposed the problem through `GET /api/posts` and save /
publish retries, but the root issue is broader than one widget. This task must
own shared refresh/re-auth/unsaved-state behavior for page and post editors
instead of adding widget-local workarounds.

## Source Findings

- Posts Feed report `BUG-06` / `BUG-09` show expired session and picker 401
  failures during editor work:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:155-160,176-180,289,298,346`.
- The shared admin API client currently refreshes only CSRF-specific 403 flows:
  `core/admin/services/apiClient.ts:30-167`.
- Current widget editors receive raw `ApiClientError` text with no shared
  expired-session recovery surface:
  `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:142-177,300-301`.
- Long-lived editor shells already own save/publish flows and dirty-state
  protection:
  `core/admin/ui/pages/PageEditor.tsx`,
  `tests/vitest/ui/page-editor-shell-wave.test.tsx`.

## Sub-Tasks

- [x] TASK-322-01: Admin API Client Session Classification and Bounded CSRF Retry
- [x] TASK-322-02: Page Editor Session Expiry Feedback and Dirty-State Preservation
- [x] TASK-322-03: Posts Feed and Shared Picker Consumer Session-Expiry Adoption
- [x] TASK-322-04: Session Expiry Docs, Changelog, and Closure

## Implementation Order

1. Land `TASK-322-01` first so the repo has one shared client-side
   classification for CSRF-refresh vs full session expiry before editor shells
   consume it.
2. Land `TASK-322-02` next so the primary long-lived page editor shell surfaces
   actionable expired-session feedback without losing dirty-state context.
3. Land `TASK-322-03` after the shared client and page-editor shell are stable
   so Posts Feed and related picker consumers reuse the same contract instead of
   inventing widget-local handling.
4. Land `TASK-322-04` last to reconcile report evidence, docs, board state, and
   changelog with the actual shared implementation.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/services/apiClient.ts` | Define the shared expired-session / auth-failure detection and bounded retry-or-reset behavior for admin API requests. |
| `core/admin/services/authClient.ts` | Reuse existing auth/session routes if a lightweight session probe or refresh handshake is required. |
| `core/admin/ui/pages/PageEditor.tsx` | Surface actionable expired-session feedback that preserves dirty-state awareness instead of failing silently. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Consume the shared expired-session contract for local picker messaging instead of inventing a one-off workaround. |
| `tests/vitest/ui/page-editor-shell-wave.test.tsx` | Cover expired-session save/publish behavior and bounded user feedback in the page editor shell. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover shared expired-session picker messaging once the shared contract lands. |
| `_docs/SECURITY_SPEC.md` | Update only if the auth/session/CSRF recovery policy changes materially. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Mark `BUG-06` and the root-cause portion of `BUG-09` fixed by TASK-322 once implemented. |

## Implementation Pseudocode

```ts
function isExpiredAdminSession(error: ApiClientError) {
  return error.status === 401 || error.code === "session_expired";
}

async function apiRequestWithAdminSessionHandling<T>(...) {
  try {
    return await apiRequest<T>(...);
  } catch (error) {
    if (isExpiredAdminSession(error)) {
      notifyExpiredSession();
      throw error;
    }
    throw error;
  }
}
```

## Data Flow

1. Admin API requests continue to flow through the shared `apiClient`.
2. The shared client distinguishes bounded CSRF-refresh retries from full
   session-expiry/auth-failure responses.
3. Long-lived editor shells consume that shared state and surface actionable
   expired-session feedback while preserving dirty-state awareness.
4. Widget-local consumers such as Posts Feed reuse the same shared failure model
   for picker/save messaging instead of inventing their own auth workaround.

Error handling:

- Do not silently discard unsaved changes when the session expires.
- Shared feedback must differentiate between recoverable CSRF refresh, expired
  auth session, and generic network failure.
- Widget-level consumers may add local retry buttons, but only on top of the
  shared session-expiry contract.

Regression-test shape:

```ts
test("expired admin sessions surface shared session-expired feedback without clearing dirty state", async () => {
  const shell = renderPageEditorWithExpiredSessionSave();
  await shell.save();
  expect(shell.isDirty()).toBe(true);
  expect(shell.findMessage(/session expired/i)).toBeTruthy();
});

test("csrf refresh remains bounded and distinct from full auth expiry", async () => {
  const client = createApiClientHarness([csrfExpiredError, successResponse]);
  await expect(client.requestWithRecovery()).resolves.toMatchObject({ ok: true });
});
```

## Security Contract

This task changes existing internal admin auth/session behavior only.

- Endpoint visibility: existing internal admin auth/session endpoints only.
- Auth model: authenticated admin session.
- RBAC: unchanged.
- CSRF: preserve existing CSRF protection; do not weaken token requirements.
- Rate-limit bucket: unchanged unless a new session probe endpoint reuses an
  existing internal bucket.
- Reject-unknown validation: unchanged unless auth/session payloads are expanded.
- Anti-abuse: no ambient auto-login loops, no privileged state in browser
  storage, and no widget-local auth bypasses.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` only if the shared recovery policy changes materially
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-322_Admin_Session_and_CSRF_Expiry_Resilience_for_Long_Lived_Editors.md`
- `_docs/_TASKS/TASK-322-*.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- Expired admin sessions are surfaced through a shared contract instead of raw
  widget-local errors.
- Long-lived editors preserve dirty-state awareness when auth/session expiry
  interrupts save or publish flows.
- CSRF refresh remains bounded and distinct from full auth-session expiry.
- Posts Feed picker UX can rely on the shared platform behavior instead of a
  one-off auth workaround.

## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/admin/apiClient.test.ts` - passed (`5`
  tests)
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx` -
  passed (`16` tests) after the audit follow-up extended shared expired-session
  coverage to page load/refresh, preview, template-option, and revision flows
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx` -
  passed (`9` tests)
- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `bun run gates:coderso` - passed
- `bun run scan:security:strict` - attempted but failed outside TASK-322 scope
  because the local Semgrep trust store had no CA anchors and `bun audit` could
  not reach the advisory endpoint; Trivy and Gitleaks sub-scanners were clean
  in the same run
- `bun run precommit` - passed

## Completion Notes

- 2026-05-21: the TASK-322 family is closed. Shared admin request
  classification, page-editor save/publish handling, and Posts Feed
  picker/preview consumers now use one bounded session-expiry contract.
- 2026-05-21 audit follow-up: `PageEditor` now reuses the same shared
  session-expiry guidance for page load/refresh, preview, template-option, and
  revision read/mutation paths instead of surfacing raw API client text there.
