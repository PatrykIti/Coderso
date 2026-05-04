# TASK-247: Media Always-On Selection and Upload Copy
# FileName: TASK-247_Media_Always_On_Selection_and_Upload_Copy.md

**Priority:** High
**Category:** CMS/Media + Admin UI + UX
**Estimated Effort:** Small
**Dependencies:** TASK-206
**Status:** Done (2026-04-30)

---

## Overview

Simplify the Media Library header and bulk-selection workflow.

The Media screen should no longer expose a separate `Select` mode toggle. Bulk
selection is now part of the default Media Library state: media cards/rows show
their selection checkboxes immediately, selected-count and bulk actions are
available without first entering a mode, and opening asset details still happens
through the existing card/row primary click target.

At the same time, shorten the header upload CTA from `Upload New` to `Upload`.
This is a copy-only change for the existing upload entry point; it must continue
to open the current `UploadDropzone` file dialog and preserve the existing
`media.openAfterUpload` preference behavior.

Keep this task scoped to these two requested UI changes. Do not expand into
media caching, storage, picker behavior, upload route behavior, delivery access,
or details drawer redesign.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/admin/ui/media/MediaLibraryPage.tsx`
  - remove the header `Select` button and the unused `CheckSquare` icon import;
  - remove `isSelectionMode` state instead of hiding the button while keeping
    dead state behind;
  - render the selection summary/bulk action bar by default;
  - keep `Select visible`, `Download`, `Delete`, and `Clear` behavior backed by
    the existing `selectedIds` state;
  - make `Clear` only clear `selectedIds` and action feedback;
  - pass `selectionMode` as always enabled to `MediaGrid`;
  - rename the upload header button from `Upload New` to `Upload`;
  - preserve `Media settings`, upload dialog opening, selected details drawer,
    cache hydration, and `media.openAfterUpload`.
- `core/admin/ui/media/MediaGrid.tsx`
  - no contract change expected; keep accepting `selectionMode` for shared
    `MediaLibraryPage` / `MediaPicker` reuse.
  - only touch this file if the implementation reveals that the prop default or
    naming must be clarified without breaking picker behavior.
- `core/admin/ui/media/MediaCard.tsx`
  - no contract change expected; existing checkbox rendering under
    `selectionMode` should be reused.
  - only touch this file if a focused test proves checkbox clicks leak into the
    details-opening click target.
- `tests/vitest/ui/media-library.test.tsx`
  - update copy assertions from `Upload New` to `Upload`;
  - assert clicking the header `Upload` CTA still calls the existing
    `UploadDropzone` hidden file-input/open path;
  - assert the header no longer contains a `Select` mode button;
  - add happy-dom coverage that cached media renders selection checkboxes
    without clicking a mode toggle;
  - assert `Select visible`, `Download`, `Delete`, and `Clear` are available in
    the default screen state;
  - assert the bulk action disabled/enabled states: `Download` and `Delete` are
    disabled at `0 selected`, become enabled after checkbox or `Select visible`
    selection, and return disabled after `Clear`.
- `tests/vitest/mediaUi/mediaLibrary.test.tsx`
  - add the SSR smoke assertion to expect `Upload` and not `Upload New`.
- `tests/vitest/ui/media-components.test.tsx`
  - add happy-dom interaction coverage for grid and list `MediaGrid` rendering:
    clicking the checkbox calls `onToggleSelect` only, while clicking the
    primary card/row target calls `onSelect` only.
- `_docs/MEDIA_SPEC.md`
  - update the Admin UI behavior bullets so multi-select is documented as
    always available on the visible asset range.
- `_docs/_TASKS/README.md`
  - keep the task board entry and statistics synchronized.
- `_docs/_CHANGELOG/README.md` and a new changelog entry
  - update only when this task is completed.

## Security Contract

- Visibility: internal admin Media Library UI only.
- Auth model: unchanged authenticated admin session / admin API key where
  supported by the shared admin stack.
- RBAC: unchanged; existing media read/write permissions still gate media list,
  upload, delete, replace, and settings actions through current routes.
- CSRF: unchanged; no new write route is added, and existing upload/delete/write
  calls keep the current admin client CSRF behavior.
- Rate-limit bucket: unchanged existing media/admin route buckets.
- Reject-unknown validation: unchanged; this task does not modify upload,
  metadata, delete, settings, or usage payload schemas.
- Anti-abuse:
  - no public write endpoint is introduced;
  - no nonce, signature/HMAC, or reCAPTCHA flow is applicable because the task
    does not add or expose public writes;
  - selected ids remain UI state and must not bypass existing route-level media
    permission checks.

## Implementation Pseudocode

Remove the mode state and mode toggle:

```tsx
import { Download, Settings2, Trash2, UploadCloud } from "lucide-react";

// remove:
// const [isSelectionMode, setIsSelectionMode] = useState(false);

const handleClearSelection = () => {
  setSelectedIds([]);
  setActionMessage(null);
};
```

Keep the header actions focused on settings and upload:

```tsx
<PageHeader
  title="Media Library"
  description="Manage your images and assets."
  actions={
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={handleOpenMediaSettings}>
        <Settings2 className="h-4 w-4" />
        Media settings
      </Button>
      <Button className="gap-2" onClick={() => dropzoneRef.current?.openFileDialog()}>
        <UploadCloud className="h-4 w-4" />
        Upload
      </Button>
    </div>
  }
/>
```

Render selection controls by default:

```tsx
<div className="flex flex-col gap-3 rounded-lg border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-sm text-muted-foreground">{selectedIds.length} selected</p>
  <div className="flex flex-wrap gap-2">
    <Button variant="outline" size="sm" onClick={handleSelectVisible}>
      Select visible
    </Button>
    <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={handleBulkDownload}>
      <Download className="h-4 w-4" />
      Download
    </Button>
    <Button variant="destructive" size="sm" disabled={selectedIds.length === 0} onClick={() => handleBulkDelete().catch(() => undefined)}>
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
    <Button variant="ghost" size="sm" onClick={handleClearSelection}>
      Clear
    </Button>
  </div>
</div>
```

Keep card/row selection always enabled while preserving details open on the
primary card/row click:

```tsx
<MediaGrid
  items={filteredItems}
  selectedId={selectedId}
  selectedIds={selectedIds}
  view={view}
  selectionMode
  onSelect={handleSelectItem}
  onToggleSelect={handleToggleSelect}
/>
```

Regression test shape:

```tsx
test("MediaLibraryPage keeps selection active without a Select toggle", async () => {
  writeMediaCache([mediaRecord({ title: "Cached hero" })]);
  const view = mountMediaLibrary();
  await flushEffects();

  expect(view.container.textContent).toContain("Upload");
  expect(view.container.textContent).not.toContain("Upload New");
  expect(
    Array.from(view.container.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "Select"
    )
  ).toBe(false);
  expect(view.container.textContent).toContain("0 selected");
  expect(view.container.textContent).toContain("Select visible");
  expect(view.container.querySelector('button[aria-label="Select Cached hero"]')).toBeTruthy();

  const downloadButton = getButton(view.container, "Download");
  const deleteButton = getButton(view.container, "Delete");
  expect(downloadButton).toBeDisabled();
  expect(deleteButton).toBeDisabled();

  await click(view.container.querySelector('button[aria-label="Select Cached hero"]'));
  expect(view.container.textContent).toContain("1 selected");
  expect(downloadButton).not.toBeDisabled();
  expect(deleteButton).not.toBeDisabled();

  await click(getButton(view.container, "Clear"));
  expect(view.container.textContent).toContain("0 selected");
  expect(downloadButton).toBeDisabled();
  expect(deleteButton).toBeDisabled();
});

test("MediaLibraryPage header Upload opens the existing dropzone file input", async () => {
  const view = mountMediaLibrary();
  await flushEffects();

  const fileInput = view.container.querySelector('input[type="file"]');
  const openSpy = vi.spyOn(fileInput as HTMLInputElement, "click");

  await click(getButton(view.container, "Upload"));
  expect(openSpy).toHaveBeenCalled();
});

test.each(["grid", "list"] as const)(
  "MediaGrid keeps checkbox and details targets separate in %s view",
  async (viewMode) => {
    const onSelect = vi.fn();
    const onToggleSelect = vi.fn();
    const view = mountMediaGrid({
      items: [mediaItem({ id: "media-1", title: "Cached hero" })],
      view: viewMode,
      selectionMode: true,
      onSelect,
      onToggleSelect,
    });

    await click(view.container.querySelector('button[aria-label="Select Cached hero"]'));
    expect(onToggleSelect).toHaveBeenCalledWith("media-1");
    expect(onSelect).not.toHaveBeenCalled();

    const primaryButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) =>
        button.getAttribute("aria-label") !== "Select Cached hero" &&
        button.textContent?.includes("Cached hero")
    );
    expect(primaryButton).toBeTruthy();

    await click(primaryButton!);
    expect(onSelect).toHaveBeenCalledWith("media-1");
  }
);
```

## Testing Requirements

- `tests/vitest/ui/media-components.test.tsx` must prove checkbox-vs-primary
  click separation in both grid and list view, matching acceptance criteria 5
  and 6.
- `tests/vitest/ui/media-library.test.tsx` must prove the renamed header
  `Upload` CTA still opens the existing `UploadDropzone` hidden file-input path,
  not a new upload route or duplicate browser file picker.
- `tests/vitest/ui/media-library.test.tsx` must prove default-state bulk action
  behavior, not just button presence: `Download` and `Delete` start disabled at
  `0 selected`, become enabled after checkbox or `Select visible`, and return
  disabled after `Clear`.
- `bun run test:vitest -- tests/vitest/ui/media-library.test.tsx tests/vitest/mediaUi/mediaLibrary.test.tsx tests/vitest/ui/media-components.test.tsx tests/vitest/ui/media-card.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

No Bun route/service suite is required unless implementation unexpectedly
changes media API route behavior. If route behavior changes, stop and split that
scope before continuing this task.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<next>-2026-04-30-task-247-media-always-on-selection-and-upload-copy.md`

## Acceptance Criteria

1. The Media Library no longer renders a header `Select` button.
2. Multi-select checkboxes are visible and usable in both grid and list view
   without entering a mode.
3. The selected-count and bulk action bar is available in the default screen
   state.
4. `Select visible`, `Download`, `Delete`, and `Clear` keep their existing
   behavior and disabled states.
5. Clicking the card/row primary target still opens the details drawer.
6. Clicking a checkbox toggles bulk selection without opening details.
7. The header upload CTA reads `Upload`, not `Upload New`.
8. The upload CTA still opens the existing file dialog through
   `UploadDropzone`.
9. No media API, storage, cache, picker, or delivery access contract changes.
10. Targeted Vitest suites, lint, typecheck, and diff hygiene pass.
