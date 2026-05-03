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
- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx`
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx` if preview meta/fallback
  messaging is rendered inside the preview frame
- `core/admin/services/entriesClient.ts` only if a dedicated helper is truly
  needed; prefer existing cache/list owners first
- `tests/vitest/admin/entriesClient.test.ts` if a new preview/cache helper or
  cached list-owner path is introduced in `entriesClient.ts`
- `core/admin/ui/custom-screens/routeParams.ts` and
  `core/admin/utils/adminPrefetch.ts` if the broader
  `/advanced/custom-screens` prefetch entry must warm `entries:list:<typeSlug>`
  for cached-first preview paint
- `core/admin/services/cachePolicy.ts` and `@/utils/cacheBus` owners as
  reference seams only; reuse `cacheKeys.entriesList(typeSlug)` instead of
  creating a preview-only invalidation channel
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- existing `tests/vitest/ui/custom-screens-page.test.tsx` only as optional
  render smoke
- `tests/vitest/admin/adminPrefetch.test.ts` if the broader
  `/advanced/custom-screens` prefetch entry or workspace warmup branch changes
- `tests/vitest/ui/custom-screen-route-params.test.ts` if
  `resolveCustomScreenWorkspacePrefetchTarget()` changes the
  `/advanced/custom-screens/:screenId/entries...` matcher contract

## New Files to Create

- `core/admin/ui/custom-screens/customScreenPreviewData.ts`
- `tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx`
- `tests/vitest/ui/custom-screen-preview-data.test.ts`

## Implementation Pseudocode

```ts
export type PreviewEntriesState = {
  typeSlug: string | null;
  items: EntrySummary[] | null;
};

export type CustomScreenPreviewRecordState = {
  source: "entry" | "fallback";
  entryId: string | null;
  fallbackReason?: "no-content-type" | "no-records" | "read-failed";
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
  contentType: ContentTypeSummary | null,
  reason: "no-content-type" | "no-records" | "read-failed"
): CustomScreenPreviewRecordState {
  return {
    source: "fallback",
    entryId: null,
    fallbackReason: reason,
    note:
      reason === "no-content-type"
        ? "Select a content type to preview this screen."
        : reason === "read-failed"
          ? "Preview data could not be loaded. Showing schema fallback values until records can be read."
          : "No records exist for this content type yet. Preview is using schema fallback values.",
    data: buildSchemaFallbackPreviewData(contentType),
  };
}
```

```tsx
function CustomScreenPreviewRecordOwner({
  contentType,
  children,
}: {
  contentType: ContentTypeSummary | null;
  children: (state: CustomScreenPreviewRecordState) => ReactNode;
}) {
  const typeSlug = contentType?.slug ?? null;
  const [entries, setEntries] = useState<EntrySummary[] | null>(() =>
    typeSlug ? (getCachedEntries(typeSlug) ?? null) : null
  );
  const [readFailed, setReadFailed] = useState(false);
  const seededFromCacheRef = useRef(entries !== null);
  const hasResolvedEntriesRef = useRef(entries !== null);
  const previewRecordState = useMemo(
    () => buildPreviewRecordState({ contentType, entries, readFailed }),
    [contentType, entries, readFailed]
  );

  useEffect(() => {
    if (!contentType || !typeSlug) return;

    let active = true;

    const hydratePreviewEntries = async (force: boolean) => {
      try {
        const nextItems = await listEntriesCached(typeSlug, { force });
        if (!active) return;
        setEntries(nextItems);
        setReadFailed(false);
        hasResolvedEntriesRef.current = true;
      } catch {
        if (!active) return;
        // Cold-cache failures fall back to schema-driven preview data with an
        // explicit note. Background refresh failures keep the last good record
        // state instead of tearing the preview down.
        if (!hasResolvedEntriesRef.current) {
          setReadFailed(true);
        }
      }
    };

    // Lazy state init already seeded current cached rows. Keep the effect
    // async-only after mount so the preview owner stays aligned with the React
    // Hooks rules and the shared entry-list contract.
    if (!seededFromCacheRef.current) {
      void hydratePreviewEntries(false);
    }

    const unsubscribe = subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.entriesList(typeSlug)) return;
      void hydratePreviewEntries(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [contentType, typeSlug]);

  return children(previewRecordState);
}

const previewOwnerKey = selectedContentType?.slug ?? "no-content-type";
```

```tsx
<CustomScreenPreviewRecordOwner
  key={previewOwnerKey}
  contentType={selectedContentType}
>
  {(previewRecordState) => {
    const editorPreviewBlocks = applyBindingsToBlocks(
      blocks,
      bindings,
      previewRecordState.data
    ) as Block[];

    return (
      <>
        <EditorViewCanvas
          previewRecordState={previewRecordState}
          blocks={editorPreviewBlocks}
        />
        <CustomScreenWorkspacePreviewDialog
          previewRecordState={previewRecordState}
          blocks={blocks}
          bindings={bindings}
        />
      </>
    );
  }}
</CustomScreenPreviewRecordOwner>
```

`CustomScreenPreviewRecordOwner` is a conceptual name. The required behavior is:

- keyed ownership by `selectedContentType.slug`,
- lazy cache seed for the active type,
- async-only effect body after lazy seed,
- no preview-only forced mount refresh when warm cache already exists,
- `force: true` only on shared cache invalidation/revalidation paths such as
  `cacheBus` updates or an explicit refresh owner,
- cold-cache read failure resolves to explicit schema-fallback preview messaging
  instead of a destructive editor error,
- background refresh failure keeps the last good preview state,
- immediate owner reset when the content type changes or clears.

`CustomScreenPreviewRecordState` is part of the required seam, not an optional
view concern. The builder canvas and preview dialog need the same
`source`/`entryId`/`note` channel so fallback-vs-real messaging stays owned by
one preview contract instead of being inferred from raw `Record<string, unknown>`
data in multiple places.

If the first read for a selected content type fails and no cached rows exist,
fall back to schema preview data with a `read-failed` note instead of leaving
preview ownership undefined. If a background fetch fails, keep the last good
preview state instead of breaking the builder. The screen editor should not
show a destructive error for preview-only read failures. The preview ownership
should mirror the cached-first/background-refresh contract already used by
`CustomScreenEntriesPage.tsx`. If cached-first paint on direct builder-route
navigation is required, extend the existing prefetch owner for
`/advanced/custom-screens/:screenId` instead of inventing a preview-only cache
channel. The current owner seam still treats plain
`/advanced/custom-screens/:screenId` as outside
`resolveCustomScreenWorkspacePrefetchTarget()`, so any builder-route warmup
change must update that route contract explicitly instead of only touching the
`/entries...` matcher tests.

The same preview-record state must also own the explicit fallback/source note on
the mounted builder canvas, not only inside `CustomScreenPreview.tsx`. If the
dialog renders the note inside the preview frame, add the matching owner around
the `BlockList` surface in `CustomScreenEditorPage.tsx` so the live canvas and
the dialog remain on the same state contract.

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
- This leaf creates the mounted owner/helper suites below, then uses them as the
  canonical post-implementation proof for preview ownership and fallback-state
  behavior.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-preview-data.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts` if the broader `/advanced/custom-screens` prefetch entry or workspace warmup branch changes
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-route-params.test.ts` if `resolveCustomScreenWorkspacePrefetchTarget()` changes the `/advanced/custom-screens/:screenId/entries...` matcher contract or if direct `/advanced/custom-screens/:screenId` builder warmup is introduced in the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/entriesClient.test.ts` if a new preview/cache helper or cached list-owner path is introduced in `entriesClient.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenWidgets.test.tsx` if fallback/source messaging or bound render bridging moves into `CustomScreenPreview.tsx`
- existing `tests/vitest/ui/custom-screens-page.test.tsx` may remain a
  render-only smoke, but the mounted owner is
  `tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx`
- Add assertions for:
  - cached entry preview appearing without a blocking loader,
  - warm cached rows not triggering a preview-only forced mount refresh,
  - fallback copy when no entries exist,
  - cold-cache fetch failure yielding an explicit `read-failed` fallback note
    instead of a destructive error state,
  - a background refresh replacing fallback data with a real first record,
  - changing or clearing `contentTypeId` dropping the previous preview owner
    before the next async result resolves,
  - `cacheBus` updates for `cacheKeys.entriesList(typeSlug)` refreshing the
    preview entry after list mutations,
  - the explicit fallback/source note appearing on both the mounted builder
    canvas and the preview dialog from the same preview-record state,
  - shared invalidation/revalidation paths using `force: true` only after the
    cached-first owner is already established,
  - direct `/advanced/custom-screens/:screenId` navigation keeps cached-first
    preview behavior aligned with the prefetch contract when builder-route
    warmup is added,
  - bound widgets rendering real first-record values on the builder canvas and
    in the preview dialog.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` only when this slice
  changes builder-route warmup, entries-cache ownership, or any documented
  cache contract
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `Editor View` preview uses the first real record for the selected content
   type when one exists.
2. Builder canvas and preview dialog stay in sync on the same preview data.
3. Fallback mode is explicit and non-destructive when no record exists yet or
   when the first uncached read fails.
