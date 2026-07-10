# TASK-540-04-L03: Guard Entry Drafts and Subscribe Related Caches

# FileName: TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Custom Screens / Entry Editor / Data Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-540-03-L01, TASK-540-04-L02
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- compatibility-expectation updates required before this source gate in
  `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`,
  `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx`, and
  `tests/vitest/ui/custom-screen-entry-draft.test.ts`
- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`

This leaf is the only TASK-540 writer of the entry editor and entry-canvas forwarding
seam. It integrates the shared hook, dirty guard, cache-safe refresh, and
presentation-media UUID resolution in one pass.

## Grounded anchors

- Data/presentation dirty state: `CustomScreenEntryEditor.tsx:344-439`.
- Existing warning/debug context: `:441-483`.
- Cache subscriptions lacking targets: `:716-739`.
- Inline related-entry IIFE to remove: `:809-867`.
- Save/error flow: `:869-933`.
- Shared guard: `AdminDirtyNavigationGuard.tsx:17-105`.

## Implementation Pseudocode

```tsx
const related = useScreenRelatedEntries({
  document: runtimeDocument,
  bindings: runtimeBindings,
  values: canvasFieldValues,
  fields,
  enabled: true,
});

const presentationImageAssetIds = useMemo(
  () => collectDirectImagePresentationAssetIds(runtimeDocument, draftOverrides),
  [runtimeDocument, draftOverrides]
);
const presentationMediaRequestKey = `${entryId}\u0000${presentationImageAssetIds.join("\u0000")}`;
const presentationMediaGeneration = useRef(0);
const [loadedPresentationMedia, setLoadedPresentationMedia] = useState<{
  key: string;
  urlsById: Readonly<Record<string, string>>;
} | null>(null);

useEffect(() => {
  const generation = ++presentationMediaGeneration.current;
  let active = true;
  if (presentationImageAssetIds.length === 0) {
    // No synchronous setState in an effect. Render derivation below supplies empty.
    return () => { active = false; };
  }
  void listMediaCached({ force: false })
    .then((records) => {
      if (!active || presentationMediaGeneration.current !== generation) return;
      setLoadedPresentationMedia({
        key: presentationMediaRequestKey,
        urlsById: projectRequestedMediaUrls(records, presentationImageAssetIds),
      });
    })
    .catch(() => {
      if (!active || presentationMediaGeneration.current !== generation) return;
      exposeRetryablePresentationMediaError();
    });
  return () => { active = false; };
}, [presentationImageAssetIds, presentationMediaRequestKey]);

const presentationMediaUrlsById =
  loadedPresentationMedia?.key === presentationMediaRequestKey
    ? loadedPresentationMedia.urlsById
    : EMPTY_PRESENTATION_MEDIA_URLS;

// A visible Retry runs listMediaCached({force:true}) through the same generation/key
// guard. A cacheBus event for cacheKeys.mediaList does the same background refresh.
// CustomScreenEntryCanvas forwards presentationMediaUrlsById unchanged to the renderer.

const navigationBlocked = hasUnsavedChanges || hasUnsavedPresentationChanges;
const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
  blocked: navigationBlocked,
  title: "Discard unsaved entry changes?",
  description: "Content or presentation changes have not been saved.",
  confirmLabel: "Discard and continue",
  cancelLabel: "Keep editing",
  onConfirmDiscard: () => {
    setHasUnsavedChanges(false);
    clearUnsavedPresentationDraftWithoutPersisting();
  },
});

// Existing screen/current-entry/override cache handler stays. Related target
// entries are subscribed by the shared hook. All authoritative refresh calls
// retain keepUnsaved:true and background:true where supported.

return <>{existingEditor}{related.error && retryNotice}{presentationMediaRetryNotice}{dirtyNavigationDialog}</>;
```

`collectDirectImagePresentationAssetIds` traverses the normalized document, selects only
blocks with `type === "image"`, reads their UUID-valued `mediaAssetId`/legacy `image`
overrides, and sorts/dedupes them for a stable request key. Media-field override UUIDs are
not resolved here; they remain MediaPicker identities. `projectRequestedMediaUrls` copies only exact requested IDs and raw
`MediaRecord.url` strings; the renderer remains the final URL-policy owner. Entry/override
change, unmount, retry, and media-cache refresh each invalidate the prior generation.
Missing IDs remain absent so the winning override renders a placeholder rather than a
lower-precedence fallback.

Use the existing presentation reset/action rather than duplicating override
state logic. A cache event may refresh clean authoritative state, but while
either dirty flag is true it must not replace local values, title/slug, document,
bindings, or presentation overrides.

## Error/compatibility flow

- Save success clears only the dirty channel successfully persisted.
- Save failure keeps the guard active and leaves the user in the editor.
- Confirm discard clears local flags before blocker-skipping navigation; cancel
  does nothing.
- `beforeunload` is active for either dirty channel.
- Related load error is visible and retryable without disabling entry editing.
- Presentation-media resolution failure is visible/retryable; late results from a prior
  entry, override set, retry, or unmounted editor cannot update the active URL map.
- Existing cache debug/warning codes stay machine-readable.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- Dirty content, dirty presentation, both dirty, clean, cancel, confirm, save
  failure, and beforeunload in `custom-screen-record-interactions.test.tsx`.
- Related target cache event refresh, dirty no-clobber, retry, and unmount in an
  entry-editor integration suite.
- `custom-screen-entry-editor-restyle.test.tsx`: a direct-image presentation UUID resolves
  to the exact media URL and is forwarded through the canvas; media-field UUIDs do not
  trigger URL resolution; missing direct-image ID stays absent; first failure
  then forced retry succeeds; a deferred prior entry/override generation and post-unmount
  result are ignored; `cacheKeys.mediaList` refreshes the current generation only.
- `custom-screen-runtime-renderer.test.tsx`: host map values reach the direct-image final
  sanitizer; raw UUID, missing record, and unsafe URL never reach `src`; media FieldRenderer
  receives the original UUID and MediaPicker resolves that selected identity.

Update the three named suites before this source gate. TASK-540-06 may add aggregate
save→entry flows later but must not re-baseline dirty/cancellation/UUID behavior.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx \
  tests/vitest/ui/custom-screen-entry-draft.test.ts
```

Rerun a named failing file once in isolation.
