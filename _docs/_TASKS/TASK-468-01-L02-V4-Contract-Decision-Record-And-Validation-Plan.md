# TASK-468-01-L02: V4 Contract Decision Record And Validation Plan
# FileName: TASK-468-01-L02-V4-Contract-Decision-Record-And-Validation-Plan.md

**Parent Subtask:** TASK-468-01
**Priority:** High
**Category:** Custom Screens / Contract / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-468-01-L01
**Status:** ⏳ To Do

---

## Overview

Freeze the executable V4 contract for Custom Screens. This leaf fixes the
current ambiguity around `dataContext`, `CustomScreenListViewDefinitionV4`,
section layout, block props, ids, limits, and binding modes.
After this leaf closes, `core/services/customScreens/screenDocument.ts` becomes
the implementation owner for these types; parent-task snippets are overview
context only.

## Sub-Tasks

- [ ] Freeze canonical type names and versioning rationale.
- [ ] Define `CustomScreenListViewDefinitionV4`.
- [ ] Define `ScreenSectionLayoutV1`, `ScreenBlockPropsByType`, ids, limits,
  and binding rules.
- [ ] Define strict rejection cases for Page v2 payloads and legacy writes.
- [ ] Record validation lanes for every later leaf.

## Files To Change

| File | Required change |
|---|---|
| `_docs/CMS_API.md` | Add V4 request/response contract. |
| `_docs/CMS_SPEC.md` | Add product-level V4 Screens contract. |
| `_docs/PAGE_MODEL.md` | State Screens use `ScreenDocumentV1`, not Page v2. |
| `_docs/ARCHITECTURE.md` | Add V4 ownership and boundary rule. |
| `_docs/WIDGETS.md` | Mark screen widgets legacy-only after migration. |

## Implementation Pseudocode

```ts
export const SCREEN_DOCUMENT_SCHEMA_VERSION = 1;
export const CUSTOM_SCREEN_DEFINITION_SCHEMA_VERSION = 4;

type CustomScreenDefinitionV4 = {
  schemaVersion: 4;
  dataContext: {
    source: "content-entry";
    contentTypeId: string;
    entryAlias: "entry";
  };
  listView: CustomScreenListViewDefinitionV4;
  editorView: {
    document: ScreenDocumentV1;
    bindings: ScreenBlockBinding[];
    saveMode: "entry";
    interactionMode: "inline";
  };
};

type CustomScreenListViewDefinitionV4 = {
  schemaVersion: 1;
  presentation: "table" | "cards" | "compact";
  fields: Array<{
    fieldName: string;
    label?: string;
    sortable?: boolean;
    width?: string;
  }>;
  defaultSort?: { fieldName: string; direction: "asc" | "desc" };
};

type ScreenSectionLayoutV1 = {
  columns: 1 | 2 | 3;
  gap: "compact" | "normal" | "relaxed";
  density: "comfortable" | "compact";
  alignment: "start" | "center" | "stretch";
};

type ScreenBlockV1 =
  | { id: string; type: "record-header"; props: ScreenRecordHeaderBlockProps }
  | { id: string; type: "field"; props: ScreenFieldBlockProps }
  | { id: string; type: "field-group"; props: ScreenFieldGroupBlockProps }
  | { id: string; type: "columns"; props: ScreenColumnsBlockProps }
  | { id: string; type: "rich-text"; props: ScreenRichTextBlockProps }
  | { id: string; type: "media-field"; props: ScreenMediaFieldBlockProps }
  | { id: string; type: "relation-field"; props: ScreenRelationFieldBlockProps }
  | { id: string; type: "status-badge"; props: ScreenStatusBadgeBlockProps }
  | { id: string; type: "actions"; props: ScreenActionsBlockProps }
  | { id: string; type: "legacy-placeholder"; props: ScreenLegacyPlaceholderProps };
```

Data flow:

- `custom_screens.contentTypeId` remains the relational owner.
- `definition.dataContext.contentTypeId` mirrors the row content type for
  validation and assistant context.
- `ScreenDocumentV1.schemaVersion` evolves independently from
  `CustomScreenDefinitionV4.schemaVersion`.

Error handling:

- Page v2 `{ schemaVersion: 2, sections: [] }` rejects as
  `custom_screen_definition_invalid`.
- Unknown section/block/binding keys reject.
- Unknown content fields reject when the content type is resolvable.
- `__proto__`, `prototype`, and `constructor` path segments reject.

Regression-test shape:

```ts
test("V4 contract rejects Page v2 documents", () => {
  expect(() => normalizeCustomScreenDefinition({
    schemaVersion: 4,
    dataContext: { source: "content-entry", contentTypeId: "products", entryAlias: "entry" },
    listView: defaultScreenListView(),
    editorView: {
      document: { schemaVersion: 2, sections: [] },
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    },
  })).toThrow("custom_screen_definition_invalid");
});

test("V4 data context content type mirrors row content type", () => {
  const definition = normalizeCustomScreenDefinition(v4Fixture, { contentType });
  expect(definition.dataContext.contentTypeId).toBe(contentType.id);
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** strict V4 decision record is mandatory.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** contract examples must not include real private records
  or secrets.

## Testing Requirements

- `git diff --check`
- Fresh read-only drift pass on TASK-468 after this contract changes.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`
- `_docs/PAGE_MODEL.md`
- `_docs/ARCHITECTURE.md`
- `_docs/WIDGETS.md`

## Acceptance Criteria

1. V4 contract uses `contentTypeId: string`, not a placeholder literal.
2. `CustomScreenListViewDefinitionV4` and `ScreenSectionLayoutV1` are defined.
3. Section/block/binding ids, block types, limits, and rejection rules are
   explicit.
4. Later implementation leaves can import the contract without reinterpretation.
