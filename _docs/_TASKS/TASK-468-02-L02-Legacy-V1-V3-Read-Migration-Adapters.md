# TASK-468-02-L02: Legacy V1-V3 Read Migration Adapters
# FileName: TASK-468-02-L02-Legacy-V1-V3-Read-Migration-Adapters.md

**Parent Subtask:** TASK-468-02
**Priority:** High
**Category:** Custom Screens / Migration
**Estimated Effort:** Large
**Dependencies:** TASK-468-02-L01
**Status:** ⏳ To Do

---

## Overview

Add deterministic read adapters from Custom Screen V1/V2/V3 definitions into
V4. This keeps old rows readable while preventing arbitrary legacy widget
runtime rendering in the new screen runtime.

## Sub-Tasks

- [ ] Map screen legacy widgets to V4 blocks.
- [ ] Convert widget bindings to `ScreenBlockBinding`.
- [ ] Convert unsupported legacy widgets to placeholders.
- [ ] Preserve list-view configuration.
- [ ] Add migration tests for every legacy version.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/screenDocument.ts` | Add migration helpers or export helper types. |
| `core/services/customScreens/customScreenSchemas.ts` | Route V1/V2/V3 reads through V4 adapter. |
| `tests/vitest/customScreens/customScreenLegacyMigration.test.ts` | Cover legacy read migrations. |

## Implementation Pseudocode

```ts
export function migrateLegacyCustomScreenDefinitionToV4(
  input: LegacyCustomScreenDefinitionInput,
  context: CustomScreenDefinitionContext
): CustomScreenDefinitionV4 {
  const legacy = normalizeLegacyDefinitionForRead(input, context);
  return {
    schemaVersion: 4,
    dataContext: resolveScreenDataContext(context),
    listView: migrateLegacyListViewToV4(legacy.listView),
    editorView: {
      document: {
        schemaVersion: 1,
        sections: migrateLegacyBlocksToScreenSections(legacy.editorView.blocks, context),
      },
      bindings: migrateLegacyBindingsToScreenBindings(legacy.editorView.bindings),
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
}
```

Data flow:

- `screen-record-header` becomes `record-header`.
- `screen-field-value` becomes `field`.
- `screen-field-group` becomes `field-group`.
- `screen-two-column` becomes `columns`.
- Any other widget becomes `legacy-placeholder`.

Error handling:

- Invalid legacy block arrays still throw `custom_screen_definition_invalid`.
- Unsupported legacy widgets never render through `WidgetRenderer`.
- Broken bindings are dropped only when paired with a placeholder and recorded
  as migration diagnostics.

Regression-test shape:

```ts
test("migrates V3 screen field widgets to V4 field blocks", () => {
  const definition = migrateLegacyCustomScreenDefinitionToV4(v3Fixture, { contentType });
  expect(findBlock(definition.editorView.document, "field")).toBeTruthy();
});

test("unsupported legacy widgets migrate to safe placeholders", () => {
  const definition = migrateLegacyCustomScreenDefinitionToV4(unknownWidgetFixture, ctx);
  expect(findBlock(definition.editorView.document, "legacy-placeholder")).toBeTruthy();
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** legacy inputs still normalize through existing
  validators before migration.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** migration diagnostics must not log raw private entry data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens/customScreenLegacyMigration.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`

## Acceptance Criteria

1. V1/V2/V3 rows read as V4.
2. Supported legacy screen widgets map deterministically.
3. Unsupported widgets become read-only placeholders.
4. Migration tests cover V1, V2, V3, and unsupported widgets.
