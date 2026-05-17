# TASK-290-02: Testimonials Destructive Item Management and Spotlight Pin

# FileName: TASK-290-02_Testimonials_Destructive_Item_Management_and_Spotlight_Pin.md

**Priority:** High
**Category:** Widgets + Testimonials + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-290
**Status:** To Do

---

## Overview

Make repeated testimonial item management safer and make Spotlight selection
intentional instead of relying on the first list item.

This leaf covers:

- `REPORT_TESTIMONIALS_WIDGET.md:164-167` UX-01 remove testimonial has no
  confirmation or undo.
- `REPORT_TESTIMONIALS_WIDGET.md:214-217` BF-04 Spotlight always highlights
  `index === 0`.

## Scope Boundary

In scope:

- Add a confirmation or recoverable undo pattern for testimonial removal.
- Keep the minimum two-item guard.
- Add schema-owned spotlight selection under the explicit
  `TestimonialsData.layout.spotlightItemId` namespace.
- Render the selected spotlight item first/highlighted without silently dropping
  item data.
- Preserve Move up / Move down keyboard-friendly controls.

Out of scope:

- Drag/drop and bulk actions unless a small internal helper is already available.
- Shared repeated-list helper contracts.
- Variant/count atomic update repairs owned by TASK-256.
- Large list pagination/import behavior owned by TASK-290-07.

## Sub-Tasks

- [ ] Add `layout.spotlightItemId` to schema/types/defaults and
  `normalizeTestimonialsData`.
- [ ] Normalize invalid or stale spotlight references to the first visible item.
- [ ] Add Visual controls to set a testimonial as the spotlight item when the
  `spotlight` variant is active.
- [ ] Add confirmation or undo for `Remove`, preserving disabled behavior at the
  minimum count.
- [ ] Add tests proving removal safety and spotlight rendering remain stable
  after reorder and count changes.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/testimonials.tsx` | Add `layout.spotlightItemId` schema/types/defaults/normalizer ownership and renderer selection logic. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Add spotlight controls and removal confirmation/undo UI. |
| `tests/vitest/widgets/testimonials.test.tsx` | Add normalization/render tests for selected spotlight and stale references. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Add editor tests for remove confirmation/undo and spotlight controls. |
| `tests/unit/widgets/validator.test.ts` | Run and update if schema fixtures require new fields. |

## Implementation Pseudocode

Spotlight resolver:

```ts
function resolveSpotlightItemId(data: TestimonialsData, items: TestimonialItem[]) {
  const candidate = data.layout?.spotlightItemId;
  if (candidate && items.some((item) => item.id === candidate)) return candidate;
  return items[0]?.id;
}

function isHighlighted(item: TestimonialItem, index: number) {
  return resolvedVariant === "spotlight"
    ? item.id === resolveSpotlightItemId(normalizedData, items)
    : false;
}
```

Removal flow:

```tsx
function requestRemove(index: number) {
  setPendingRemove({ index, label: testimonials[index]?.author ?? `Testimonial ${index + 1}` });
}

function confirmRemove() {
  if (!pendingRemove) return;
  removeTestimonial(value, onChange, pendingRemove.index);
  setPendingRemove(null);
}
```

Error handling:

- Stale spotlight IDs normalize to the first visible item.
- Removing the spotlight item moves the spotlight to the next valid item.
- Confirmation state clears when the editor remounts or item count reaches the
  minimum.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new spotlight fields must be schema-bound with
  `additionalProperties: false` preserved.
- Anti-abuse: no raw HTML, arbitrary classes, scripts, or unsafe links.
- Secret handling: no secrets in item-management state or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If committed separately from TASK-290-08, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/TESTIMONIALS.md` with removal safety and spotlight
  selection behavior.
- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` UX-01 and BF-04
  status after implementation.

## Changelog Policy

- Covered by the TASK-290 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Testimonial removal is recoverable or explicitly confirmed.
- Spotlight selection is visible to editors and stable across reorder/remove.
- Runtime output remains deterministic and backward compatible for legacy data.
