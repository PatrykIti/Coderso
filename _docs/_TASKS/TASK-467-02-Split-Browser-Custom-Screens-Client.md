# TASK-467-02: Split Browser Custom Screens Client
# FileName: TASK-467-02-Split-Browser-Custom-Screens-Client.md

**Parent Task:** TASK-467
**Priority:** High
**Category:** Admin UI / Custom Screens / Bundle Performance / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-467-01
**Status:** ⏳ To Do
**Changelog:** 1308 (pinned; closure only)

---

## Overview

Split `core/admin/services/customScreensClient.ts` so list/sidebar/cache users
can import a lightweight browser client without importing editor-only Custom
Screen document normalization and widget-binding logic.

The current client imports:

- `normalizeCustomScreenDefinitionForRead` from
  `core/services/customScreens/customScreenSchemas`,
- `resolveCustomScreenCapabilities` from
  `core/services/customScreens/capabilities`.

Those service imports can reach `bindingResolver`, runtime widget registration,
and core widget definitions. That is correct for editor/building flows that must
normalize full Custom Screen definitions, but too heavy for list/sidebar/cache
flows.

Pre-implementation audit (fresh agent, 2026-08-18):
- This leaf owns `customScreensClient.ts` (split + memory-invalidator
  registration) and its tests. It must NOT edit `customScreensCache.ts`,
  `customScreenShortcutsClient.ts`, or `assistantClient.ts` (owned by
  TASK-467-01).
- TASK-467-01 lands first: the lightweight cache invalidation owner already
  provides `registerCustomScreensCacheInvalidator` /
  `clearCustomScreensCacheLightweight`. This leaf registers the full client's
  in-memory owners (`pendingScreensList`, `customScreensListCache`) with that
  registry so assistant-triggered invalidations clear them too.

## Sub-Tasks

- [ ] Identify all imports of `customScreensClient.ts` and classify them as
  list/sidebar/cache, editor/detail, records workspace, or mutation-only.
- [ ] Create a lightweight Custom Screens DTO/cache client for list/sidebar and
  basic mutations.
- [ ] Move lightweight summary DTO validation into a pure domain contract module
  instead of duplicating schema ownership in the admin client.
- [ ] Register the full client's in-memory cache owners (`pendingScreensList`,
  `customScreensListCache`) with TASK-467-01's
  `registerCustomScreensCacheInvalidator` so assistant invalidation clears them.
- [ ] Move editor-only full definition normalization into a lazily imported
  module used only by builder/detail routes.
- [ ] Remove list/sidebar imports that currently derive capabilities through
  `bindingResolver` or widget runtime registration.
- [ ] Preserve existing cache keys, cache-bus broadcasts, and route payload
  semantics.
- [ ] Add bundle and behavior tests that prove list/shell imports do not reach
  widget runtime registration.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/customScreenSummaryContract.ts` | New pure owner for lightweight summary DTO types, enum guards, null normalization, and defensive browser/cache validation. Must not import `customScreenSchemas`, `capabilities`, `bindingResolver`, or `widgets/runtime`. |
| `core/admin/services/customScreensClient.ts` | Either become the lightweight client or re-export from split modules without importing heavy editor-only code. Register `pendingScreensList` + `customScreensListCache` memory invalidators via `registerCustomScreensCacheInvalidator` (owned by this leaf). |
| `core/admin/services/customScreensEditorClient.ts` | New optional owner for full definition normalization and editor-detail helpers. |
| `scripts/adminBoundaryReport.ts` or focused import-graph test helper | Add TASK-467 Custom Screens browser-client forbidden-path coverage when the existing admin boundary rules are not specific enough. |
| `core/admin/ui/custom-screens/CustomScreenListPage.tsx` | Import only lightweight list/mutation helpers. |
| `core/admin/ui/custom-screens/hooks/useCustomScreens.ts` | Import only lightweight list/cache helpers. |
| `core/admin/ui/custom-screens/customScreenListModel.ts` | Stop importing `resolveCustomScreenCapabilities`, `bindingResolver`, or runtime widget registration. Consume server summary capabilities or a lightweight primitive summary only. |
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | Import full editor/detail helpers. |
| `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` | Use lightweight or editor-detail helper according to actual data needs. |
| `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | Use editor-detail helper only if it needs normalized full definitions. |
| `core/admin/utils/adminPrefetchCustomScreens.ts` | Classify the dynamic `customScreensClient` import and keep prefetch on the lightest client/detail helper that preserves existing prefetch behavior. |
| `tests/vitest/customScreens/customScreenSummaryContract.test.ts` | New focused pure-contract tests for summary DTO normalization, null defaults, invalid row rejection, preserved unknown editor payloads, and import boundary. |
| `tests/vitest/admin/customScreensClient.test.ts` | Split lightweight vs editor-normalized behavior coverage; assert memory invalidators registered with TASK-467-01 registry. |
| `tests/vitest/admin/adminPrefetch.test.ts` | Preserve Custom Screens prefetch behavior after moving list/detail imports. |
| `tests/vitest/admin/adminBundleReport.test.ts` | READ-ONLY reference: file owned by TASK-467-03-L04 (closure evidence). Record this leaf's reduced graph numbers in L04's evidence. |

Ownership: `customScreenShortcutsClient.ts`, `customScreensCache.ts`, and
`assistantClient.ts` are owned by TASK-467-01; do not edit them here.

## Implementation Pseudocode

```ts
// core/services/customScreens/customScreenSummaryContract.ts
export type CustomScreenSummaryRecord = {
  id: string;
  name: string;
  contentTypeId: string;
  status: "draft" | "active";
  collectionRole: string | null;
  compositionKey: string | null;
  showInSidebar: boolean;
  sidebarLabel: string | null;
  schemaVersion: number;
  definition?: unknown;
  blocks?: unknown[];
  bindings?: unknown[];
  capabilities?: {
    supportsDedicatedPreview?: boolean;
    supportsDedicatedEditor?: boolean;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export function normalizeCustomScreenSummaryRecord(raw: unknown): CustomScreenSummaryRecord {
  // Browser-cache DTO validation only: require stable list fields, normalize
  // nullables, preserve unknown definition payload for editor route handoff.
  // Do not call full definition normalizers, capability resolvers,
  // bindingResolver, or runtime widget registration here.
}
```

```ts
// core/admin/services/customScreensClient.ts
import {
  normalizeCustomScreenSummaryRecord,
  type CustomScreenSummaryRecord,
} from "../../services/customScreens/customScreenSummaryContract";

export async function listCustomScreensCached(options?: { force?: boolean }) {
  const payload = await apiRequest<{ items: unknown[] }>("/custom-screens");
  return payload.items.map(normalizeCustomScreenSummaryRecord);
}
```

```ts
// core/admin/services/customScreensEditorClient.ts
import {
  normalizeCustomScreenDefinitionForRead,
} from "../../services/customScreens/customScreenSchemas";
import {
  resolveCustomScreenCapabilities,
} from "../../services/customScreens/capabilities";
import {
  // New helper exported by the lightweight client. It returns the cache-safe raw
  // summary DTO without importing editor-only normalization.
  getCustomScreenRawCached,
  type CustomScreenSummaryRecord,
} from "./customScreensClient";

export type CustomScreenRecord = CustomScreenSummaryRecord & {
  definition: CustomScreenDefinition;
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  capabilities: CustomScreenCapabilities;
};

export function normalizeCustomScreenRecordForEditor(raw: CustomScreenSummaryRecord): CustomScreenRecord {
  const definition = normalizeCustomScreenDefinitionForRead({
    definition: raw.definition,
    schemaVersion: raw.schemaVersion,
    blocks: raw.blocks,
    bindings: raw.bindings,
  });
  return {
    ...raw,
    definition,
    blocks: definition.editorView.blocks,
    bindings: definition.editorView.bindings,
    capabilities: raw.capabilities ?? resolveCustomScreenCapabilities(definition),
  };
}

export async function getCustomScreenEditorCached(id: string, options?: { force?: boolean }) {
  const raw = await getCustomScreenRawCached(id, options);
  return normalizeCustomScreenRecordForEditor(raw);
}
```

Data flow:

- List/sidebar routes read lightweight summary records and server-provided
  `capabilities` when available.
- The lightweight summary contract must preserve both `supportsDedicatedPreview`
  and `supportsDedicatedEditor` when the server sends capabilities, or expose an
  equivalent primitive mode field so list/sidebar UI can keep "Preview only" and
  "Workspace ready" states without calling full capability resolution.
- Keep this split as move-not-redesign work: TASK-467 should extract the current
  full editor normalization behind a lazy boundary, while TASK-468 owns the later
  Custom Screens V4 canvas/data-model rewrite.
- The implementation must choose one lightweight list owner: either consume
  the existing `customScreenShortcutsClient.ts` (owned by TASK-467-01; read-only
  here) as the lightweight list client, or share the same
  `customScreenSummaryContract` plus the TASK-467-01 cache invalidator registry.
  Do not edit `customScreenShortcutsClient.ts` in this leaf and do not create a
  separate normalizer over the same `cacheKeys.customScreensList` storage key.
- `customScreenListModel.ts`, `CustomScreenListPage`, `useCustomScreens`, and
  shortcut/sidebar flows must not derive capabilities through
  `resolveCustomScreenCapabilities`; they consume only the primitive summary
  contract.
- `adminPrefetchCustomScreens.ts` currently uses a dynamic import of
  `customScreensClient`; it must be classified with the other list/detail
  consumers and either point at the lightweight list/detail client or an
  editor-detail helper according to the actual prefetch path. Do not leave it
  as an accidental full-normalization preload edge.
- Boundary validation must follow the import graph, not only direct source text:
  the lightweight client, shortcut/list client, and list model entrypoints must
  not reach `customScreenSchemas`, `capabilities`, `bindingResolver`, or
  `widgets/runtime` through one-hop wrapper modules.
- Builder/editor routes import the editor client and run full normalization
  before rendering blocks/bindings.
- Mutations still send the existing API payloads through the same internal
  `/custom-screens` routes and emit the same cache-bus events.
- `apiRequest("/custom-screens")` remains the browser client call convention;
  `apiRequest` owns the `/admin/api` prefix. No route path change is intended.

Error handling:

- Lightweight summary normalization rejects invalid list rows from cache but
  must not destructively rewrite stored definitions.
- Editor normalization keeps existing domain errors and editor fallback behavior.
- If a server response lacks `capabilities`, list/sidebar may derive only the
  minimal supported shortcut state from stable primitive fields; full capability
  derivation remains editor-only unless a lightweight server DTO is added.

Regression-test shape:

```ts
test("summary contract normalizes nullables and preserves editor payloads", () => {
  const record = normalizeCustomScreenSummaryRecord(rawSummaryFixture);
  expect(record.collectionRole).toBeNull();
  expect(record.compositionKey).toBeNull();
  expect(record.sidebarLabel).toBeNull();
  expect(record.capabilities?.supportsDedicatedPreview).toBe(
    rawSummaryFixture.capabilities.supportsDedicatedPreview
  );
  expect(record.capabilities?.supportsDedicatedEditor).toBe(
    rawSummaryFixture.capabilities.supportsDedicatedEditor
  );
  expect(record.definition).toBe(rawSummaryFixture.definition);
});

test("lightweight custom screens client does not import domain widget runtime", () => {
  const source = readFile("core/admin/services/customScreensClient.ts");
  expect(source).not.toContain("customScreens/customScreenSchemas");
  expect(source).not.toContain("customScreens/capabilities");
  expect(source).not.toContain("bindingResolver");
  expect(source).not.toContain("widgets/runtime");
});

test("list custom screen model stays on lightweight summary contract", () => {
  for (const path of [
    "core/admin/ui/custom-screens/CustomScreenListPage.tsx",
    "core/admin/ui/custom-screens/hooks/useCustomScreens.ts",
    "core/admin/ui/custom-screens/customScreenListModel.ts",
    "core/admin/services/customScreensClient.ts",
  ]) {
    const source = readFile(path);
    expect(source).not.toContain("resolveCustomScreenCapabilities");
    expect(source).not.toContain("bindingResolver");
    expect(source).not.toContain("widgets/runtime");
  }
});

test("lightweight custom screen graph cannot reach editor-only modules", () => {
  const report = analyzeAdminBoundary({
    entrypoints: [
      "core/admin/services/customScreensClient.ts",
      "core/admin/services/customScreenShortcutsClient.ts",
      "core/admin/utils/adminPrefetchCustomScreens.ts",
      "core/admin/ui/custom-screens/customScreenListModel.ts",
      "core/admin/ui/custom-screens/hooks/useCustomScreens.ts",
    ],
    forbiddenPathRules: [
      {
        label: "custom screen full definition schema",
        path: "core/services/customScreens/customScreenSchemas.ts",
        exact: true,
      },
      {
        label: "custom screen capability resolver",
        path: "core/services/customScreens/capabilities.ts",
        exact: true,
      },
      {
        label: "custom screen binding resolver",
        path: "core/services/customScreens/bindingResolver.ts",
        exact: true,
      },
      { label: "widget runtime", path: "core/widgets/runtime.tsx", exact: true },
    ],
  });

  expect(report.violations).toEqual([]);
});

test("editor custom screens client keeps full definition normalization", async () => {
  const record = normalizeCustomScreenRecordForEditor(rawFixture);
  expect(record.definition.schemaVersion).toBe(3);
  expect(record.blocks).toEqual(record.definition.editorView.blocks);
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints unless the implementation chooses a
  later explicit lightweight summary route task; default is existing internal
  `/admin/api/custom-screens`.
- **Auth model:** authenticated admin session.
- **RBAC:** unchanged `content:read` and `content:write` expectations.
- **CSRF expectations:** unchanged for POST/PATCH/DELETE.
- **Rate-limit bucket:** existing admin API bucket.
- **Reject unknown validation:** server route/service normalizers remain the
  write authority; lightweight client DTO validation is cache/UI defensive only.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** do not persist secrets or privileged settings in browser
  cache. Do not log raw screen definitions in bundle reports or tests.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens/customScreenSummaryContract.test.ts`
- `bun run test:vitest -- tests/vitest/admin/customScreensClient.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- A focused import-graph boundary test proving the lightweight client,
  shortcut/list client, admin prefetch helper, and list model entrypoints do not
  transitively import `customScreenSchemas`, `capabilities`, `bindingResolver`,
  or `widgets/runtime`.
- Relevant Custom Screens UI tests for list, editor, records, and shortcut nav
  imports.
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache ownership or
  client entry points are renamed.
- `_docs/ARCHITECTURE.md` if this creates a reusable "lightweight list client
  vs editor normalizer" rule.
- Parent task/changelog on closure.

## Acceptance Criteria

1. Custom Screens list/sidebar imports no longer pull widget runtime
   registration or full widget definitions.
2. Custom Screens editor/detail routes still normalize full definitions before
   rendering blocks and bindings.
3. Existing route payloads, cache keys, cache-bus events, and mutation behavior
   remain compatible.
4. `customScreensClient-*.js` is materially smaller or no longer present in the
   initial/static shell graph, with before/after evidence recorded.
5. The split does not introduce an additional uncoordinated list-cache owner for
   `cacheKeys.customScreensList`.
