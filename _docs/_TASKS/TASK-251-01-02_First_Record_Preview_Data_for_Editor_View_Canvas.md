# TASK-251-01-02: First-Record Preview Data for Editor View Canvas
# FileName: TASK-251-01-02_First_Record_Preview_Data_for_Editor_View_Canvas.md

**Priority:** High
**Category:** Coderso Custom Screens + Preview Data + Admin Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-251-01
**Status:** To Do

---

## Overview

Replace the current schema-generated sample data with a real first-record
preview for the selected content type in `Editor View`.

This preview must power both:

- the live builder canvas in `CustomScreenEditorPage`,
- the `Editor View` preview dialog opened from the toolbar.

When no entry exists yet, the builder may fall back to synthetic data, but the
UI must make it clear that the preview is a fallback and not a real record.
Changing or clearing `contentTypeId` must immediately drop the previous preview
owner so the builder never shows a stale first record from another content
type.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- new `core/admin/ui/custom-screens/customScreenPreviewData.ts`
- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx`
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx` if preview meta/fallback
  messaging is rendered inside the preview frame
- `core/admin/services/entriesClient.ts` only if a dedicated helper is truly
  needed; prefer existing cache/list owners first
- `core/admin/services/cachePolicy.ts` and `@/utils/cacheBus` owners as
  reference seams only; reuse `cacheKeys.entriesList(typeSlug)` instead of
  creating a preview-only invalidation channel
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- existing `tests/vitest/ui/custom-screens-page.test.tsx` only as optional
  render smoke
- `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx` or a new
  mounted editor-page preview-owner suite
- new pure helper suite such as
  `tests/vitest/ui/custom-screen-preview-data.test.ts`

## Implementation Pseudocode

```ts
export type PreviewEntriesState = {
  typeSlug: string | null;
  items: EntrySummary[] | null;
};

export type CustomScreenPreviewRecordState = {
  source: "entry" | "fallback";
  entryId: string | null;
  data: Record<string, unknown>;
  note: string | null;
};

export function buildPreviewRecordStateFromEntry(
  contentType: ContentTypeSummary,
  entry: EntrySummary
): CustomScreenPreviewRecordState {
  return {
    source: "entry",
    entryId: entry.id,
    note: null,
    data: {
      title: entry.title,
      slug: entry.slug,
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      publishedAt: entry.publishedAt ?? null,
      ...entry.data,
    },
  };
}

export function buildFallbackPreviewRecordState(
  contentType: ContentTypeSummary | null
): CustomScreenPreviewRecordState {
  return {
    source: "fallback",
    entryId: null,
    note: contentType
      ? "No records exist for this content type yet. Preview is using schema fallback values."
      : "Select a content type to preview this screen.",
    data: buildSchemaFallbackPreviewData(contentType),
  };
}
```

```tsx
function CustomScreenPreviewRecordOwner({
  contentType,
  onPreviewRecordState,
}: {
  contentType: ContentTypeSummary | null;
  onPreviewRecordState: (state: CustomScreenPreviewRecordState) => void;
}) {
  const typeSlug = contentType?.slug ?? null;
  const [entries, setEntries] = useState<EntrySummary[] | null>(() =>
    typeSlug ? (getCachedEntries(typeSlug) ?? null) : null
  );
  const previewRecordState = useMemo(
    () => buildPreviewRecordState({ contentType, entries }),
    [contentType, entries]
  );

  useEffect(() => {
    onPreviewRecordState(previewRecordState);
  }, [onPreviewRecordState, previewRecordState]);

  useEffect(() => {
    if (!contentType || !typeSlug) return;

    let active = true;

    const refreshPreviewEntries = async (force: boolean) => {
      const nextItems = await listEntriesCached(typeSlug, { force });
      if (!active) return;
      setEntries(nextItems);
    };

    // Lazy state init already seeded current cached rows. The effect stays
    // async-only and revalidates through the shared entry-list contract.
    void refreshPreviewEntries(true);

    const unsubscribe = subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.entriesList(typeSlug)) return;
      void refreshPreviewEntries(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [contentType?.id, onPreviewRecordState, typeSlug]);

  return null;
}

const previewOwnerKey = selectedContentType?.slug ?? "no-content-type";
const [previewRecordState, setPreviewRecordState] = useState<CustomScreenPreviewRecordState>(() =>
  buildPreviewRecordState({
    contentType: selectedContentType,
    entries: selectedContentType ? getCachedEntries(selectedContentType.slug) : null,
  })
);

const editorPreviewBlocks = useMemo(
  () => applyBindingsToBlocks(blocks, bindings, previewRecordState.data) as Block[],
  [bindings, blocks, previewRecordState.data]
);
```

```tsx
<CustomScreenPreviewRecordOwner
  key={previewOwnerKey}
  contentType={selectedContentType}
  onPreviewRecordState={setPreviewRecordState}
/>

<PreviewRecordBridge>
  <EditorViewCanvas previewRecordState={previewRecordState} blocks={editorPreviewBlocks} />
</PreviewRecordBridge>
```

`CustomScreenPreviewRecordOwner` and `PreviewRecordBridge` are conceptual names.
The required behavior is:

- keyed ownership by `selectedContentType.slug`,
- lazy cache seed for the active type,
- async-only effect body after lazy seed,
- `force: true` background revalidation even when cache exists,
- immediate owner reset when the content type changes or clears.

If a background fetch fails, keep the last good preview state instead of
breaking the builder. The screen editor should not show a destructive error for
preview-only read failures. The preview ownership should mirror the
cached-first/background-refresh contract already used by
`CustomScreenEntriesPage.tsx`.

## Security Contract

- Visibility: internal admin UI and existing internal entry list read route
  only.
- Auth model: authenticated admin session.
- RBAC:
  - preview entry hydration continues to require `content:read`,
  - screen-definition writes remain `content:write`.
- CSRF: no new write path.
- Rate-limit bucket: existing admin read bucket for `GET /content/:type/entries`.
- Reject-unknown validation:
  - preview-state helpers must consume current `EntrySummary` and
    `ContentTypeSummary` owners,
  - no ad-hoc fallback data should be persisted back into the screen record.
- Anti-abuse: no public route or public preview token path is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- existing `tests/vitest/ui/custom-screens-page.test.tsx` may remain a
  render-only smoke, but the mounted owner should be
  `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx` or a new
  dedicated mounted suite such as
  `tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx`
- Add assertions for:
  - cached entry preview appearing without a blocking loader,
  - cached entry preview still triggering `force: true` background revalidation,
  - fallback copy when no entries exist,
  - a background refresh replacing fallback data with a real first record,
  - changing or clearing `contentTypeId` dropping the previous preview owner
    before the next async result resolves,
  - `cacheBus` updates for `cacheKeys.entriesList(typeSlug)` refreshing the
    preview entry after list mutations,
  - bound widgets rendering real first-record values on the builder canvas and
    in the preview dialog.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md` if record-backed builder preview becomes a
  source-of-truth behavior.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if preview-entry cache
  ownership is documented separately.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `Editor View` preview uses the first real record for the selected content
   type when one exists.
2. Builder canvas and preview dialog stay in sync on the same preview data.
3. Fallback mode is explicit and non-destructive when no record exists yet.
