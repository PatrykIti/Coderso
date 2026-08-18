# TASK-467-01: Extract Lightweight Custom Screens Cache Invalidation
# FileName: TASK-467-01-Extract-Lightweight-Custom-Screens-Cache-Invalidation.md

**Parent Task:** TASK-467
**Priority:** High
**Category:** Admin Build / Admin Cache / Assistant
**Estimated Effort:** Small
**Dependencies:** TASK-467
**Status:** ✅ Done
**Changelog:** 1308 (pinned; closure only)

---

**Implemented 2026-08-18:** memory-invalidator registry in
`customScreensCache.ts` (register/clear with per-callback guard), assistantClient
uses `clearCustomScreensCacheLightweight`, shortcuts client registers its
promise/cache reset. assistantClient.test.ts split into
assistantClientCacheInvalidation.test.ts to stay under the 1,000-line gate.
Gates: lint + lint:types green, targeted vitest 55/55 green, build:admin +
check:admin-bundle green. check:admin-boundary pre-existing failure recorded
(not owned by this leaf).

## Overview

**Re-scoped 2026-08-18 after pre-implementation audit:** the original premise
(an `AdminShell -> AssistantPanel -> assistantClient -> customScreensClient`
edge) is already gone. `core/admin/services/assistantClient.ts:16` imports
`clearCustomScreenDetailBrowserCache` and `clearCustomScreensBrowserCache` from
the lightweight `customScreensCache.ts`, which imports only `clearLocalCache`
and `cacheKeys`. The remaining real gap is that `customScreensCache.ts` has no
in-memory invalidator registry: the full client's `pendingScreensList` /
`customScreensListCache` and the shortcuts client's `cachedShortcutsPromise`
are cleared only by their own modules, so assistant-triggered invalidations do
not reach every in-memory owner consistently.

This task adds a lightweight Custom Screens cache invalidation owner with a
memory-cache invalidator registry that can be safely imported by
`assistantClient` without importing Custom Screen document normalization,
binding resolution, widget runtime registration, or widget editor code.

Pre-implementation audit (fresh agent, 2026-08-18):
- HIGH: premise 467-01 stale — assistantClient already imports from
  `customScreensCache` (lightweight) without the heavy client; confirmed at
  `core/admin/services/assistantClient.ts:16` and `customScreensCache.ts`
  (no heavy imports).
- Real gap confirmed: no `registerCustomScreensCacheInvalidator` /
  `clearCustomScreensCacheLightweight` anywhere in `core/`; memory owners are
  not registered centrally.

## Sub-Tasks

- [ ] Extend `core/admin/services/customScreensCache.ts` with a memory-cache
  invalidator registry (`registerCustomScreensCacheInvalidator` +
  `clearCustomScreensCacheLightweight`) that clears registered in-memory
  owners and the browser list key.
- [ ] Register the shortcuts client's in-memory cache promise
  (`cachedShortcutsPromise`) with the registry (this leaf owns
  `customScreenShortcutsClient.ts`).
- [ ] Rewire `assistantClient.ts` custom-screen action handling to call
  `clearCustomScreensCacheLightweight` (which clears browser keys AND
  registered memory invalidators) instead of only the browser-key helpers.
- [ ] Add tests proving assistant cache invalidation clears memory and browser
  Custom Screens cache without importing the full client path.

Note: `customScreensClient.ts` is NOT owned by this leaf; TASK-467-02 owns the
full client split and registers its memory invalidators there. This leaf owns
only `customScreensCache.ts`, `customScreenShortcutsClient.ts`, and
`assistantClient.ts`.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/services/customScreensCache.ts` | Add `registerCustomScreensCacheInvalidator` + `clearCustomScreensCacheLightweight` memory-invalidator registry (owner of this leaf). |
| `core/admin/services/assistantClient.ts` | Replace the browser-only `clearCustomScreensBrowserCache()` call in custom-screen action handling with `clearCustomScreensCacheLightweight()` so memory invalidators fire too. |
| `core/admin/services/customScreenShortcutsClient.ts` | Register `cachedShortcutsPromise` reset with the registry via `registerCustomScreensCacheInvalidator`. |
| `core/admin/services/cachePolicy.ts` | Reference only if cache key ownership needs a narrower helper (no change expected). |
| `tests/vitest/admin/assistantClient.test.ts` | Assert assistant action cache events still clear Custom Screens list/detail cache keys AND trigger the registered memory invalidators. |
| `tests/vitest/admin/customScreensCache.test.ts` | NEW: registry add/remove, idempotent clear, browser-key clear, no heavy imports (import boundary). |

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
// customScreenShortcutsClient.ts
import { registerCustomScreensCacheInvalidator } from "./customScreensCache";

registerCustomScreensCacheInvalidator(() => {
  cachedShortcutsPromise = null;
  customScreenShortcutsCache.clear();
});
```

Note: the full `customScreensClient.ts` memory-owner registration (its
`pendingScreensList` / `customScreensListCache` invalidator) is owned by
TASK-467-02, which splits that file and registers its memory invalidators
through the same registry. This leaf must not edit `customScreensClient.ts`.

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

- `bun run test:vitest -- tests/vitest/admin/assistantClient.test.ts tests/vitest/admin/customScreensCache.test.ts`
- (customScreensClient.test.ts split coverage is owned by TASK-467-02)
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
