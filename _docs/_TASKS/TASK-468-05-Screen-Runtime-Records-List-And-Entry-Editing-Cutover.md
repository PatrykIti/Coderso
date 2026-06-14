# TASK-468-05: Screen Runtime Records List And Entry Editing Cutover
# FileName: TASK-468-05-Screen-Runtime-Records-List-And-Entry-Editing-Cutover.md

**Parent Task:** TASK-468
**Priority:** High
**Category:** Custom Screens / Runtime / Entries
**Estimated Effort:** Very Large
**Dependencies:** TASK-468-04
**Status:** ⏳ To Do

---

## Overview

Render Custom Screen list and entry-editing experiences from
`ScreenDocumentV1`. This replaces the current widget render bridge with a
screen runtime that knows about content entry data, field metadata, readable
blocks, writable controls, and professional record layouts.

## Sub-Tasks

- [ ] TASK-468-05-L01: Screen Runtime Renderer.
- [ ] TASK-468-05-L02: Entry Field Controls And Draft Bridge.
- [ ] TASK-468-05-L03: Records List Presentation Modes.
- [ ] TASK-468-05-L04: Record Workspace Routing Cache And Active Context.
- [ ] TASK-468-05-L05: Runtime Entry Tests And Legacy Bridge Guard.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/CustomScreenPreview.tsx` | Render V4 through screen runtime, not `WidgetRenderer`. |
| `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx` | Replace widget bridge with field-aware screen blocks. |
| `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` | Render list/table/card views from V4 list presentation and content entries. |
| `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | Use V4 screen runtime for entry editing. |
| `core/admin/ui/custom-screens/screenRuntimeRenderer.tsx` | New renderer for screen sections and blocks. |
| Content entry route/service tests | Update only if write payload shape changes. |
| Custom Screen runtime/UI tests | Cover list, preview, edit, save, validation, and reload. |

## Implementation Pseudocode

```tsx
type ScreenRuntimeContext = {
  contentType: ContentTypeSummary;
  entry: ContentEntryRecord;
  mode: "preview" | "edit" | "list-item";
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onFieldChange?: (field: string, value: unknown) => void;
};

function ScreenRuntimeRenderer({ document, bindings, context }: ScreenRuntimeRendererProps) {
  return (
    <div data-screen-document-version={document.schemaVersion}>
      {document.sections.map((section) => (
        <ScreenSectionRuntime key={section.id} section={section}>
          {section.blocks.map((block) => (
            <ScreenBlockRuntime
              key={block.id}
              block={block}
              binding={findBindingForBlock(bindings, block.id)}
              context={context}
            />
          ))}
        </ScreenSectionRuntime>
      ))}
    </div>
  );
}
```

Writable field flow:

```ts
function resolveWritableControl(block: ScreenBlockV1, binding: ScreenBlockBinding, context: ScreenRuntimeContext) {
  if (binding.mode !== "write") return null;
  const field = context.contentType.fields.find((item) => item.name === binding.field);
  if (!field || field.readOnly) return { kind: "missing-or-readonly" };
  return {
    kind: "field-control",
    field,
    value: context.values[field.name],
    onChange: (next: unknown) => context.onFieldChange?.(field.name, next),
  };
}
```

Data flow:

- Screen runtime receives already-normalized V4 definitions.
- Entry data still persists through existing content entry services/routes.
- Field controls are derived from content type metadata and bindings, not from
  widget props.
- List rendering uses `listView` plus optional V4 item presentation.

Error handling:

- Missing fields render bounded missing-field UI.
- Read-only fields cannot produce write controls.
- Validation errors attach to the field block that owns the failed binding.
- Unsupported legacy placeholders render read-only and cannot write.

Regression-test shape:

```tsx
test("screen runtime edits an entry field through a bound field block", async () => {
  render(<CustomScreenEntryEditor fixture={screenV4WithTitleField} />);
  await user.clear(screen.getByLabelText("Title"));
  await user.type(screen.getByLabelText("Title"), "New title");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(entriesApi.lastPatch.values.title).toBe("New title");
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen and content
  entry routes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for list/read; `content:write` for entry mutation;
  preserve publish/delete-specific permissions.
- **CSRF expectations:** required for entry writes.
- **Rate-limit bucket:** existing admin read/write buckets.
- **Reject unknown validation:** entry writes continue through existing content
  entry schemas; screen runtime cannot bypass service validation.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** list and preview caches must not store protected settings,
  provider credentials, or privileged fields outside authorized admin context.

## Testing Requirements

- Custom Screen runtime UI tests for preview/list/edit/save.
- Content entry route/runtime tests if write behavior changes.
- DB-backed tests when `DATABASE_URL` is available.
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`
- `_docs/ARCHITECTURE.md`
- Parent task/changelog on family closure.

## Acceptance Criteria

1. V4 screen runtime renders records without `WidgetRenderer`.
2. Entry editing uses screen block bindings and content type metadata.
3. Record list and detail/editor views look coherent and remain data-driven.
4. Existing entry persistence and validation semantics remain intact.
