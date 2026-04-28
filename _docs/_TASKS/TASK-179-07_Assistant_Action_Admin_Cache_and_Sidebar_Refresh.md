# TASK-179-07: Assistant Action Admin Cache and Sidebar Refresh
# FileName: TASK-179-07_Assistant_Action_Admin_Cache_and_Sidebar_Refresh.md

**Priority:** High
**Category:** Assistant/Admin UI + Cache Consistency
**Estimated Effort:** Medium
**Dependencies:** TASK-179, TASK-178-05, TASK-178-06
**Status:** Done (2026-04-17)

---

## Overview

Fix SPA cache and navigation refresh after `LLM Guide` executes resource mutations.

Observed scenario:

1. User asks which custom screens are available in `Screens`.
2. Assistant resolves `House Projects ...`.
3. User asks to delete it.
4. Assistant executes `custom-screen.delete` successfully.
5. The deleted screen still appears:
   - in the left Coderso sidebar shortcut area,
   - in the current `Screens` list/table,
   until a full page reload.

The mutation succeeded, but admin UI state did not refresh dependent resources.

## Sub-Tasks

No child task files.

## Architecture

`executeAssistantActions` should invalidate and broadcast cache changes for resource families touched by assistant action results.

For `custom-screen.delete` this must cover:

- `cacheKeys.customScreensList`,
- `cacheKeys.customScreenDetail(id)`,
- admin navigation/sidebar shortcut data that depends on `customScreens`,
- any current `CustomScreenListPage` view subscribed through `cacheBus`.

The fix should be generic enough to support other action families over time, but the first acceptance path is custom-screen deletion because it directly affects the `Screens` list and Coderso sidebar shortcut menu.

## Integration with Current Code

- Reuse `core/admin/utils/cacheBus.ts`.
- Reuse `core/admin/services/cachePolicy.ts`.
- Reuse existing custom screens client cache invalidation conventions.
- Extend `core/admin/services/assistantClient.ts` or a narrow helper so assistant execution results broadcast resource-family cache events.
- Ensure `AdminShell` / navigation listens to the relevant cache event or has a targeted refresh path for custom screen sidebar shortcuts.
- Ensure `CustomScreenListPage` refreshes when `customScreens:list` is invalidated/updated.
- Do not add full page reloads.

## Files to Change

- `core/admin/services/assistantClient.ts`
- `core/admin/services/cachePolicy.ts` only if a new nav/sidebar cache key is needed
- `core/admin/ui/layouts/AdminShell.tsx` or the current sidebar/custom-screen shortcut owner
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- `tests/vitest/admin/assistantClient.test.ts`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `tests/vitest/ui-integration/*admin-shell*` if sidebar refresh is covered there
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`

## Acceptance Criteria

1. After `custom-screen.delete` execution result, `customScreens:list` is invalidated/broadcast.
2. Deleted custom screen detail cache is invalidated.
3. Current `Screens` list/table refreshes without full reload.
4. Coderso sidebar custom screen shortcut disappears without full reload.
5. The invalidation path is driven by assistant execution results and can be extended to other action families.
6. No secret/action payload data is broadcast; only cache keys/action metadata.

## Security Contract

- Visibility: admin UI/cache only.
- Auth model: existing admin session.
- RBAC: cache invalidation does not grant access or mutate backend state.
- CSRF: unchanged; mutations still require assistant execute CSRF.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: execution result parsing must handle unknown action types safely.
- Anti-abuse:
  - no arbitrary cache key broadcast from provider/client payload,
  - broadcast only known keys derived from validated action/result types.
- Secret handling:
  - no provider payloads, secrets, form submissions, API keys, cookies, or CSRF tokens in cache events.

## Testing Requirements

- Vitest admin client test for assistant execute invalidating custom-screen cache keys.
- UI/integration test proving current screen list or sidebar responds to custom-screen invalidation.
- Regression that read-only inspection does not invalidate caches.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-04-17)

- `executeAssistantActions` now invalidates known resource-family caches from successful assistant action results.
- `custom-screen.delete`, `custom-screen.update`, `custom-screen.upsert`, and `custom-screen.widget.patch` clear custom screen client memory cache and broadcast `customScreens:list`.
- Touched custom screen detail keys are invalidated or updated from execution result `resourceId`.
- Assistant-executed `page.*` actions now clear page client memory cache and broadcast `pages:list` plus touched `pages:detail:<id>` cache events.
- Existing `AdminShell` and custom screen list subscriptions consume `customScreens:list` cache bus events, so the sidebar shortcut area and current Screens list can refresh without full reload.
- Added admin client regression coverage for custom screen cache invalidation after assistant execution.
- Added admin client regression coverage for page cache invalidation after assistant execution.
