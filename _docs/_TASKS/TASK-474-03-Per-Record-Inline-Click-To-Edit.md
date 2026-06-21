# TASK-474-03: Per-Record Inline Click-To-Edit
# FileName: TASK-474-03-Per-Record-Inline-Click-To-Edit.md

**Parent Task:** TASK-474
**Priority:** High
**Category:** Admin UI / Custom Screens / Entry Editing
**Estimated Effort:** Large
**Dependencies:** TASK-474-01, TASK-474-02
**Status:** ⏳ To Do

---

## Overview

Make the per-record entry editor edit fields **inline on the canvas**: clicking a
bound text (record-header title/eyebrow/subtitle, or a writable field block) edits
that field in place and commits through the existing entry handlers. Retire the
detached top-right "Value" panel that currently owns all editing. Per-record
*presentation* persistence (image/text-size/style) stays with TASK-473; this
subtask persists only content field **values** through the existing entry draft
path.

## Current State (summary)

- `CustomScreenEntryCanvas.tsx:36` never passes `enableInlineFieldEditing`, so
  the renderer's inline path is wholesale disabled in entry mode.
- `ScreenRuntimeRenderer.tsx:192-208` reads `record-header` title/eyebrow/subtitle
  read-only and renders the title as a static `<h2>` (`:208`) — no inline path.
- Only `field` blocks have an inline branch (`:224-265`), gated behind the unset
  flag, and even then render an `<Input>` inside the card, not inline-on-text.
- Editing is forced through the detached `valuePanel` and the duplicated
  `renderSelectedBlockBindingEditor` in `CustomScreenEntryEditor.tsx`
  (≈`:459-549`, `:617-636`, `:758`).
- Commit handlers already exist: `handleTitleChange` / `handleSlugChange` /
  `handleFieldChange` (`CustomScreenEntryEditor.tsx` ≈`:402-437`).
- Writability source: `core/services/customScreens/bindingResolver.ts`
  (`collectWritableBindingFields`) and binding `mode` (`ScreenRuntimeRenderer.tsx:224`).

## Sub-Tasks

- [ ] Pass `enableInlineFieldEditing` from `CustomScreenEntryCanvas` into
  `ScreenRuntimeRenderer`.
- [ ] Wire `record-header` title/eyebrow/subtitle to `InlineEditWrapper`,
  committing through `onTitleChange` / field handlers; fail-closed when the
  bound field is read-only or unbound.
- [ ] Wire writable `field` blocks to inline edit on the displayed value (no card
  `<Input>`), still routing rich/relation/media types through `FieldRenderer`.
- [ ] Remove the detached `valuePanel`, or demote it to **read-only** inspection
  for read-mode/unbound bindings; delete `renderSelectedBlockBindingEditor`.
- [ ] Verify save still flows through `buildEditorViewUpdatePayload` /
  `customScreenEntryDraft`.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx` | Pass `enableInlineFieldEditing`. |
| `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` | Inline `record-header` + writable `field` via `InlineEditWrapper`; fail-closed. |
| `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | Remove/demote `valuePanel`; delete `renderSelectedBlockBindingEditor`; keep commit handlers. |
| `core/services/customScreens/bindingResolver.ts` | Reuse `collectWritableBindingFields` for the editable check (no contract change expected). |
| `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx` | Inline-edit + fail-closed coverage. |

## Implementation Pseudocode

```tsx
// CustomScreenEntryCanvas.tsx
<ScreenRuntimeRenderer mode="entry" enableInlineFieldEditing {...props} />

// ScreenRuntimeRenderer.tsx — record-header inline
const titleWritable = isWritable(bindings, block.id, "title") && fieldExists("title");
<InlineEditWrapper as="h2" ariaLabel="Title" value={title}
  editable={mode === "entry" && enableInlineFieldEditing && titleWritable}
  onCommit={(next) => onTitleChange?.(next)} />
// eyebrow/subtitle: same pattern bound to their fields (fail-closed otherwise)

// field block (text-like): edit the displayed value, not a card Input
canEditInline
  ? <InlineEditWrapper value={String(value ?? "")} editable
      onCommit={(next) => commitField(field, next)} />
  : <p>{stringifyValue(value)}</p>   // read-only/unbound -> no contentEditable
```

Data flow:

- Editable = entry mode AND `enableInlineFieldEditing` AND binding writable AND
  field exists on the content type.
- Inline commits call the existing `onTitleChange` / `onSlugChange` /
  `onFieldChange`, which already feed `customScreenEntryDraft` and
  `buildEditorViewUpdatePayload`.
- Non-text field types (relation/media/rich) keep `FieldRenderer` but triggered
  inline from the block, not the detached panel.

Error handling:

- Read-only or unbound bindings render no `contentEditable` (fail-closed).
- Field-level validation errors still attach to the owning block
  (`fieldErrors[binding.field]`).
- Removing the detached panel must not drop dirty-state; commits stay on the
  existing draft path.

Regression-test shape:

```tsx
test("clicking the record-header heading edits the title inline (no detached panel)", async () => {
  render(<CustomScreenEntryEditor fixture={screenV4WithWritableTitle} />);
  const heading = screen.getByRole("textbox", { name: "Title" });
  await user.clear(heading); await user.type(heading, "New title{Enter}");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(entriesApi.lastPatch.values.title).toBe("New title");
  expect(screen.queryByText(/Click a field on the canvas/i)).toBeNull();
});
test("read-only binding renders no contentEditable", () => {
  render(<CustomScreenEntryEditor fixture={screenV4WithReadOnlyField} />);
  expect(screen.queryByRole("textbox", { name: "Updated" })).toBeNull();
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin content-entry routes — no new
  endpoint.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` to load; `content:write` to persist field values.
  Inline edit must respect binding `mode` — `read` bindings expose no editable
  affordance (fail-closed).
- **CSRF expectations:** required for entry writes (unchanged path).
- **Rate-limit bucket:** existing admin write bucket.
- **Reject unknown validation:** entry writes continue through existing
  content-entry schemas; the renderer cannot bypass service validation.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** inline editing must not surface protected settings or
  privileged values; only content-type field values are editable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Live `playwright-cli` on entry `Dom Aurora 148`: heading edits inline, no
  detached Value panel.
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (per-record inline editing UX).

## Acceptance Criteria

1. Clicking the on-canvas record-header heading enters inline edit and commits to
   the title field; no modal/detached panel opens.
2. Writable field blocks edit inline on the displayed value; read-only/unbound
   bindings show no `contentEditable`.
3. The detached Value panel is removed or read-only; `renderSelectedBlockBindingEditor`
   is deleted; saving persists inline edits via the existing draft path.
4. vitest, lint, and types are green.
