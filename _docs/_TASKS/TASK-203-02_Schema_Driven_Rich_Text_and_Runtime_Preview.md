# TASK-203-02: Schema-Driven Rich Text and Runtime Preview
# FileName: TASK-203-02_Schema_Driven_Rich_Text_and_Runtime_Preview.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + Runtime Preview
**Estimated Effort:** Large
**Dependencies:** TASK-203, TASK-048, TASK-059, TASK-203-01
**Status:** To Do

---

## Overview

Repair the schema-driven authoring and preview confidence gaps:

- `BUG-2`: `FieldRenderer.tsx:212-226` renders `richtext` as textarea.
- `UX-4`: Entries preview needs shared-runtime parity and 404 recovery evidence.

The current preview owner is already present:

- `EntryEditor.tsx:321-344` creates preview URLs,
- `EntryEditor.tsx:641-650` renders `Runtime preview`,
- `EntryEditor.tsx:920-931` renders `RuntimePreviewDialog`,
- `contentEntryRoutes.ts:220-242` creates content preview tokens/URLs,
- `publicSite.tsx:841-883` consumes preview tokens and renders content
  preview HTML.

## Sub-Tasks

- `TASK-203-02-01_Rich_Text_Field_Renderer_Contract_and_Editor_Surface.md`
- `TASK-203-02-02_Entry_Runtime_Preview_Parity_and_404_Recovery.md`

## Scope

- Render Engine `richtext` fields through a real editing surface.
- Preserve legacy string values and current schema validation.
- Keep rich text field logic Bun-free.
- Align Entries preview label/copy/failure handling with shared preview UX.
- Fix or explicitly follow up the captured content preview 404 with runtime
  evidence from `publicSite`, not only dialog/client tests.

Out of scope:

- moving Entries to Posts storage/routes,
- replacing all field controls,
- adding public write routes,
- changing public content route semantics without route/runtime proof.

## Files to Change

- `core/admin/ui/entries/FieldRenderer.tsx:164-226`
- `core/admin/ui/entries/EntryEditor.tsx:321-344`
- `core/admin/ui/entries/EntryEditor.tsx:641-650`
- `core/admin/ui/entries/EntryEditor.tsx:920-931`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` for
  reference/reuse only
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` for
  reference/reuse only
- `core/services/posts/editor/postRichTextSerializer.ts` for serializer reuse
  or parity
- `core/services/posts/editor/postRichTextSanitizer.ts` for sanitizer reuse or
  parity
- `core/admin/ui/preview/RuntimePreviewDialog.tsx`
- `core/server/routes/contentEntryRoutes.ts:220-242`
- `core/server/utils/previewUrls.ts`
- `core/server/publicSite.tsx:841-883`
- `core/services/content/entryService.ts:814-820`
- `tests/vitest/ui/entry-field-relation.test.tsx`
- `tests/vitest/ui/content-entry-editor.test.tsx`
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
- `tests/vitest/server/previewUrls.test.ts`
- `tests/unit/site/publicEntryRenderer.test.tsx`

## Security Contract

- Visibility: internal admin editor plus existing public read-only token
  preview runtime.
- Auth model: preview token creation is authenticated; preview consumption is
  token-gated.
- RBAC: `content:read` for preview token creation, `content:write` for saving.
- CSRF: preview token creation and saves remain CSRF-protected.
- Rate-limit buckets: `admin_read`, `admin_write`, `public_read`.
- Reject-unknown validation: rich text serialization must satisfy content
  schema validation.
- Anti-abuse: preview tokens are never shown in UI errors; rich text rendering
  must stay sanitized/runtime-safe.

## Testing Requirements

- Vitest:
  - rich text field is not textarea-only,
  - legacy string value round-trips,
  - preview button/dialog/failure copy is token-safe.
- Bun:
  - content preview token route still works,
  - public content preview resolves valid entries through `handlePublicRequest`
    or the 404 gets a precise follow-up owner,
  - proof should create a real entry preview token and request
    `/preview?type=content&token=...`; `publicEntryRenderer` output alone does
    not close the runtime 404 from the report.

## Documentation Updates Required

- `_docs/CONTENT_FIELDS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_SPEC.md`
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Engine rich text fields expose real editing affordances.
2. Existing rich text data remains readable/saveable.
3. Entries runtime preview uses shared token-safe failure handling.
4. The report's content preview 404 is fixed with `publicSite` runtime evidence
   or captured in a linked follow-up with exact owner and reproduction.
