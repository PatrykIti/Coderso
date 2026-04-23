# TASK-204-02: Taxonomy Terms Error Boundary and Category Retry
# FileName: TASK-204-02_Taxonomy_Terms_Error_Boundary_and_Category_Retry.md

**Priority:** High
**Category:** CMS/Posts + Taxonomy + Admin/API + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-204, TASK-195-03
**Status:** To Do

---

## Overview

Repair `BUG-7` from the Posts replay. The category dropdown now exists, but a
500 from `GET /admin/api/content-types/post/terms` can surface raw SQL/query
text in the inspector.

This subtask owns both boundaries:

- the taxonomy route must map known and unexpected failures to bounded API
  errors without leaking internals;
- the Posts inspector must show a friendly, retryable category loading state
  instead of rendering raw `ApiClientError.message`.

## Sub-Tasks

- `TASK-204-02-01_Taxonomy_Overview_Route_Error_Mapping_and_Client_Sanitization.md`
- `TASK-204-02-02_Category_Selector_Friendly_Error_and_Retry_State.md`

## Scope

- Harden `taxonomyRoutes` around `/content-types/:id/terms`.
- Keep `taxonomyClient.getTaxonomyOverview()` typed and cache-neutral.
- Map client failures in `PostBlockEditorShell` to safe UI copy.
- Add retry affordance to the Posts category selector without moving API
  fetching into `DocumentInspector`.
- Add route/client/UI tests for the failure path.
- Treat the API route and the browser UI as two separate leak boundaries:
  bounded API copy is required, and the Posts shell must still avoid rendering
  raw `ApiClientError.message` when the failure comes from a network/proxy/dev
  response that is not already sanitized.

Out of scope:

- root-causing a transient Render database connection failure;
- changing taxonomy storage schema;
- adding taxonomy write controls to the Posts inspector;
- inventing a Posts-only taxonomy endpoint.

## Files to Change

- `core/server/routes/taxonomyRoutes.ts:34-123`
- `core/server/routes/taxonomyRoutes.ts:152-158`
- `core/admin/services/taxonomyClient.ts:62-66`
- `core/admin/services/apiClient.ts:60-80` only if shared error parsing needs a
  safe mapping helper
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:239-254`
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:150-173`
- `tests/integration/routes/taxonomy.test.ts`
- `tests/vitest/admin/taxonomyClient.test.ts`
- `tests/vitest/ui/post-document-inspector-wave.test.tsx`
- `tests/vitest/ui-integration/post-document-inspector.test.tsx`

## Security Contract

- Visibility: internal admin taxonomy read endpoint and internal Posts editor UI.
- Auth model: authenticated admin session/API-key path.
- RBAC: `content:read` for `/content-types/:id/terms`.
- CSRF: not required for read-only taxonomy overview; unchanged for other
  taxonomy mutations.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: route params remain path params; mutation schemas
  are unchanged.
- Anti-abuse:
  - no raw SQL, stack traces, query text, constraint details, tokens, headers,
    or database internals in API responses or browser UI,
  - unknown failures remain failures and must not become fake empty category
    successes,
  - retry must re-use the same bounded admin read path.

## Testing Requirements

- Bun:
  - taxonomy routes stay registered,
  - `/content-types/:id/terms` maps known taxonomy errors,
  - unexpected service/database errors return bounded `taxonomy_unexpected_error`
    or equivalent safe code without leaking the raw message.
- Vitest:
  - `taxonomyClient.getTaxonomyOverview()` preserves typed success and rejected
    failures,
  - Posts shell maps taxonomy failures to safe copy from code/status rather than
    blindly forwarding `error.message`,
  - `DocumentInspector` renders retry/fallback state without raw SQL.
- Manual Playwright:
  - simulate or reproduce the 500 path and confirm the inspector shows friendly
    copy plus retry.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CMS_API.md` if taxonomy error codes/messages change
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Taxonomy overview failures are bounded at the API boundary.
2. Posts inspector never renders raw SQL/query text.
3. Users get a clear retry path and can keep editing unrelated post content.
4. Tests cover route, client, and UI failure handling.
