# TASK-267-03: Feature Grid Media Picker, Emoji Picker, and Image Priority UX

# FileName: TASK-267-03_Feature_Grid_Media_Picker_Emoji_Picker_and_Image_Priority_UX.md

**Priority:** High
**Category:** Widgets + Feature Grid + Admin UI + Media
**Estimated Effort:** Large
**Dependencies:** TASK-307, TASK-267-02
**Status:** Done (2026-05-17)

---

## Overview

Improve Feature Grid card media authoring by adding a media-library picker,
bounded emoji/icon picker, explicit image alt authoring, and clear copy
explaining that an image overrides the emoji icon in runtime output.

This leaf does not own raw image URL validation or runtime safe-media fallback;
those route through `TASK-307`. This leaf does own the Feature Grid-local image
alt field and may reuse shared media helpers after they land.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:234-236` - UX-07 icon/image
  priority is unclear.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:349` - A2 missing image alt
  authoring is Feature Grid-local card media scope.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:303-305` - BF-04 lacks icon
  and image size controls; size controls are implemented in TASK-267-04, but
  media authoring starts here.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:336-340` - BF-15/BF-16 emoji
  picker and media library integration.
- `_docs/_WIDGETS/tmp/feature-grid/MATRIX.md:5,11` - icon grid is Keep and rich
  media is Adapt with constrained media/image fields.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Import `MediaPicker` from `@/ui/media/MediaPicker` and `listMediaCached` from `@/services/mediaClient`, add per-card transient media-id selection that persists public URLs into `items[].image`, add bounded emoji presets, add `Image alt text` authoring, and display image-over-icon priority copy. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Mock `MediaPicker`/media client and assert selecting media patches the correct card image, emoji preset patches `items[].icon`, `Image alt text` persists, and priority copy is visible. |
| `core/widgets/core/featureGrid.tsx` | Extend the item contract with authorable `imageAlt` while reusing shared safe-media runtime behavior from `TASK-307`. |
| `tests/vitest/widgets/featureGrid.test.tsx` | Cover `imageAlt` normalization and runtime fallback behavior. |
| `tests/unit/widgets/validator.test.ts` | Update schema assertions for the new persisted media field. |
| `_docs/_WIDGETS/FEATURE_GRID.md` | Document media picker, emoji picker, and image-over-icon priority. |
| `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` | Mark UX-07/BF-15/BF-16 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
const featureGridEmojiOptions = ["⚡", "🧩", "📈", "🔒", "🚀", "✨", "💬", "🎯"];

type FeatureGridItem = {
  imageAlt?: string;
};

async function handleItemMediaSelection(index: number, nextValue: unknown) {
  const mediaId = typeof nextValue === "string" ? nextValue : null;
  if (!mediaId) {
    setSelectedMediaIds((current) => ({ ...current, [index]: null }));
    updateItem(value, onChange, index, { image: undefined });
    return;
  }
  setSelectedMediaIds((current) => ({ ...current, [index]: mediaId }));
  try {
    const mediaItems = await listMediaCached({ force: false });
    const media = mediaItems.find((item) => item.id === mediaId);
    if (!media?.url) throw new Error("missing_media_url");
    updateItem(value, onChange, index, { image: media.url });
  } catch {
    setMediaPickerError(`Card ${index + 1}: failed to resolve selected media.`);
  }
}

function FeatureGridIconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div role="group" aria-label="Icon presets">
      {featureGridEmojiOptions.map((icon) => (
        <button type="button" aria-pressed={value === icon} onClick={() => onChange(icon)}>
          {icon}
        </button>
      ))}
    </div>
  );
}
```

Error handling:

- Follow the existing Gallery Mosaic pattern: `MediaPicker` stores selected asset
  ids in editor-local state, then `listMediaCached({ force: false })` resolves
  those ids to public media records and persists only `media.url` into widget
  data. Do not pass `items[].image` URLs back as the `MediaPicker` value because
  the picker expects asset ids.
- Media lookup failures show a local editor error and do not clear existing card
  data.
- Selecting media stores only the public URL in `items[].image` unless a later
  schema task explicitly adds `imageAssetId` with migration tests.
- `imageAlt` stores concise author copy only when the card uses an image; blank
  values fall back to the current title-derived runtime alt.
- The editor must not silently delete `items[].icon` when `items[].image` is set;
  instead it should show that the icon is inactive while the image is present.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and existing media read
  permissions.
- Reject-unknown validation: unchanged unless a schema-backed media field is
  introduced. `imageAlt` must be schema-backed if added here.
- Anti-abuse: no raw upload or public write path is introduced. Media URLs must
  remain normalized by TASK-256 safe media behavior before runtime output.
- Secret handling: media picker state and errors must not expose secrets or
  privileged storage details.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx` if runtime
  media normalization changes.
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx` only if shared
  `MediaPicker` behavior changes.
- `bun test tests/unit/widgets/validator.test.ts` when `imageAlt` is added.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-267-03_Feature_Grid_Media_Picker_Emoji_Picker_and_Image_Priority_UX.md`
- `_docs/_TASKS/README.md` on status changes

## Completion Notes

- Done (2026-05-17). Feature cards now support shared media-library picking,
  bounded emoji presets, explicit `imageAlt`, and clear image-over-icon
  guidance.
- Final family validation is recorded in `TASK-267-08`.

## Acceptance Criteria

- A card can choose an image from the existing media library without hand-copying
  a URL.
- A card can choose a common emoji icon without pasting arbitrary emoji text.
- A card image can carry explicit alt text without forcing a second media model.
- The editor clearly communicates that image output takes priority over icon
  output.
- Media picker failures are visible and non-destructive.
