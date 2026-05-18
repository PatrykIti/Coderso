# TASK-312-01: Gallery Mosaic Shared Editor Truthfulness Residuals

# FileName: TASK-312-01_Gallery_Mosaic_Shared_Editor_Truthfulness_Residuals.md

**Priority:** High
**Category:** Widgets + Gallery Mosaic + Shared Contract + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-312
**Status:** Done (2026-05-17)

---

## Overview

Finish the Gallery Mosaic shared editor-mode and current-media truthfulness
repairs that were routed to `TASK-256-01` and `TASK-256-06-02` but are still
missing in the live checkout.

Current checkout note: this leaf records the shared editor baseline that was
repaired before the later `TASK-270` product rollout. References below to
future `TASK-270-*` scope are reopen-time boundaries, not current open backlog.

This leaf covers only the current shared contract for existing fields:

- duplicated Advanced controls that should no longer pretend to be a second
  editable owner for the same Visual fields;
- Wizard current-contract media handling for image/video assets;
- current image/video truthfulness for existing fields in Visual.

It must not add product-only authoring such as per-item Visual MediaPicker,
preview thumbnails, dedicated `alt` authoring, drag-and-drop, or import/export.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` - rows `UX-01`, `UX-06`,
  and `UX-07` capture the shared editor-mode and current-media truthfulness
  residuals this leaf closed.
- `_docs/_TASKS/TASK-256-01_Shared_Editor_Mode_and_Atomic_Update_Contract.md`
  - shared Advanced ownership already closed on paper and must be reflected in
  the live owner.
- `_docs/_TASKS/TASK-256-06-02_CTA_Banner_Logo_Cloud_and_Gallery_Media_Links.md`
  - Gallery Mosaic current media truthfulness and Wizard video scope belong to
  the shared contract, while per-item Visual MediaPicker stayed in
  `TASK-270-01` at reopen time.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Remove or downgrade duplicated Advanced controls for current shared fields so Advanced becomes technical/read-only for this widget, add truthful current-media-state guidance for existing image/video fields, and extend Wizard current-contract media selection to video without widening into per-item Visual picker work. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Replace manual-URL-only and duplicate-control expectations with coverage for the settled shared contract: Advanced ownership is no longer duplicated, Wizard current-contract media handles image/video assets truthfully, and Visual exposes a clear current media state for existing fields. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document the settled shared mode ownership and current media truthfulness baseline. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Record the fixed/deferred status for UX-01, UX-06, and UX-07 under the reopened shared family. |

## Implementation Pseudocode

```tsx
function resolveCurrentGalleryMediaType(item: GalleryMosaicItem): "image" | "video" | "placeholder" {
  if (item.video?.trim()) return "video";
  if (item.image?.trim()) return "image";
  return "placeholder";
}

function getGalleryMediaTypeBadge(type: "image" | "video" | "placeholder") {
  if (type === "video") return { label: "Video", tone: "secondary" };
  if (type === "image") return { label: "Image", tone: "default" };
  return { label: "Placeholder", tone: "outline" };
}

async function handleWizardMediaSelection(nextValue: unknown) {
  const ids = Array.isArray(nextValue) ? nextValue.map(String) : [];
  const mediaItems = await listMediaCached({ force: false });
  const mediaById = new Map(mediaItems.map((item) => [item.id, item]));
  updateValue(value, onChange, (current) => {
    const items = normalizeGalleryMosaicItems(current.items, Math.max(ids.length, current.items.length));
    const nextItems = [...items];
    ids.forEach((id, index) => {
      const media = mediaById.get(id);
      const kind = inferGalleryMediaKind(media);
      if (!media?.url || !kind) return;
      nextItems[index] =
        kind === "video"
          ? { ...nextItems[index], video: media.url, image: "" }
          : { ...nextItems[index], image: media.url, video: "" };
    });
    return { ...current, items: normalizeGalleryMosaicItems(nextItems, nextItems.length) };
  });
}
```

Error handling:

- Wizard selection must accept current-contract image and video assets, reject
  unsupported media types non-destructively, and avoid persisting an ambiguous
  image+video pair.
- Advanced must not keep live duplicate controls for fields that Visual already
  owns; if a raw diagnostic is still useful, keep it read-only or summary-only.
- Current media truthfulness must reflect the resolved runtime priority without
  inventing new persisted fields or product-only toggles.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin editing and existing media-library
  read permissions.
- RBAC: unchanged page/template widget write permission plus existing media read
  permission.
- CSRF: unchanged admin write route protection.
- Rate-limit bucket: unchanged admin/media read buckets.
- Reject-unknown validation: unchanged. This leaf must use the current schema
  only and cannot introduce new product fields.
- Anti-abuse: media state copy/badges/errors must not expose private storage
  keys, signed URLs, or provider diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-312-01_Gallery_Mosaic_Shared_Editor_Truthfulness_Residuals.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Advanced no longer pretends to own the same current shared fields as Visual.
- Wizard current-contract media selection handles both image and video assets
  truthfully for the existing schema.
- Visual communicates which current media type actually wins for each item
  without introducing new product-only fields.

## Completion Notes

- 2026-05-17: Advanced shared style controls were downgraded to a diagnostic
  summary, Wizard current-contract media selection now accepts image/video
  assets, and Visual item cards show explicit current-media ownership copy.
- Validation:
  - `set -a && source /Users/pciechanski/Documents/_moje_projekty/Coderso/.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
  - `bun run scan:security:strict` (rerun on the host because sandbox trust-store/network blocked Semgrep and `bun audit`)
