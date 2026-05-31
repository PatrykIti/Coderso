# TASK-322-01: Admin API Client Session Classification and Bounded CSRF Retry

# FileName: TASK-322-01_Admin_API_Client_Session_Classification_and_Bounded_CSRF_Retry.md

**Priority:** High
**Category:** Admin UI + Auth + Shared Client
**Estimated Effort:** Large
**Dependencies:** TASK-322
**Status:** Done (2026-05-21)

---

## Overview

Create the shared admin API-client contract for distinguishing bounded CSRF
refresh from full session expiry.

This leaf owns classification and retry behavior in the shared client only. It
must not widen into page-editor banners or widget-local picker copy beyond the
generic machine-readable state they consume.

## Sub-Tasks

- None. This is an execution-ready leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/services/apiClient.ts` | Add one shared classification path for CSRF-refreshable errors vs expired-session/auth failures, plus bounded retry behavior. |
| `core/admin/services/authClient.ts` | Reuse existing auth/session endpoints only if a lightweight probe or handshake is required by the shared client. |
| `tests/vitest/admin/apiClient.test.ts` | Cover bounded retry, session-expired classification, and no-loop behavior. |
| `tests/vitest/admin/authClient.test.ts` | Update only if the shared client needs an auth/session probe helper. |
| `_docs/SECURITY_SPEC.md` | Update only if the shared CSRF/session recovery policy changes materially. |

## Implementation Pseudocode

```ts
function classifyAdminApiFailure(error: ApiClientError) {
  if (error.status === 403 && csrfRefreshErrorCodes.has(error.code)) return "csrf_refresh";
  if (error.status === 401 || error.code === "session_expired") return "session_expired";
  return "generic_error";
}

async function requestWithSharedAdminRecovery<T>(input: ApiRequestInput) {
  try {
    return await apiRequest<T>(input);
  } catch (error) {
    const kind = classifyAdminApiFailure(asApiClientError(error));
    if (kind === "csrf_refresh") return retryWithFreshCsrfToken(input);
    throw attachAdminFailureKind(error, kind);
  }
}
```

## Data Flow

1. Admin clients issue requests through the shared `apiClient`.
2. The client classifies failures into `csrf_refresh`, `session_expired`, or
   generic failure.
3. Only CSRF-refreshable failures retry through the existing bounded token
   refresh path.
4. Session-expired failures propagate a stable shared error shape to page and
   widget/editor consumers without auto-login loops.

Error handling:

- Retry CSRF recovery at most once per request path.
- Do not relabel permanent auth/permission failures as CSRF refreshes.
- Preserve machine-readable error codes for downstream editor shells.

Regression-test shape:

```ts
test("api client retries csrf-expired requests once but marks 401 as session expired", async () => {
  const result = await requestWithSharedAdminRecovery({ path: "/posts" });
  expect(result).toMatchObject({ ok: true });
});
```

## Security Contract

This leaf changes existing internal admin auth/session behavior only.

- Endpoint visibility: existing internal admin auth/session endpoints only.
- Auth model: authenticated admin session.
- RBAC: unchanged.
- CSRF: preserve current token issuance and refresh boundaries.
- Rate-limit bucket: unchanged existing admin auth/read buckets.
- Reject-unknown validation: unchanged unless auth/session payloads expand.
- Anti-abuse: no ambient polling or silent auto-login loops.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/apiClient.test.ts`
- `bun run test:vitest -- tests/vitest/admin/authClient.test.ts` when an auth/session probe helper changes
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` only if the shared recovery policy changes materially
- `_docs/_TASKS/TASK-322-01_Admin_API_Client_Session_Classification_and_Bounded_CSRF_Retry.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/889-2026-05-21-task-322-01-admin-api-session-classification.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Shared admin requests distinguish CSRF-refreshable failures from full session
  expiry through one client owner.
- CSRF refresh remains bounded and never loops indefinitely.
- Downstream editor shells receive stable machine-readable expired-session
  failures they can render without widget-local heuristics.

## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/admin/apiClient.test.ts` - passed (`5`
  tests)
- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `bun run precommit` - passed

## Completion Notes

- 2026-05-21: shared `apiClient` now classifies `csrf_refresh`,
  `session_expired`, and `generic_error` paths separately and annotates
  `ApiClientError` instances with machine-readable `sharedFailureKind`.
