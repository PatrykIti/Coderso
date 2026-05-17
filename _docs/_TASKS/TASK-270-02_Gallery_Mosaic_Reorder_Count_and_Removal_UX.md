# TASK-270-02: Gallery Mosaic Reorder, Count, and Removal UX

# FileName: TASK-270-02_Gallery_Mosaic_Reorder_Count_and_Removal_UX.md

**Priority:** High
**Category:** Widgets + Gallery Mosaic + Admin UI + Repeated Items
**Estimated Effort:** Large
**Dependencies:** TASK-270-01
**Status:** To Do

---

## Overview

Improve repeated item management for Gallery Mosaic by adding drag reorder or an
equivalent accessible reorder affordance, clarifying the difference between item
count normalization and manual add/remove, making removal recoverable or
explicitly confirmed, and warning authors when `feature-left` is left without a
supporting column.

This leaf does not own shared slot/nested-content reorder contracts. It applies
only to the Gallery Mosaic `items[]` editor surface already implemented inside
`GalleryMosaicEditors.tsx`.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:298-299` - UX-03 reports
  move up/down is inefficient for large galleries.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:301-302` - UX-04 reports
  unclear semantics between `Items count` and add/remove.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:327,379` - BF-09 requests
  author-facing warning or validation when `feature-left` has only one item.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:324,371` - BF-06 requests
  drag-and-drop reorder.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add a bounded item management model: drag handles or compact reorder controls, keyboard-safe move fallback, clear copy/state for count normalization vs specific item removal, recoverable remove or explicit confirm before deleting a populated item, and `feature-left` one-item warning/guidance when count/remove leaves no supporting card. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Assert reorder changes item order deterministically, keyboard/button fallback remains available, item count expansion preserves existing data, item count reduction warns or preserves deleted data according to the chosen UX, and remove is recoverable/confirmed. |
| `core/widgets/core/galleryMosaic.tsx` | Change only if normalizer needs a helper for tombstone-free item preservation; avoid runtime-only changes. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document item count, add/remove, and reorder behavior. |
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Mark UX-03, UX-04, and BF-06 fixed or document deferrals with evidence. |

## Implementation Pseudocode

```tsx
type RemovedGalleryItem = {
  item: GalleryMosaicItem;
  index: number;
};

type PendingCountChange = {
  nextCount: number;
  removedItems: GalleryMosaicItem[];
};

function reorderGalleryItems(items: GalleryMosaicItem[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  if (!moved) return items;
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function removeGalleryItem(index: number) {
  updateValue(value, onChange, (current) => {
    const items = normalizeGalleryMosaicItems(current.items);
    const removed = items[index];
    if (!removed || items.length <= 1) return current;
    setLastRemoved({ item: removed, index });
    return { ...current, items: normalizeGalleryMosaicItems(items.filter((_, i) => i !== index), items.length - 1) };
  });
}

function requestCountChange(nextCount: number) {
  updateValue(value, onChange, (current) => {
    const items = normalizeGalleryMosaicItems(current.items);
    if (nextCount >= items.length) {
      clearPendingCountChange();
      return { ...current, items: normalizeGalleryMosaicItems(items, nextCount) };
    }

    setPendingCountChange({
      nextCount,
      removedItems: items.slice(nextCount),
    });
    return current;
  });
}

function confirmCountReduction() {
  if (!pendingCountChange) return;
  updateValue(value, onChange, (current) => ({
    ...current,
    items: normalizeGalleryMosaicItems(current.items, pendingCountChange.nextCount),
  }));
  clearPendingCountChange();
}

function getFeatureLeftSupportWarning(variant: string, items: GalleryMosaicItem[]) {
  if (resolveGalleryMosaicVariant(variant) !== "feature-left") return null;
  if (items.length > 1) return null;
  return {
    code: "gallery_mosaic_feature_left_support_missing",
    message: "Feature Left works best with one lead tile plus at least one supporting item.",
  };
}
```

Error handling:

- Drag/drop must clamp indexes and never create duplicate or missing item ids.
- Removing the last item remains blocked because the schema minimum is one item.
- `Items count` reduction must show explicit impact copy and require confirm or
  preserve the removed rows in editor-local undo state; it must not silently
  discard populated items while pretending to be equivalent to manual remove.
- Undo/confirm state must be editor-local and must not persist transient deleted
  item metadata into the widget payload.
- `feature-left` warning state is informational/editor-local only. It must not
  mutate widget data or invent runtime placeholders to satisfy the warning.
- If a shared drag-and-drop helper exists by implementation time, reuse it
  instead of creating a Gallery-only interaction abstraction.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: existing authenticated admin session for page/template editing.
- RBAC: existing page/template widget write permission; no new role or public
  capability.
- CSRF: unchanged admin write route protection; this leaf adds no route.
- Rate-limit bucket: unchanged admin write bucket; no public write bucket.
- Reject-unknown validation: unchanged unless item metadata fields are added,
  which this leaf should avoid.
- Anti-abuse: no raw HTML, script, or unbounded class data is introduced.
- Secret handling: undo/confirm state is local UI state only.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx` only if
  normalizer behavior changes.
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-270-02_Gallery_Mosaic_Reorder_Count_and_Removal_UX.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Large galleries can be reordered without repeated move-button clicks.
- Keyboard-safe reorder controls remain available.
- Item count changes and manual add/remove communicate different data-loss
  semantics clearly.
- Removing populated items is recoverable or explicitly confirmed.
- Authors get visible guidance when `feature-left` is configured with only one
  item and therefore no supporting column exists.
