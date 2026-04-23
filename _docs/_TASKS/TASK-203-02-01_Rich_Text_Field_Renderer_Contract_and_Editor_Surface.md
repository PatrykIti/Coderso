# TASK-203-02-01: Rich Text Field Renderer Contract and Editor Surface
# FileName: TASK-203-02-01_Rich_Text_Field_Renderer_Contract_and_Editor_Surface.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + Content Fields
**Estimated Effort:** Large
**Dependencies:** TASK-203-02
**Status:** To Do

---

## Overview

Replace the textarea-only `richtext` branch with a real editing surface while
preserving the Entries field contract.

Ownership:

- `FieldRenderer` owns choosing the control for Engine field types.
- an Entries/content-field module owns `normalizeEntryRichTextValue()` and
  `serializeEntryRichTextValue()` if new helpers are needed.
- existing Posts rich text adapter, toolbar, serializer, and sanitizer may be
  reused only when that removes duplication without importing Posts storage,
  route, runtime shell, or DB/settings behavior into the Entries field layer.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/FieldRenderer.tsx:186-226`
- `core/admin/ui/entries/EntryEditor.tsx:820-827`
- `core/admin/ui/content-types/schemaMapping.ts`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` for
  reusable, Bun-free editor behavior if it fits
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` for shared
  command UI if it fits
- `core/services/posts/editor/postRichTextSerializer.ts` for string/HTML
  normalization parity if reused
- `core/services/posts/editor/postRichTextSanitizer.ts` for sanitizer parity if
  reused
- `tests/vitest/ui/entry-field-relation.test.tsx` for existing field-renderer
  regression coverage
- `tests/vitest/ui/content-entry-editor.test.tsx`
- optional dedicated `tests/vitest/ui/entry-richtext-field.test.tsx` only if
  rich text assertions would make the existing owner suite too broad

## Implementation Sketch

```ts
case "richtext":
  return (
    <EntryRichTextField
      value={normalizeEntryRichTextValue(value)}
      onChange={(next) => onChange(serializeEntryRichTextValue(next))}
    />
  );
```

Direction:

- keep normalizers in an Entries/content-field owner,
- do not create a second rich text grammar, sanitizer, or toolbar command model
  when the current Posts rich text contracts can be reused safely,
- prefer extending the current `FieldRenderer`/Entries field owner seams before
  adding a new component or helper; add a new owner only when the current module
  cannot keep the contract readable without import-time coupling,
- if the owner boundary between Entries field logic and reusable Posts rich text
  pieces is unclear, document the responsibility decision in this leaf before
  changing code,
- support legacy strings,
- do not import `db/client`, server routes, settings services, or Posts runtime
  renderers at module import time.

## Security Contract

- Visibility: internal admin field editor only.
- Auth/RBAC/CSRF: inherited from existing entry update route.
- Rate-limit bucket: `admin_write` for saves.
- Reject-unknown validation: serialized value must match the content schema.
- Anti-abuse: no script execution, no secret logging, no weakened public
  render sanitization.

## Testing Requirements

- rich text field does not render as textarea-only,
- legacy string value displays and emits safely,
- structured editor changes call `onChange` with expected serialized value,
- rich text coverage must live in either `tests/vitest/ui/entry-field-relation.test.tsx`
  or `tests/vitest/ui/entry-richtext-field.test.tsx`; whichever file contains
  the assertions must be listed in the TASK-203 final validation command,
- reused Posts rich text pieces keep their existing owner tests green when
  touched,
- text/number/boolean/select/media/relation branches remain stable.

## Documentation Updates Required

- `_docs/CONTENT_FIELDS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Engine `richtext` fields expose formatting/editing affordances.
2. Existing string-backed rich text entries remain compatible.
3. `FieldRenderer` remains Bun-free and Vitest-owned.
