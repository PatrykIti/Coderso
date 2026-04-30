# TASK-248-03-02: Editor View Create Mode Draft, Save, and Validation
# FileName: TASK-248-03-02_Editor_View_Create_Mode_Draft_Save_and_Validation.md

**Priority:** High
**Category:** Coderso Custom Screens + Entry Create Flow
**Estimated Effort:** Medium
**Dependencies:** TASK-248-03-01, TASK-248-01-02
**Status:** To Do

---

## Overview

Make `/advanced/custom-screens/:screenId/entries/new` open the screen's
`Editor View` in create mode and save a full normalized entry payload.

This leaf replaces the current generic `EntryCreateDrawer` path for V2 screens
because that drawer can submit `data: {}` and fail required custom schemas.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `core/admin/ui/custom-screens/routeParams.ts`
- `core/admin/services/entriesClient.ts`
- `core/admin/ui/entries/FieldRenderer.tsx`
- `core/admin/ui/content-types/schemaMapping.ts`
- `core/server/routes/contentEntryRoutes.ts` if TASK-248-01-02 has not already
  completed the mapper.
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`
- `tests/vitest/admin/entriesClient.test.ts`
- `tests/integration/routes/contentEntryRoutes.test.ts`

## Runtime Contract

- `/advanced/custom-screens/:screenId/entries/new` opens create mode.
- Initial draft is built from the selected content type schema.
- Required fields render inline validation before submit where possible.
- Save create calls `POST /admin/api/content/:type/entries` with normalized
  `title`, `slug`, status/default metadata where supported, and full `data`.
- Valid create invalidates the entries list and navigates according to the
  existing custom screen open-after-create preference.

## Implementation Pseudocode

```ts
export function buildInitialEntryDraft(contentType: ContentTypeSummary): EntryDraft {
  return {
    title: "",
    slug: "",
    status: "draft",
    data: buildSchemaDefaultData(contentType.schema),
    fieldErrors: {},
  };
}
```

```ts
export function applyEditorFieldChange(input: {
  draft: EntryDraft;
  field: string;
  value: unknown;
  contentType: ContentTypeSummary;
}) {
  const normalizedValue = normalizeEntryFieldValue({
    field: input.field,
    value: input.value,
    schema: input.contentType.schema,
  });

  return {
    ...input.draft,
    data: {
      ...input.draft.data,
      [input.field]: normalizedValue,
    },
    fieldErrors: omit(input.draft.fieldErrors, input.field),
  };
}
```

```ts
async function saveEditorViewCreate(input: {
  contentType: ContentTypeSummary;
  draft: EntryDraft;
}) {
  const payload = normalizeEntryPayloadForSchema({
    schema: input.contentType.schema,
    draft: input.draft,
  });

  return createEntry(input.contentType.slug, payload);
}
```

`CustomScreenEntriesPage` should route directly to `entries/new` when
`definition.listView.createMode === "editor-view"`. The legacy drawer remains
only for explicit compatibility mode.

## Security Contract

- Visibility: internal admin UI and existing internal content entry API.
- Auth model: authenticated admin session or existing admin API key model.
- RBAC: create requires `content:write`; loading screen/content type schema
  requires `content:read`.
- CSRF: create uses the existing CSRF-backed `entriesClient`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation:
  - draft normalization emits only approved entry payload keys,
  - dynamic fields stay under `data`,
  - route schemas reject unknown top-level payload keys,
  - validation errors map to machine-readable 400-level responses.
- Anti-abuse: no public endpoint, nonce, HMAC, signature, or reCAPTCHA flow is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI:
  - `New record` routes to `entries/new` for V2 editor-view create mode,
  - create mode initializes schema defaults,
  - required fields block submit with inline errors,
  - number, boolean, select, media, and relation field drafts preserve typed
    values,
  - valid House Projects create submits populated `data`, not `data: {}`,
  - save errors keep dirty draft state and render inline messages.
- Bun route tests:
  - valid create returns the created entry,
  - invalid required-schema create returns `entry_validation_failed` as 400,
  - response payloads do not expose stack traces.

## Documentation Updates Required

- `_docs/CMS_API.md` for entry validation error mapping if changed.
- `_docs/CONTENT_TYPES_SPEC.md` if schema default behavior is formalized.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. V2 `New record` opens `Editor View` create mode.
2. Required-field content types can create entries from Custom Screens.
3. Create submits normalized `data` for schema fields.
4. Validation failures are visible as 400-level admin errors, not 500s.
