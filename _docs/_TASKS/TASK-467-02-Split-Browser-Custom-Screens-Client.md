# TASK-467-02: Split Browser Custom Screens Client
# FileName: TASK-467-02-Split-Browser-Custom-Screens-Client.md

**Parent Task:** TASK-467
**Priority:** High
**Category:** Admin UI / Custom Screens / Bundle Performance / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-467-01
**Status:** ⏳ To Do

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

## Sub-Tasks

- [ ] Identify all imports of `customScreensClient.ts` and classify them as
  list/sidebar/cache, editor/detail, records workspace, or mutation-only.
- [ ] Create a lightweight Custom Screens DTO/cache client for list/sidebar and
  basic mutations.
- [ ] Move lightweight summary DTO validation into a pure domain contract module
  instead of duplicating schema ownership in the admin client.
- [ ] Reconcile the split with existing `customScreenShortcutsClient.ts` so the
  implementation reuses or renames that browser-safe list client instead of
  creating an overlapping third owner for the same cache key.
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
| `core/admin/services/customScreensClient.ts` | Either become the lightweight client or re-export from split modules without importing heavy editor-only code. |
| `core/admin/services/customScreenShortcutsClient.ts` | Reuse as the existing lightweight list/sidebar client or migrate it onto the shared summary contract and cache invalidation owner. Do not leave it as an uncoordinated duplicate cache owner. |
| `core/admin/services/customScreensEditorClient.ts` | New optional owner for full definition normalization and editor-detail helpers. |
| `core/admin/ui/custom-screens/CustomScreenListPage.tsx` | Import only lightweight list/mutation helpers. |
| `core/admin/ui/custom-screens/hooks/useCustomScreens.ts` | Import only lightweight list/cache helpers. |
| `core/admin/ui/custom-screens/customScreenListModel.ts` | Stop importing `resolveCustomScreenCapabilities`, `bindingResolver`, or runtime widget registration. Consume server summary capabilities or a lightweight primitive summary only. |
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | Import full editor/detail helpers. |
| `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` | Use lightweight or editor-detail helper according to actual data needs. |
| `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | Use editor-detail helper only if it needs normalized full definitions. |
| `tests/vitest/admin/customScreensClient.test.ts` | Split lightweight vs editor-normalized behavior coverage. |
| `tests/vitest/admin/adminBundleReport.test.ts` | Add or update assertions/evidence for reduced initial/static graph. |

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
- The implementation must choose one lightweight list owner:
  `customScreenShortcutsClient.ts` is extended/renamed into the primary
  lightweight client, or both shortcut and list clients share the same
  `customScreenSummaryContract` plus the TASK-467-01 cache invalidator registry.
  They must not drift as separate normalizers over the same
  `cacheKeys.customScreensList` storage key.
- `customScreenListModel.ts`, `CustomScreenListPage`, `useCustomScreens`, and
  shortcut/sidebar flows must not derive capabilities through
  `resolveCustomScreenCapabilities`; they consume only the primitive summary
  contract.
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

- `bun run test:vitest -- tests/vitest/admin/customScreensClient.test.ts`
- A focused import-boundary or source test proving the lightweight client does
  not import `customScreenSchemas`, `bindingResolver`, or `widgets/runtime`.
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
