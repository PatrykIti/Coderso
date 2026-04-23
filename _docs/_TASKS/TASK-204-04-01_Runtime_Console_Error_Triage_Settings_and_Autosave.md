# TASK-204-04-01: Runtime Console Error Triage Settings and Autosave
# FileName: TASK-204-04-01_Runtime_Console_Error_Triage_Settings_and_Autosave.md

**Priority:** High
**Category:** CMS/Posts + Settings + Admin/API + Runtime QA
**Estimated Effort:** Medium
**Dependencies:** TASK-204-01, TASK-204-02, TASK-204-03
**Status:** To Do

---

## Overview

Triage the two runtime console findings recorded at the end of
`_docs/PLAYWRIGHT/SUMMARY-POSTS.md` after the 2026-04-23 Posts replay:

- `site.adminPath` settings read failed with raw Drizzle query output.
- `POST /admin/api/posts/:id/autosave` failed after a
  `CONNECTION_CLOSED` database error.

These are not the same issue as `BUG-7`. `BUG-7` is the taxonomy terms endpoint
and Posts category selector. This leaf keeps the settings/admin-path and
autosave evidence separate so final closure can decide whether each finding is
an app-owned error-boundary leak, an environment-only database outage, or a
follow-up owned outside this polish family.

## Sub-Tasks

No child task files.

## Scope

- Reproduce or simulate the settings/admin-path read failure path from the
  source report.
- Reproduce or simulate the posts autosave `CONNECTION_CLOSED` failure path.
- For each path, identify whether raw SQL/query text reaches:
  - the API response body,
  - browser-visible UI copy,
  - browser console/network payloads,
  - server-only logs.
- If raw internals reach an API response or browser UI, fix the route/client/UI
  boundary in this family.
- If the failure is server-log-only or caused by transient Render/Postgres
  connectivity, record environment-only evidence and the named owner seam for a
  future operational follow-up.
- Keep the result linked back into `TASK-204-04` closure and
  `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`.

Out of scope:

- changing the global dev-mode `toErrorResponse()` policy for the whole app;
- hiding real autosave failures behind fake success;
- changing post autosave persistence semantics;
- changing settings storage schema;
- broad Render/Postgres root-cause work unless the replay proves a
  deterministic app-level bug.

## Files to Change

- `core/server/routes/settingsRoutes.ts`
- `core/services/settings/settingsService.ts`
- `core/server/routes/postsRoutes.ts`
- `core/admin/services/siteSettingsClient.ts` only if client error mapping needs
  bounded handling for settings/admin-path reads.
- `core/admin/services/postsClient.ts` only if autosave client error mapping
  needs bounded handling.
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` only if autosave
  failure copy can surface raw server messages.
- `tests/integration/routes/settings.test.ts`
- `tests/integration/routes/postsRoutes.test.ts`
- `tests/vitest/admin/siteSettingsClient.test.ts`
- `tests/vitest/admin/postsClient.test.ts`
- `tests/vitest/ui-integration/post-autosave-flow.test.tsx`

## Implementation Notes

- Treat settings and autosave as two independent findings.
- Start with route-boundary tests:
  - settings route failures should not return raw Drizzle query text if the
    response is intended for the admin browser;
  - posts autosave unexpected failures should map to stable safe copy if the
    current route/global handler would expose the raw `CONNECTION_CLOSED`
    message to the browser.
- Do not change `toErrorResponse()` globally unless a broader task explicitly
  owns that policy. Prefer route-family mapping for the observed Posts replay
  paths.
- Keep server diagnostics useful, but do not let SQL, stack traces, credentials,
  database hosts, or raw driver messages become user-facing copy.
- If a failure cannot be reproduced with a reachable database, record that as a
  validation limitation and leave a concrete rerun command.

## Security Contract

- Visibility: internal admin settings and Posts editor APIs only.
- Auth model: existing authenticated admin session or admin API-key path.
- RBAC:
  - `settings:read` for settings/admin-path reads;
  - `content:write` for posts autosave.
- CSRF: unchanged; posts autosave remains a mutating admin write and must keep
  the existing CSRF behavior.
- Rate-limit buckets: existing `admin_read` and `admin_write`.
- Reject-unknown validation:
  - settings payload validation is unchanged;
  - `postAutosaveSchema` remains the autosave payload owner.
- Anti-abuse:
  - no raw SQL, stack traces, database hosts, tokens, secrets, headers, or driver
    internals in API responses or UI copy;
  - autosave failure feedback must remain truthful and must not imply a saved
    revision when persistence failed;
  - environment-only failures must be documented as such instead of marked fixed
    without replay evidence.

## Testing Requirements

- Bun:
  - `set -a && source .env && set +a && bun test tests/integration/routes/settings.test.ts tests/integration/routes/postsRoutes.test.ts`
- Vitest, if browser/client handling changes:
  - `bun run test:vitest -- tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/admin/postsClient.test.ts tests/vitest/ui-integration/post-autosave-flow.test.tsx`
- Manual Playwright or equivalent browser replay:
  - capture whether the `site.adminPath` settings read reproduces,
  - capture whether posts autosave `CONNECTION_CLOSED` reproduces,
  - record whether either path exposes raw internals to browser UI/network data
    or only to server logs.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/_TASKS/TASK-204-04_QA_Docs_and_Playwright_Source_Closure.md`
- `_docs/CMS_API.md` if route error codes/messages change
- `_docs/CONTENT_EDITOR_UX.md` if autosave failure UX changes
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `site.adminPath` settings read and posts autosave are classified separately
   from `BUG-7`.
2. Any app-owned API/UI raw-error leak in those paths is fixed with tests.
3. Any environment-only DB/connectivity failure is recorded with concrete replay
   evidence and a named owner seam.
4. Final `TASK-204-04` closure can map both console findings to fixed,
   environment-only, or follow-up status without ambiguity.
