# TASK-468-04-L03: Field Palette Binding Inspector And Missing Field States
# FileName: TASK-468-04-L03-Field-Palette-Binding-Inspector-And-Missing-Field-States.md

**Parent Subtask:** TASK-468-04
**Priority:** High
**Category:** Admin UI / Custom Screens / Field Bindings
**Estimated Effort:** Large
**Dependencies:** TASK-468-04-L02
**Status:** ⏳ To Do

---

## Overview

Add content-type-aware field palette and inspector flows for screen blocks.
Admins must be able to place fields onto the canvas, choose read/write binding
modes, configure presentation, and repair missing fields after content type
schema changes.

## Sub-Tasks

- [ ] Add `ScreenFieldPalette` with grouped field insertion actions.
- [ ] Add `ScreenInspector` controls for selected section/block/binding props.
- [ ] Add binding helpers that validate field name, mode, and prop path against
  the selected content type.
- [ ] Render missing/deleted field states without crashing the editor.
- [ ] Add tests for required fields, read-only fields, unknown fields, and field
  deletion repair.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/ScreenFieldPalette.tsx` | New content-type field palette. |
| `core/admin/ui/custom-screens/ScreenInspector.tsx` | New inspector for screen sections, blocks, and bindings. |
| `core/admin/ui/custom-screens/screenBindingEditorOps.ts` | New binding operation helpers. |
| `core/services/customScreens/screenDocument.ts` | Reuse binding validation helpers/types. |
| `tests/vitest/customScreens/screenBindingEditorOps.test.ts` | Binding operation coverage. |
| `tests/vitest/ui-integration/custom-screens/*FieldPalette*.test.tsx` | UI coverage for fields and missing-field states. |

## Implementation Pseudocode

```ts
export function createFieldBlockForContentField(
  field: ContentTypeFieldSummary,
  options: { mode: "read" | "write" }
): { block: ScreenBlockV1; binding: ScreenBlockBindingV1 } {
  return {
    block: createScreenBlock({
      type: "field",
      props: defaultFieldBlockProps(field),
    }),
    binding: createScreenBlockBinding({
      fieldName: field.name,
      mode: options.mode,
      propPath: "value",
    }),
  };
}

export function resolveBindingStatus(binding: ScreenBlockBindingV1, contentType: ContentTypeSummary) {
  const field = contentType.fields.find((candidate) => candidate.name === binding.fieldName);
  return field ? { status: "valid", field } : { status: "missing" };
}
```

Data flow:

- Content type schema feeds the palette and inspector.
- Palette creates a block plus binding pair.
- Inspector patches block props and binding mode through pure helpers.
- Missing-field resolver decorates bindings for UI rendering only.

Error handling:

- Unknown fields render a missing-field control with replace/remove actions.
- Read-only fields cannot be switched into write mode.
- Unsafe prop paths reject through the domain normalizer and editor helper.

Regression-test shape:

```tsx
test("deleted field shows repair state and blocks save as writable", async () => {
  render(<ScreenInspector fixture={screenWithDeletedRequiredField} />);
  expect(screen.getByText("Missing field")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** authenticated admin session through existing editor page.
- **RBAC:** `content:read` for content type metadata; `content:write` only when
  save is executed.
- **CSRF expectations:** unchanged until save route is called.
- **Rate-limit bucket:** existing admin read/write buckets.
- **Reject unknown validation:** binding helpers and server normalizer reject
  unknown fields, modes, unsafe prop paths, and extra keys.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** field metadata may be shown to admins; protected settings
  and raw entry values must not be copied into screen definitions.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens/screenBindingEditorOps.test.ts`
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`

## Acceptance Criteria

1. Field palette inserts field blocks with valid bindings.
2. Inspector edits section/block/binding props without schema drift.
3. Missing or invalid fields are visible, repairable, and cannot silently save
   as writable bindings.
