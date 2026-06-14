# TASK-468-04: Custom Screen Canvas Editor Cutover
# FileName: TASK-468-04-Custom-Screen-Canvas-Editor-Cutover.md

**Parent Task:** TASK-468
**Priority:** High
**Category:** Admin UI / Custom Screens / Canvas Editor
**Estimated Effort:** Very Large
**Dependencies:** TASK-468-03
**Status:** ⏳ To Do

---

## Overview

Replace the current Custom Screen editor builder with a screen-owned section and
block canvas. The editor must let admins design professional backend views for
custom content entries using field-aware blocks, layout sections, inspector
controls, layers, and preview states.

## Sub-Tasks

- [ ] TASK-468-04-L01: V4 Editor Client And Local Model.
- [ ] TASK-468-04-L02: Screen Canvas Shell And Section Block Operations.
- [ ] TASK-468-04-L03: Field Palette Binding Inspector And Missing Field States.
- [ ] TASK-468-04-L04: Save Dirty State Cache And Preview Flow.
- [ ] TASK-468-04-L05: Editor Cutover Tests And Legacy Builder Guard.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | Recompose around V4 screen document editing. |
| `core/admin/ui/custom-screens/EditorViewDesigner.tsx` | Replace legacy widget-block designer with screen document designer. |
| `core/admin/ui/custom-screens/ListViewDesigner.tsx` | Keep list configuration and prepare V4 list presentation controls. |
| `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx` | New screen adapter over neutral authoring primitives. |
| `core/admin/ui/custom-screens/ScreenInspector.tsx` | New section/block/binding inspector. |
| `core/admin/ui/custom-screens/ScreenFieldPalette.tsx` | New content-type field palette. |
| `core/admin/services/customScreensEditorClient.ts` | Read/write V4 definitions through the editor client. |
| Custom Screen editor UI tests | Cover V4 create, edit, add section, bind field, save, reload. |

## Implementation Pseudocode

```tsx
function CustomScreenEditorPage() {
  const { screen, contentType, save, isDirty } = useCustomScreenEditorModel();
  const document = screen.definition.editorView.document;

  return (
    <ScreenEditorShell dirty={isDirty}>
      <ScreenFieldPalette
        contentType={contentType}
        onInsertField={(field) => addFieldBlock(field)}
      />
      <ScreenAuthoringCanvas
        document={document}
        selection={selection}
        onSelect={setSelection}
        onMoveBlock={moveScreenBlock}
        onPatchBlock={patchScreenBlock}
        onPatchSection={patchScreenSection}
      />
      <ScreenInspector
        contentType={contentType}
        selection={selection}
        document={document}
        onPatchBinding={patchScreenBinding}
      />
    </ScreenEditorShell>
  );
}
```

State helpers:

```ts
function addFieldBlock(field: ContentTypeFieldSummary) {
  const block = createScreenFieldBlock({ field });
  updateDocument((document) => insertScreenBlock(document, selectedSectionId, block));
  updateBindings((bindings) => [
    ...bindings,
    createScreenFieldBinding({ blockId: block.id, field: field.name, mode: "write" }),
  ]);
}
```

Data flow:

- Editor loads V4 through the editor client.
- Content type schema drives available field blocks and binding modes.
- UI mutations update local V4 document state.
- Save sends the full V4 definition to existing internal admin routes.
- Cache invalidation follows TASK-467 lightweight/full-client ownership.

Error handling:

- If a content field is deleted, the canvas shows a bounded missing-field state
  and prevents write binding until repaired.
- Save conflicts preserve dirty local state and show reload/overwrite options
  following existing admin UX patterns.
- Invalid V4 payloads are surfaced as machine-readable domain errors mapped to
  user-safe admin messages.

Regression-test shape:

```tsx
test("adds a field block bound to the selected content type field", async () => {
  render(<CustomScreenEditorPage fixture={screenV4Fixture} />);
  await user.click(screen.getByRole("button", { name: "Title" }));
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(api.lastPatch.definition.editorView.document.sections[0].blocks[0].type).toBe("field");
  expect(api.lastPatch.definition.editorView.bindings[0].field).toBe("title");
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen routes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` to load editor metadata; `content:write` to save
  screen definitions.
- **CSRF expectations:** required for PATCH/POST/DELETE.
- **Rate-limit bucket:** existing admin write bucket for saves.
- **Reject unknown validation:** UI sends V4, server rejects unknown fields.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** field palette and preview must not expose protected
  settings or raw privileged entry values beyond the current admin session.

## Testing Requirements

- Focused Vitest/UI tests for screen editor create/edit/save/reload.
- Custom Screens client tests for V4 editor read/write.
- `bun run check:admin-boundary`
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- Parent task/changelog on family closure.

## Acceptance Criteria

1. Custom Screen editor no longer uses generic widget builder components.
2. Admins can add sections, add field blocks, bind fields, save, reload, and
   continue editing V4 screens.
3. Missing/invalid fields fail visibly and safely.
4. Existing list-view configuration remains available during the cutover.
