# TASK-248-01: Custom Screen Definition V2 and Workspace Routing
# FileName: TASK-248-01_Custom_Screen_Definition_V2_and_Workspace_Routing.md

**Priority:** High
**Category:** Coderso Custom Screens + Domain Contract + Admin Routing
**Estimated Effort:** Large
**Dependencies:** TASK-248
**Status:** Done
**Completed:** 2026-05-01

---

## Overview

Introduce the persisted V2 Custom Screen definition that can own two builder
surfaces: `List View` and `Editor View`.

The current definition is `schemaVersion: 1` with one `blocks` array and one
`bindings` array. That model cannot cleanly express both an entries table and a
custom create/edit entry canvas. This task creates the definition, normalizer,
V1 migration/defaulting, client contract, and route helpers needed by the next
leaf tasks.

## Sub-Tasks

- [x] TASK-248-01-01: Definition Schema, Normalizer, and V1 Migration
- [x] TASK-248-01-02: Workspace Routes, Client Cache, and Entry Error Mapping

## Files to Change

- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/services/customScreens/capabilities.ts`
- `core/server/routes/customScreenRoutes.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `core/admin/services/customScreensClient.ts`
- `core/db/schema.ts`
- DB migration SQL for `custom_screens.definition`
- matching `meta/*_snapshot.json`
- `meta/_journal.json`
- `core/admin/services/cachePolicy.ts` if new workspace cache keys are needed.
- `core/admin/ui/custom-screens/routeParams.ts`
- `core/admin/ui/custom-screens/assistantSurface.ts`
- `tests/vitest/customScreens/customScreenService.test.ts`
- `tests/vitest/customScreens/capabilities.test.ts`
- `tests/vitest/admin/customScreensClient.test.ts`
- `tests/integration/routes/customScreensRoutes.test.ts`

## Definition Contract

Keep V1 readable. V2 is the new persisted target:

Ownership rule: `contentTypeId` stays on the Custom Screen record (`custom_screens`
row, service input, and route payload). It must not be duplicated inside
`CustomScreenDefinitionV2`. The normalizer may receive a resolved content type
as context for default `List View` generation and field validation, but persisted
definition JSON must reject a top-level `contentTypeId`.

```ts
type CustomScreenDefinitionVersion = 1 | 2;

type CustomScreenDefinitionV2 = {
  schemaVersion: 2;
  listView: CustomScreenListViewDefinition;
  editorView: CustomScreenEditorViewDefinition;
};

type CustomScreenListViewDefinition = {
  columns: CustomScreenListColumn[];
  filters: CustomScreenListFilter[];
  defaultSort?: {
    field: string;
    direction: "asc" | "desc";
  };
  rowClick: "editor-view" | "classic-editor";
  createMode: "editor-view" | "drawer";
  bulkActions: {
    delete: boolean;
    publish: boolean;
    unpublish: boolean;
  };
};

type CustomScreenEditorViewDefinition = {
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  saveMode: "entry";
};
```

`createMode: "drawer"` exists only as a compatibility escape hatch for V1-like
screens. New V2 workspaces should default to `editor-view`.

Persistence rule: V2 introduces `custom_screens.definition` as the source of
truth for the full `CustomScreenDefinitionV2`. Existing `schema_version`,
`blocks`, and `bindings` remain legacy compatibility columns. Service and client
records must expose `definition`; V2 callers must consume `screen.definition`
rather than rebuilding the definition from legacy fields.

## Implementation Pseudocode

```ts
export function normalizeCustomScreenDefinition(
  input: unknown,
  context?: { contentType?: ContentTypeSummary }
): CustomScreenDefinition {
  const version = normalizeCustomScreenSchemaVersion(input);
  if (version === 1) {
    return migrateV1DefinitionToV2(normalizeV1Definition(input), context);
  }
  return normalizeV2Definition(input, context);
}
```

```ts
function migrateV1DefinitionToV2(
  definition: CustomScreenDefinitionV1,
  context?: { contentType?: ContentTypeSummary }
): CustomScreenDefinitionV2 {
  return {
    schemaVersion: 2,
    listView: buildDefaultListViewDefinition(context?.contentType),
    editorView: {
      blocks: definition.blocks,
      bindings: definition.bindings,
      saveMode: "entry",
    },
  };
}
```

```ts
export function buildDefaultListViewDefinition(
  contentType?: ContentTypeSummary
): CustomScreenListViewDefinition {
  const fields = contentType ? fieldsFromSchema(contentType.schema) : [];
  const titleField = pickFirstField(fields, ["title", "name"]);
  const summaryField = pickFirstField(fields, ["summary", "description"]);
  const statusField = pickFirstField(fields, ["status", "projectStatus"]);

  return {
    columns: compact([
      titleField && columnFromField(titleField, { pinned: true }),
      summaryField && columnFromField(summaryField),
      statusField && columnFromField(statusField),
      systemColumn("updatedAt"),
    ]),
    filters: statusField ? [filterFromField(statusField)] : [],
    defaultSort: { field: "updatedAt", direction: "desc" },
    rowClick: "editor-view",
    createMode: "editor-view",
    bulkActions: {
      delete: true,
      publish: true,
      unpublish: true,
    },
  };
}
```

```ts
export function buildCustomScreenWorkspacePath(input: {
  screenId: string;
  entryId?: string | "new";
}) {
  const path = `/advanced/custom-screens/${encodeURIComponent(input.screenId)}/entries`;
  return input.entryId
    ? `${path}/${encodeURIComponent(input.entryId)}`
    : path;
}
```

Route modules should keep validating payloads and delegating business rules to
services. If `contentEntryRoutes.ts` still maps schema failures to 500, add the
shared `mapContentEntryError` coverage here because V2 create/edit depends on
clean validation semantics.

Admin UI links must consume shared route helpers through the existing router
helpers: pass `buildCustomScreenWorkspacePath(...)` into `AdminLink`,
`navigate(...)`, or `prefetch(...)` so `AdminRouterContext` can resolve the active
admin base path through `resolveAdminHref`. If a non-router call site needs an
absolute admin href, add a tiny wrapper that calls `resolveAdminHref(basePath,
buildCustomScreenWorkspacePath(input))`. Do not introduce hand-built alias
matching, an `adminPaths.*` object bypass, or a second Custom Screens route
convention.

## Security Contract

- Visibility: internal admin routes only.
- Auth model: authenticated admin session on the existing session-cookie admin
  API. No API-key auth path is introduced by this task.
- RBAC:
  - Custom Screen definition create/update requires the existing `content:write`
    permission used by current Custom Screens admin routes.
  - Loading content type schema for defaults requires `content:read`.
  - Entry create/update/delete remains owned by existing content entry routes
    and requires `content:write`.
- CSRF:
  - all Custom Screen and entry mutations keep the current CSRF-backed admin
    client flow.
- Rate-limit bucket:
  - existing `admin_write`.
- Reject-unknown validation:
  - V2 definition schemas must use `additionalProperties: false`,
  - nested `listView` and `editorView` objects must reject unknown fields,
  - unsafe binding paths such as `__proto__`, `prototype`, and `constructor`
    stay rejected.
- Anti-abuse:
  - no public endpoint,
  - no nonce/signature/HMAC/reCAPTCHA requirement.

## Testing Requirements

- Run the focused test suites required by TASK-248-01-01 and TASK-248-01-02.
- Vitest:
  - V1 definitions normalize into V2 without losing blocks or bindings,
  - service/client records expose `definition` for both V1-migrated and V2 rows,
  - V2 definitions reject unknown top-level and nested keys,
  - V2 definitions reject top-level `contentTypeId` inside the definition JSON,
  - default `List View` generation chooses sensible fields from the House
    Projects schema,
  - invalid list columns/filters are rejected with
    `custom_screen_definition_invalid`,
  - workspace path helpers encode screen and entry ids and route correctly through
    `AdminLink`/`navigate`/`prefetch`,
  - capabilities detect whether a screen has `List View` and `Editor View`.
- Bun route tests:
  - Custom Screen create/update accepts a valid V2 definition,
  - invalid V2 payloads map to a 400-level machine-readable error,
  - entry schema validation errors map to 400 and do not leak stack details.

## Documentation Updates Required

- `_docs/CMS_API.md` for V2 Custom Screen payload shape and any entry error
  mapping changes.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache keys or
  invalidation behavior change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. New and updated Custom Screens can persist `schemaVersion: 2` with
   `listView` and `editorView`.
2. Existing V1 screens load through a deterministic migration/defaulting path.
3. Workspace route helpers are shared by list, create, and edit flows.
4. Invalid V2 definitions fail strict schema validation with machine-readable
   admin errors.
