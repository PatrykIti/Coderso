# TASK-468-01: Contract Freeze Drift Audit And Migration Decision Record
# FileName: TASK-468-01-Contract-Freeze-Drift-Audit-And-Migration-Decision-Record.md

**Parent Task:** TASK-468
**Priority:** High
**Category:** Architecture / Custom Screens / Task Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-464, TASK-467
**Status:** 🚧 In Progress
**Started:** 2026-06-20

---

## Overview

Freeze the new Custom Screens contract before implementation. This task resolves
the known drift between docs, widget metadata, and runtime behavior, then records
the migration path from legacy widget blocks to a screen-owned document.

Known drift to resolve:

- `_docs/CMS_API.md` states only `screen-field-value.value` is write-capable.
- `_docs/WIDGETS.md` and widget metadata also describe write-capable
  `screen-record-header` bindings.
- Runtime entry editing currently swaps only `screen-field-value` into field
  controls.
- `_docs/_TASKS/_ROADMAP-open-tasks-2026-06-17.md` described TASK-468 as pure
  greenfield, but V3 code is live across schemas, services, routes, admin UI,
  widgets, assistant previews, and tests.
- TASK-468-05-L03 proposed card/compact list presentation modes; the accepted
  scope keeps the existing tabular records list unchanged.
- Earlier pseudocode duplicated `contentTypeId` inside `definition.dataContext`;
  the row `custom_screens.content_type_id` remains canonical.
- Entry detail editing persists to the selected entry's existing fields, not to
  the global screen definition.

## Sub-Tasks

- [ ] TASK-468-01-L01: Current State Inventory And Drift Freeze.
- [ ] TASK-468-01-L02: V4 Contract Decision Record And Validation Plan.

## Files To Change

| File | Required change |
|---|---|
| `_docs/CMS_SPEC.md` | State that Custom Screens are moving to screen-owned canvas docs, not Page v2 docs. |
| `_docs/PAGE_MODEL.md` | Keep Page v2 boundary explicit and reference TASK-468 for Screens migration. |
| `_docs/CMS_API.md` | Freeze V4 request/response shape, write-capable binding policy, and legacy rejection/migration notes. |
| `_docs/WIDGETS.md` | Mark screen widgets as legacy migration inputs, not the final authoring surface. |
| `_docs/ARCHITECTURE.md` | Add ownership and assistant active-surface contract for screen documents. |

## Implementation Pseudocode

```ts
export type CustomScreenDefinitionV4 = {
  schemaVersion: 4;
  listView: CustomScreenListViewDefinition;
  editorView: {
    document: ScreenDocumentV1;
    bindings: ScreenBlockBinding[];
    saveMode: "entry";
    interactionMode: "inline";
  };
};

export type ScreenDocumentV1 = {
  schemaVersion: 1;
  sections: ScreenSectionV1[];
};

export type ScreenSectionV1 = {
  id: string;
  type: "group" | "summary" | "details" | "actions" | "custom";
  label: string;
  layout: ScreenSectionLayoutV1;
  blocks: ScreenBlockV1[];
};

export type ScreenBlockV1 =
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

export type ScreenBlockBinding = {
  id: string;
  blockId: string;
  propPath: string;
  source: "entry";
  field: string;
  mode: "read" | "write" | "readwrite";
};
```

Decision record checklist:

- `CustomScreenDefinitionV4` is the Custom Screen definition envelope version.
- `ScreenDocumentV1` is the nested canvas document version; it can evolve
  independently from the Custom Screen definition envelope.
- `ScreenDocumentV1` is allowed in Custom Screens only.
- Page v2 `PageDocumentV2` remains Page/Page Template only.
- `custom_screens.content_type_id` remains canonical; definitions reject
  definition-owned `contentTypeId`.
- Existing records list/table configuration remains the active list contract in
  this family; card/compact modes are not accepted scope.
- Entry view mode is field-editing-only and must not expose section/block
  builder operations.
- Canonical element names are `ScreenSectionV1`, `ScreenBlockV1`, and
  `ScreenBlockBinding`.
- V4 uses screen block types such as `record-header`, `field`, `field-group`,
  `columns`, `rich-text`, `media-field`, `relation-field`, `status-badge`, and
  `actions`.
- Unsupported legacy widgets migrate to safe read-only placeholder blocks.
- Write controls derive from `ScreenBlockBinding` plus content type field
  metadata.

Error handling:

- Unknown definition/view/section/block/binding keys reject with
  `custom_screen_definition_invalid`.
- Unknown content fields reject unless the content type cannot be resolved, in
  which case the service must return a bounded invalid-state error instead of
  guessing.
- Prototype/path traversal keys in `propPath` reject.

Regression-test shape:

```ts
test("custom screen V4 rejects Page v2 document payloads", () => {
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

test("write-capable binding policy matches docs", () => {
  const contracts = resolveScreenBlockBindingContracts("field");
  expect(contracts).toContainEqual({ propPath: "value", modes: ["read", "write"] });
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** unchanged admin session.
- **RBAC:** unchanged `content:read` and `content:write` model.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** V4 contract must reject unknown payload fields.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** docs and audit reports must not include raw private entry
  payloads, tokens, cookies, provider keys, or storage credentials.

## Testing Requirements

- Read-only audit prompt must include current HEAD, dirty worktree, TASK-468
  files, source files, docs, and validation expectations.
- `git diff --check`

## Documentation Updates Required

- Same files listed in Files To Change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The V4 contract is specific enough for implementation tasks to proceed.
2. The header/field write-capability drift is resolved in docs and planned
   tests.
3. Page v2 and Screen document boundaries are explicit.
4. TASK-468-01-L01 and TASK-468-01-L02 are complete before implementation
   children start.
5. A fresh read-only drift pass reports no unresolved high/medium task-contract
   issues before implementation begins.
