# TASK-248-03-03: Editor View Edit Mode Hydration, Save, and Dirty State
# FileName: TASK-248-03-03_Editor_View_Edit_Mode_Hydration_Save_and_Dirty_State.md

**Priority:** High
**Category:** Coderso Custom Screens + Entry Edit Flow
**Estimated Effort:** Medium
**Dependencies:** TASK-248-03-02
**Status:** To Do

---

## Overview

Make `/advanced/custom-screens/:screenId/entries/:entryId` render the screen's
`Editor View` in edit mode, hydrate typed entry values, and save updates without
destructively removing unrelated entry fields.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/admin/services/entriesClient.ts`
- `core/admin/services/cachePolicy.ts` if detail invalidation changes.
- `core/admin/ui/entries/EntryEditor.tsx` and `EntryEditorHeader.tsx` as
  reference patterns only.
- `core/services/customScreens/bindingResolver.ts`
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`
- `tests/vitest/customScreens/bindingResolver.test.ts`
- `tests/vitest/admin/entriesClient.test.ts`
- `tests/integration/routes/contentEntryRoutes.test.ts`

## Runtime Contract

- Edit mode hydrates from the existing entry detail.
- Field widgets read/write typed values from the draft.
- Save edit calls the existing update contract for the selected content type.
- Update payload preserves fields that are not owned by the current editor view.
- The save path must not rebuild `data` from all schema keys with empty
  fallback values. It must merge normalized edited fields into the original entry
  data so hidden, unsupported, or future fields survive a V2 editor save.
- Cache events do not overwrite dirty local drafts.
- Navigation away from dirty state is protected using existing editor patterns.

## Implementation Pseudocode

```ts
export function hydrateEditorViewDraft(input: {
  contentType: ContentTypeSummary;
  entry: EntryDetail;
  editorView: CustomScreenEditorViewDefinition;
}) {
  return {
    title: input.entry.title,
    slug: input.entry.slug,
    status: input.entry.status,
    data: hydrateSchemaData({
      schema: input.contentType.schema,
      existing: input.entry.data ?? {},
      fields: collectEditorViewWritableFields(input.editorView),
    }),
    editableFields: collectEditorViewWritableFields(input.editorView),
    originalData: input.entry.data ?? {},
    originalStatus: input.entry.status,
    publishAction: null,
    fieldErrors: {},
  };
}
```

```ts
function buildUpdatePayload(input: {
  draft: EntryDraft;
  originalData: Record<string, unknown>;
  editableFields: string[];
  contentType: ContentTypeSummary;
}) {
  const editedData = normalizeEditableDraftData(input.draft.data, {
    schema: input.contentType.schema,
    editableFields: input.editableFields,
  });

  return {
    title: normalizeText(input.draft.title),
    slug: normalizeText(input.draft.slug),
    data: {
      ...input.originalData,
      ...editedData,
    },
  };
}
```

```ts
async function saveEditorViewEdit(input: {
  contentType: ContentTypeSummary;
  entryId: string;
  draft: EntryDraft;
}) {
  const payload = buildUpdatePayload({
    draft: input.draft,
    originalData: input.draft.originalData,
    editableFields: input.draft.editableFields,
    contentType: input.contentType,
  });
  const updated = await updateEntry(input.contentType.slug, input.entryId, payload);
  return applyEditorViewStatusChange({
    typeSlug: input.contentType.slug,
    entryId: input.entryId,
    draft: input.draft,
    originalStatus: input.draft.originalStatus,
    fallbackEntry: updated,
  });
}
```

`applyEditorViewStatusChange` must use `updateEntryMetadata` for draft/archive or
scheduled status changes and `publishEntry` / `unpublishEntry` for explicit
publish controls. Status mutations remain separate from `updateEntry` data
payloads so unrelated entry data can still be preserved by merge.

## Security Contract

- Visibility: internal admin UI and existing internal content entry API.
- Auth model: authenticated admin session on the existing session-cookie admin
  API. No API-key auth path is introduced by this leaf.
- RBAC:
  - loading edit data requires `content:read`,
  - update requires `content:write`,
  - publish/unpublish controls require `content:publish` when exercised.
- CSRF: updates use the existing CSRF-backed `entriesClient`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation:
  - update payload emits only approved top-level keys,
  - dynamic fields stay under `data`,
  - editable fields are limited to selected content type schema fields and
    approved system fields,
  - non-editable `data` keys are preserved from the loaded entry but never
    become new editable controls unless the V2 definition and schema allow them,
  - route errors map to machine-readable responses.
- Anti-abuse: no public endpoint, nonce, HMAC, signature, or reCAPTCHA flow is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI:
  - edit mode hydrates title, slug, status, and schema data,
  - number, boolean, select, media, and relation fields retain typed values,
  - save updates only edited fields and preserves unrelated `data`,
  - status changes call `updateEntryMetadata`,
  - publish/unpublish controls call the existing publish routes only when
    `content:publish` is available,
  - hidden or unsupported existing `data` keys are not reset to empty fallback
    values after save,
  - cache refresh while dirty shows remote-update state instead of overwriting,
  - dirty navigation guard blocks accidental loss,
  - validation errors keep dirty state and render inline messages.
- Bun route tests:
  - valid update returns the updated entry,
  - invalid update returns a 400-level machine-readable error,
  - duplicate slug returns `entry_slug_conflict` as 409,
  - invalid media and relation updates keep the centralized machine-readable
    status/code mapping from TASK-248-01-02,
  - update for an entry outside the selected content type returns 404.

## Documentation Updates Required

- `_docs/CMS_API.md` for update validation/error semantics if changed.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if detail invalidation
  changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Existing entries open in `Editor View` edit mode.
2. Typed field values hydrate and save without string-only coercion.
3. Save preserves unrelated entry data.
4. Dirty-state and remote-refresh behavior follows existing editor patterns.
