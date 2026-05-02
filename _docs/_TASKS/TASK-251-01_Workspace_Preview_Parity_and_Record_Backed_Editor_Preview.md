# TASK-251-01: Workspace Preview Parity and Record-Backed Editor Preview
# FileName: TASK-251-01_Workspace_Preview_Parity_and_Record_Backed_Editor_Preview.md

**Priority:** High
**Category:** Coderso Custom Screens + Preview + Builder UX
**Estimated Effort:** Large
**Dependencies:** TASK-251
**Status:** To Do

---

## Overview

Align the Custom Screens workspace preview with the quality bar already set by
Pages while keeping the Custom Screens builder read-only and schema-bound.

This area owns two coupled problems:

- the preview dialog shell is too constrained for both `List View` and
  `Editor View`,
- the `Editor View` builder preview still uses synthetic schema samples instead
  of the first real record for the selected content type.

The builder canvas and the preview dialog must read from one shared preview
state so the same record-backed data drives both surfaces.

## Sub-Tasks

- [ ] TASK-251-01-01: Preview Dialog Shell Width and Device Framing Parity
- [ ] TASK-251-01-02: First-Record Preview Data for Editor View Canvas

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx`
- new `core/admin/ui/custom-screens/customScreenPreviewData.ts`
- `core/admin/services/cachePolicy.ts` and `@/utils/cacheBus` owners as
  reference seams only; reuse the existing entry-list cache keys and
  subscription flow instead of inventing preview-only cache channels
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx` if fallback/meta copy
  is surfaced inside the preview frame
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- existing `tests/vitest/ui/custom-screens-page.test.tsx` only as optional
  render smoke
- `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx` or a new
  mounted editor-page preview-owner suite
- new pure helper suite for preview-state shaping if the data logic is
  extracted

## Product Contract

1. `List View` preview remains desktop-oriented but uses a roomy modal shell
   instead of a narrow card-in-dialog treatment.
2. `Editor View` preview can still emulate desktop/tablet/mobile framing, but
   the outer dialog must not choke the inner device frame.
3. The builder canvas and the preview dialog must use the same preview-record
   state for the selected content type.
4. The preview should prefer the first cached/current record and clearly signal
   when it falls back because no records exist yet.
5. Changing or clearing `contentTypeId` in the builder must immediately drop the
   previous content type's preview ownership. The screen must never keep showing
   a stale first record from another type while the new preview state is
   resolving.

## Implementation Pseudocode

```ts
type PreviewRecordState = {
  source: "entry" | "fallback";
  entry: EntrySummary | null;
  data: Record<string, unknown>;
  note: string | null;
};

function CustomScreenPreviewRecordOwner({
  contentType,
  onPreviewRecordState,
}: {
  contentType: ContentTypeSummary | null;
  onPreviewRecordState: (state: PreviewRecordState) => void;
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
      const nextEntries = await listEntriesCached(typeSlug, { force });
      if (!active) return;
      setEntries(nextEntries);
    };

    // Lazy state init already seeded current cached rows. The effect stays
    // async-only: revalidate in the background when cache exists, fetch in the
    // foreground when it does not.
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
const [previewRecordState, setPreviewRecordState] = useState<PreviewRecordState>(() =>
  buildPreviewRecordState({
    contentType: selectedContentType,
    entries: selectedContentType ? getCachedEntries(selectedContentType.slug) : null,
  })
);
```

```tsx
<CustomScreenPreviewRecordOwner
  key={previewOwnerKey}
  contentType={selectedContentType}
  onPreviewRecordState={setPreviewRecordState}
/>

<PreviewRecordBridge>
  <CustomScreenWorkspacePreviewDialog
    mode={activeBuilderTab}
    previewRecordState={previewRecordState}
    listView={definition.listView}
    blocks={blocks}
    bindings={bindings}
  />
</PreviewRecordBridge>
```

`CustomScreenPreviewRecordOwner` and `PreviewRecordBridge` are conceptual names.
The required seam is:

- keyed owner by `selectedContentType.slug`,
- lazy cache seed for the active content type,
- async-only effect body after lazy seed,
- `force: true` background revalidation when cache exists,
- `force: true` foreground fetch when cache is absent,
- immediate fallback state when the content type is cleared.

Reference seam: mirror the cached-first plus background-refresh ownership style
already used by `CustomScreenEntriesPage.tsx` instead of inventing a one-off
preview fetch loop.

## Security Contract

- Visibility: internal admin UI and existing internal admin read routes only.
- Auth model: authenticated admin session on the existing session-cookie admin
  API.
- RBAC:
  - preview record hydration continues to require `content:read`,
  - screen saves remain `content:write`.
- CSRF:
  - this area adds no new write path,
  - existing screen writes remain CSRF-backed.
- Rate-limit bucket:
  - existing admin read bucket for `GET /content/:type/entries`.
- Reject-unknown validation:
  - preview shaping must reuse current `EntrySummary` / `ContentTypeSummary`
    contracts,
  - no ad-hoc preview payload schema may bypass current normalization.
- Anti-abuse:
  - no public read/write contract is introduced.

## Testing Requirements

- Run the focused suites required by TASK-251-01-01 and TASK-251-01-02.
- Existing `tests/vitest/ui/custom-screens-page.test.tsx` may remain as a
  render-only smoke test, but it is not the owner for mounted preview-state
  behavior.
- The mounted owner for `CustomScreenEditorPage` preview flow should be an
  editor-page integration suite, reusing
  `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx` or a new
  dedicated mounted suite such as
  `tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx`.
- Assert mounted behavior, not only static render:
  - cached-first preview state renders immediately when cached entries exist,
  - cached rows trigger a true `force: true` background revalidation,
  - background refresh can replace fallback preview with a real first record,
  - changing or clearing `contentTypeId` immediately drops the old type's
    preview owner before the next async result resolves,
  - `cacheBus` invalidation for `cacheKeys.entriesList(typeSlug)` refreshes the
    preview record after entry mutations elsewhere,
  - the same preview record is visible on the builder canvas and inside the
    preview dialog.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md` if preview-state behavior becomes canonical.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if preview-entry
  invalidation is documented explicitly.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Preview shell sizing no longer makes the Custom Screens preview feel smaller
   than the Pages reference.
2. `Editor View` preview reads from a real first record when possible.
3. Fallback preview behavior is explicit and does not masquerade as real entry
   content.
