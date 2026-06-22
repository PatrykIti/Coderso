# TASK-467-01: Extract Lightweight Custom Screens Cache Invalidation
# FileName: TASK-467-01-Extract-Lightweight-Custom-Screens-Cache-Invalidation.md

**Parent Task:** TASK-467
**Priority:** High
**Category:** Admin Build / Admin Cache / Assistant
**Estimated Effort:** Small
**Dependencies:** TASK-467
**Status:** ⏳ To Do

---

## Overview

Remove the import edge:

```text
AdminShell -> AssistantPanel -> assistantClient -> customScreensClient
```

The current `assistantClient.ts` imports `clearCustomScreensCache` from the full
`customScreensClient.ts` only for assistant action cache invalidation. That
small helper drags the heavy Custom Screens client module, and its domain/widget
normalizer imports, into the shell/assistant bundle graph.

This task creates a lightweight Custom Screens cache invalidation owner that can
be safely imported by `assistantClient` without importing Custom Screen document
normalization, binding resolution, widget runtime registration, or widget editor
code.

## Sub-Tasks

- [ ] Create a browser-safe lightweight Custom Screens cache invalidation
  helper.
- [ ] Rewire `assistantClient.ts` to import only that helper.
- [ ] Rewire the full `customScreensClient.ts` to share the same invalidation
  owner so behavior remains cache-bus consistent.
- [ ] Register every in-memory Custom Screens cache owner with the helper,
  including shortcuts/navigation cache promises.
- [ ] Add tests proving assistant cache invalidation no longer imports the full
  Custom Screens client path.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/services/customScreensClient.ts` | Stop being the only owner of cache invalidation. Reuse the lightweight helper. |
| `core/admin/services/assistantClient.ts` | Replace `clearCustomScreensCache` import with the lightweight helper. |
| `core/admin/services/customScreenShortcutsClient.ts` | Register its shortcut promise/cache invalidator with the same lightweight helper. |
| `core/admin/services/cachePolicy.ts` | Reference only if cache key ownership needs a narrower helper. |
| `tests/vitest/admin/assistantClient.test.ts` | Assert assistant action cache events still clear Custom Screens list/detail cache keys. |
| `tests/vitest/admin/customScreensClient.test.ts` | Assert full client and shortcut cache behavior is unchanged. |

## Implementation Pseudocode

```ts
// core/admin/services/customScreensCache.ts
import { cacheKeys } from "@/services/cachePolicy";
import { clearLocalCache } from "@/utils/storageCache";

const customScreensMemoryInvalidators = new Set<() => void>();

export function registerCustomScreensCacheInvalidator(invalidator: () => void) {
  customScreensMemoryInvalidators.add(invalidator);
  return () => {
    customScreensMemoryInvalidators.delete(invalidator);
  };
}

export function clearCustomScreensCacheLightweight() {
  for (const invalidate of customScreensMemoryInvalidators) {
    invalidate();
  }
  clearLocalCache(cacheKeys.customScreensList);
}
```

```ts
// assistantClient.ts
import { clearCustomScreensCacheLightweight } from "./customScreensCache";

case "custom-screen.upsert":
case "custom-screen.delete":
case "custom-screen.update":
case "custom-screen.section.add":
case "custom-screen.block.add":
case "custom-screen.block.patch":
case "custom-screen.block.move":
case "custom-screen.block.remove":
case "custom-screen.binding.set":
case "custom-screen.list-view.patch":
  clearCustomScreensCacheLightweight();
  emit(cacheKeys.customScreensList, cacheAction);
  if (id) clearAndEmitDetail(cacheKeys.customScreenDetail(id), cacheAction, emit);
```

```ts
// customScreensClient.ts
import {
  clearCustomScreensCacheLightweight,
  registerCustomScreensCacheInvalidator,
} from "./customScreensCache";

registerCustomScreensCacheInvalidator(() => {
  cachedScreensPromise = null;
  customScreensListCache.clear();
});

export const clearCustomScreensCache = () => {
  clearCustomScreensCacheLightweight();
};
```

```ts
// customScreenShortcutsClient.ts
import { registerCustomScreensCacheInvalidator } from "./customScreensCache";

registerCustomScreensCacheInvalidator(() => {
  cachedShortcutsPromise = null;
  customScreenShortcutsCache.clear();
});
```

Error handling:

- The lightweight helper must be safe before the full client is ever imported.
- Clearing a detail id that is null/unknown must only clear the list cache.
- Detail cache clearing remains owned by the existing assistant
  `clearAndEmitDetail` path and by full-client detail invalidation helpers.
- If the full client is loaded, its in-memory promise and memory-backed list
  cache envelope must be invalidated.
- If the shortcuts client is loaded, its in-memory promise must be invalidated.
- If the full client is not loaded, no dynamic import should be triggered.
- A failing invalidator must not prevent later invalidators from running; either
  guard each callback or keep callbacks side-effect-only and covered by tests.

Regression-test shape:

```ts
test("assistant custom screen invalidation stays lightweight", async () => {
  const source = readFile("core/admin/services/assistantClient.ts");
  expect(source).not.toContain("./customScreensClient");
  expect(source).toContain("./customScreensCache");
});

test("custom screen assistant actions clear list and detail cache keys", () => {
  for (const actionType of [
    "custom-screen.upsert",
    "custom-screen.delete",
    "custom-screen.update",
    "custom-screen.section.add",
    "custom-screen.block.add",
    "custom-screen.block.patch",
    "custom-screen.block.move",
    "custom-screen.block.remove",
    "custom-screen.binding.set",
    "custom-screen.list-view.patch",
  ]) {
    const events = executeNotifyFixture(actionType);
    expect(events).toContainEqual({ key: cacheKeys.customScreensList, action: expect.any(String) });
    expect(events).toContainEqual({
      key: cacheKeys.customScreenDetail("screen-1"),
      action: expect.any(String),
    });
  }
});

test("assistant custom screen invalidation clears registered memory caches", () => {
  const listInvalidator = vi.fn();
  const shortcutInvalidator = vi.fn();
  const unregisterList = registerCustomScreensCacheInvalidator(listInvalidator);
  const unregisterShortcut = registerCustomScreensCacheInvalidator(shortcutInvalidator);

  clearCustomScreensCacheLightweight();

  expect(listInvalidator).toHaveBeenCalledTimes(1);
  expect(shortcutInvalidator).toHaveBeenCalledTimes(1);
  unregisterList();
  unregisterShortcut();
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged assistant action result handling.
- **CSRF expectations:** unchanged; helper only reacts after existing action
  execution succeeds.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** cache helper must not inspect or log assistant payloads,
  cookies, CSRF tokens, or Custom Screen document bodies.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/assistantClient.test.ts tests/vitest/admin/customScreensClient.test.ts`
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if the named cache
  owner changes.
- Parent changelog when TASK-467 closes.

## Acceptance Criteria

1. `core/admin/services/assistantClient.ts` has no value import from
   `customScreensClient.ts`.
2. Assistant Custom Screen mutations still clear/broadcast the same list/detail
   cache keys as before.
3. The full Custom Screens client can still clear its in-memory and persisted
   caches when it is imported.
4. `AdminShell` no longer reaches the full Custom Screens client only because
   the assistant panel is mounted.
