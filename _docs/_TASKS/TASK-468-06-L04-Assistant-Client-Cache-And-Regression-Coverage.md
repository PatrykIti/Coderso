# TASK-468-06-L04: Assistant Client Cache And Regression Coverage
# FileName: TASK-468-06-L04-Assistant-Client-Cache-And-Regression-Coverage.md

**Parent Subtask:** TASK-468-06
**Priority:** High
**Category:** Assistant / Admin Cache / Regression Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-468-06-L03, TASK-467-01
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Overview

Finish the assistant/cache cutover with client integration and regression
coverage. This leaf ensures assistant changes invalidate Custom Screen editor,
list, runtime, and active-surface caches without reintroducing the heavy import
path fixed by TASK-467.

## Sub-Tasks

- [x] Wire assistant mutation success to lightweight Custom Screen cache
  invalidation helpers.
- [x] Do not start this leaf until TASK-467-01 has landed
  `core/admin/services/customScreensCache.ts`,
  `clearCustomScreensCacheLightweight`, and invalidator registration.
- [x] Ensure active-surface cache refreshes after screen and entry mutations.
- [x] Add regression tests proving assistant client imports do not pull the full
  custom screen editor client into lightweight bundles.
- [x] Run admin bundle checks and record evidence in TASK-468-06.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/services/assistantClient.ts` | Use lightweight invalidation helpers only. |
| `core/admin/services/customScreensCache.ts` | Reuse TASK-467-01 lightweight invalidation owner (`clearCustomScreensCacheLightweight`, invalidator registration). |
| `core/admin/services/customScreensClient.ts` | Register full-client cache invalidators with the lightweight owner; do not import this module from `assistantClient.ts`. |
| `core/admin/services/customScreenShortcutsClient.ts` | Register shortcut/sidebar invalidators with the lightweight owner. |
| `core/admin/services/cachePolicy.ts` | Extend cache keys/TTLs if needed. |
| `core/admin/ui/assistant/activeSurfaceContext.ts` | Add or reuse an explicit active-surface invalidation hook for V4 screen mutations. |
| `core/admin/ui/custom-screens/assistantSurface.ts` | Keep screen-specific active-surface summaries coherent after V4 mutations. |
| `tests/vitest/assistant/customScreenAssistantCache.test.ts` | Cache/invalidation regression coverage. |
| `_docs/_TASKS/TASK-468-06-Assistant-Active-Surface-And-Cache-Cutover.md` | Bundle/cache evidence. |

## Implementation Pseudocode

```ts
function handleAssistantScreenMutationSuccess(result: AssistantMutationResult) {
  if (result.kind !== "custom-screen") {
    return;
  }
  clearCustomScreensCacheLightweight();
  broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.customScreenDetail(result.screenId), action: "update" });
  invalidateAssistantActiveSurface({ kind: "custom-screen", screenId: result.screenId });
}
```

Data flow:

- Assistant executor returns safe mutation result metadata.
- Admin assistant client calls the TASK-467 lightweight invalidation helper.
- Cache bus refreshes editor/list/runtime/active-surface consumers.

Error handling:

- Failed assistant mutations do not invalidate caches unless the server reports
  partial success.
- Missing screen ids are ignored with bounded diagnostics.
- Import guard failures block closure because they risk regressing TASK-467.

Regression-test shape:

```ts
test("assistant client invalidates custom screen cache without full editor import", async () => {
  await handleAssistantScreenMutationSuccess(customScreenMutationResult);
  expect(broadcastCacheEvent).toHaveBeenCalledWith({
    key: cacheKeys.customScreenDetail("products"),
    action: "update",
  });
  expect(readSourceImports("core/admin/services/assistantClient.ts")).not.toContain(
    "customScreensEditorClient"
  );
  expect(readSourceImports("core/admin/services/assistantClient.ts")).not.toContain(
    "customScreensClient"
  );
});
```

## Security Contract

- **Endpoint visibility:** existing internal assistant/admin endpoints.
- **Auth model:** authenticated admin session.
- **RBAC:** unchanged from assistant executor policy.
- **CSRF expectations:** unchanged for assistant mutations.
- **Rate-limit bucket:** existing assistant/admin buckets.
- **Reject unknown validation:** mutation result metadata is typed and does not
  accept arbitrary client-provided cache keys.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** cache invalidation events contain ids/reasons only, not
  raw record values or secrets.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/assistant/customScreenAssistantCache.test.ts`
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache events change.
- `_docs/_TASKS/TASK-468-06-Assistant-Active-Surface-And-Cache-Cutover.md`

## Acceptance Criteria

1. Assistant V4 mutations refresh Custom Screen caches and active-surface state.
2. Lightweight assistant imports do not pull full Custom Screen editor/client
   modules.
3. TASK-468-06 records bundle/cache validation evidence before closure.
