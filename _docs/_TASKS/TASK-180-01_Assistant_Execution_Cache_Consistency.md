# TASK-180-01: Assistant Execution Cache Consistency
# FileName: TASK-180-01_Assistant_Execution_Cache_Consistency.md

**Priority:** High
**Category:** Assistant/Admin UI + Cache Consistency
**Estimated Effort:** Large
**Dependencies:** TASK-180, TASK-179-07
**Status:** Done (2026-04-18)

---

## Overview

Make assistant action execution invalidate admin cache consistently across CMS resource families.

This is the technical cache-consistency subtask under TASK-180. It owns the execution-result to cache-event path and the admin subscribers/clear helpers needed for stale-free UI after assistant mutations.

## Sub-Tasks

- `TASK-180-01-01_Execution_Result_to_Cache_Event_Matrix.md`
- `TASK-180-01-02_Admin_Cache_Subscribers_and_Clear_Helpers.md`

## Architecture

Current code in `core/admin/services/assistantClient.ts` handles only:

- `custom-screen.delete/update/upsert/widget.patch`
- `page.delete/update/upsert/widget.patch`

This subtask must generalize that code without weakening safety:

- map successful execution results to known cache keys,
- derive detail key inputs from the matching planned action when `resourceId` is not enough,
- clear owned in-memory client caches where those helpers exist,
- broadcast through `cacheBus`,
- ignore failed results and unknown action types.

## Integration Points

- `core/admin/services/assistantClient.ts`
- `core/admin/services/cachePolicy.ts`
- `core/admin/services/*Client.ts`
- `core/admin/utils/cacheBus.ts`
- cache subscribers in pages/forms/listings/entries/content-types/menus/widgets/custom-screens

## Acceptance Criteria

1. Every successful assistant-executed supported CMS mutation has a documented cache event mapping.
2. Page and custom screen invalidation behavior remains unchanged.
3. Failed execution results do not invalidate caches.
4. Cache event keys are derived only from known action/result contracts.
5. Open admin lists/editors can refresh without full reload when matching cache events are broadcast.

## Security Contract

- Visibility: internal admin UI cache behavior only.
- Auth model: existing admin session.
- RBAC: cache events do not grant access; backend execute permissions remain authoritative.
- CSRF: unchanged; execute stays CSRF-protected.
- Rate-limit bucket: unchanged `assistant`.
- Reject-unknown validation: unknown action/result shapes are ignored for cache invalidation.
- Anti-abuse: provider/client payloads cannot inject arbitrary cache keys.
- Secret handling: cache events must not include secrets, submissions, provider payloads, CSRF tokens, cookies, or privileged settings.

## Testing Requirements

- Covered by leaf tests.
- Parent validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run --config vitest.config.ts tests/vitest/admin/assistantClient.test.ts`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if coverage ownership notes change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion

## Completion Notes (2026-04-18)

- Added a centralized assistant execution cache mapper in the admin client.
- Successful non-noop action results now invalidate/broadcast known CMS cache keys across supported cached admin families.
- SEO manager now consumes `seo:list` and `seo:detail:<id>` cache bus events.
- Cache bus broadcasts now fan out to same-tab subscribers.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/admin/cacheBus.test.ts tests/vitest/admin/assistantClient.test.ts`
- `bun run vitest run --config vitest.config.ts tests/vitest/admin/seoClient.test.ts tests/vitest/ui/seo-manager.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
