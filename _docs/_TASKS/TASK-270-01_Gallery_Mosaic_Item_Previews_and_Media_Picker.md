# TASK-270-01: Gallery Mosaic Item Previews and Media Picker

# FileName: TASK-270-01_Gallery_Mosaic_Item_Previews_and_Media_Picker.md

**Priority:** High
**Category:** Widgets + Gallery Mosaic + Admin UI + Media
**Estimated Effort:** Large
**Dependencies:** TASK-256-06-02, TASK-270
**Status:** To Do

---

## Overview

Improve Gallery Mosaic item authoring in the Visual editor by adding per-item
thumbnail previews and a media-library picker for each item.

This leaf does not own the shared safe-media output, image/video ambiguity, or
Wizard video-picker repairs. Those remain TASK-256-06-02. This leaf starts only
after that contract lands and uses its final media-field semantics.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:146` - Visual editor lacks
  per-item MediaPicker and forces manual URL entry.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:295-296` - UX-02 reports no
  thumbnail preview for edited items.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:304-305` - UX-05 confirms
  no per-item media picker.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:320,325,367,369` - BF-02
  and BF-07 require media picker and thumbnail preview.
- `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md:5,10` - research keeps media
  items with explicit labels and rejects missing image alt text. Alt ownership
  remains TASK-256-06-02; this leaf uses the final TASK-256 media/accessibility
  contract but does not implement alt fields.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add a per-item media preview component, import/reuse `MediaPicker`, track editor-local selected media ids by stable `item.id` with a normalized-id fallback for newly created items, resolve media through `listMediaCached({ force: false })`, and persist only schema-owned runtime fields into `items[]`. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Extend existing media-client and MediaPicker mocks to assert selecting media updates the correct item, preview state reflects image/video/placeholder, failures are visible without clearing current data, and editor-local picker state is keyed by stable item id. Use a synthetic reordered normalized item array or existing helper-level move assertion only; full drag/remove UI remains TASK-270-02. |
| `core/widgets/core/galleryMosaic.tsx` | Change only if TASK-256 final media semantics require an owner helper for preview-safe fields; otherwise keep runtime output unchanged in this leaf. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Update only if normalizer/runtime behavior changes. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document Visual per-item picker and preview behavior. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Mark UX-02, UX-05, BF-02, and BF-07 fixed or document any deferred detail with evidence. |

## Implementation Pseudocode

```tsx
type GalleryItemPreviewState = {
  mediaType: "image" | "video" | "placeholder";
  src?: string;
  label: string;
};

type GalleryMosaicMediaAsset = {
  id: string;
  url?: string | null;
  type?: string | null;
  mimeType?: string | null;
  title?: string | null;
  filename?: string | null;
};

function resolveGalleryItemPreview(item: GalleryMosaicItem): GalleryItemPreviewState {
  if (item.video?.trim()) return { mediaType: "video", src: item.video, label: item.caption ?? "Video" };
  if (item.image?.trim()) return { mediaType: "image", src: item.image, label: item.caption ?? "Image" };
  return { mediaType: "placeholder", label: item.caption ?? "Media item" };
}

function getItemMediaStateKey(item: GalleryMosaicItem, index: number) {
  return item.id?.trim() || `gallery-pending-${index + 1}`;
}

function inferGalleryMosaicMediaKind(media: GalleryMosaicMediaAsset): "image" | "video" | null {
  const declaredType = media.type?.toLowerCase() ?? "";
  const mimeType = media.mimeType?.toLowerCase() ?? "";
  if (declaredType === "video" || mimeType.startsWith("video/")) return "video";
  if (declaredType === "image" || mimeType.startsWith("image/")) return "image";
  return null;
}

function mapMediaToGalleryItemPatch(media: GalleryMosaicMediaAsset): Partial<GalleryMosaicItem> {
  const url = media.url?.trim();
  const kind = inferGalleryMosaicMediaKind(media);
  if (!url || !kind) throw new Error("gallery_mosaic_media_unsupported");
  if (kind === "video") return { video: url, image: "" };
  return { image: url, video: "" };
}

async function handleItemMediaSelection(index: number, nextValue: unknown) {
  const item = normalizeGalleryMosaicItems(value.items)[index];
  const stateKey = getItemMediaStateKey(item ?? {}, index);
  const mediaId = typeof nextValue === "string" ? nextValue : null;
  if (!mediaId) {
    clearSelectedMediaId(stateKey);
    return;
  }

  setMediaPickerError(null);
  try {
    const mediaItems = await listMediaCached({ force: false });
    const media = mediaItems.find((item) => item.id === mediaId);
    if (!media?.url) throw new Error("gallery_mosaic_media_missing_url");
    updateItem(value, onChange, index, mapMediaToGalleryItemPatch(media));
    rememberSelectedMediaId(stateKey, mediaId);
  } catch {
    setMediaPickerError(`Item ${index + 1}: failed to resolve selected media.`);
  }
}
```

Error handling:

- Media lookup failures show a local editor error and keep the existing item
  image/video/caption/link untouched.
- Unsupported media types or missing public URLs produce
  `gallery_mosaic_media_unsupported` and do not patch the item.
- Image assets update only `image` and clear `video`; video assets update only
  `video` and clear `image`, using the TASK-256 media truthfulness contract
  rather than persisting an ambiguous image+video pair.
- Media asset `title`/`filename` may be used for editor-only preview labels
  when the item caption is empty, but this leaf must not persist caption, alt,
  or title fields from media metadata.
- Media picker state is keyed by stable normalized item id, not raw index, so
  synthetic reordered-item tests can prove state lookup stability before
  TASK-270-02 adds full drag/remove UI.
- The editor stores only public runtime fields already accepted by the
  `galleryMosaicSchema`; do not persist media ids unless a later schema task
  explicitly adds and migrates them.
- Preview labels must not expose private storage keys, signed URLs, or internal
  media diagnostics.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: existing authenticated admin session for page/template editing and
  existing media-library read permissions.
- RBAC: existing page/template widget write permission plus media read
  permission; no new role or public capability.
- CSRF: unchanged admin write route protection; this leaf adds no route.
- Rate-limit bucket: unchanged admin/media read buckets; no public write bucket.
- Reject-unknown validation: unchanged unless a schema-backed media id or media
  metadata field is introduced.
- Anti-abuse: no upload or public write path is introduced. Media URLs must
  remain normalized by the TASK-256 safe-media behavior before runtime output.
- Secret handling: editor errors and previews must not expose private media
  paths, provider keys, or signed tokens.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx` if
  runtime media normalization changes.
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx` only if shared
  `MediaPicker` behavior changes.
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-270-01_Gallery_Mosaic_Item_Previews_and_Media_Picker.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Each Gallery Mosaic item in Visual can show a stable thumbnail/preview state.
- Each item can select media from the existing media library without hand-copying
  a URL.
- Media resolution failures are visible and non-destructive.
- Media picker state lookup is keyed by normalized item id and survives a
  synthetic reordered item list; full drag/remove UI coverage lands in
  TASK-270-02.
- The leaf does not reimplement TASK-256 image/video priority or safe-media
  output logic.
