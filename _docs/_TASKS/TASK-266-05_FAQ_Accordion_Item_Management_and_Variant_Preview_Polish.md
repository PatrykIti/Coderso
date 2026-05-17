# TASK-266-05: FAQ Accordion Item Management and Variant Preview Polish

# FileName: TASK-266-05_FAQ_Accordion_Item_Management_and_Variant_Preview_Polish.md

**Priority:** Medium
**Category:** Widgets + Content + Admin UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-266-04, TASK-266
**Status:** To Do

---

## Overview

Improve FAQ Accordion item-management safety and editor preview polish.

This leaf covers report rows U1, U5, U7, U10, and U11. The goal is a safer,
denser, and more visual FAQ editing flow without changing the shared page
builder contract.

## Scope Boundary

In scope:

- confirmation or undo for removing one Q/A item;
- compact icon-forward move/remove/add controls with accessible labels;
- variant preview miniatures that explain single-column, two-column, and compact
  layouts visually;
- local native drag/drop reorder with keyboard-safe Move Up/Down fallback and
  no new shared DnD framework;
- bounded bulk delete that previews the selected questions and never allows the
  final remaining FAQ item to be removed.

Out of scope:

- generic shared repeatable-list infrastructure;
- changing all widget variant card components;
- adding a dependency solely for this editor;
- bulk operations that bypass the existing normalizer or item min/max rules.

## Sub-Tasks

- [ ] Add a local remove confirmation or undo affordance that prevents
  accidental immediate deletion while preserving the min-one-item guard.
- [ ] Replace long text-only move/remove controls with icon+tooltip or compact
  accessible buttons following existing admin UI patterns.
- [ ] Add small static variant preview miniatures inside `VariantCards`.
- [ ] Implement local native drag/drop reorder with keyboard-safe Move Up/Down
  fallback and direct test coverage.
- [ ] Implement bounded bulk delete with selected-question preview and a guard
  that always leaves at least one FAQ item.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add delete safety, compact action controls, variant miniatures, and optional local reorder/bulk UX. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Add editor assertions for delete confirmation/undo, action labels, variant previews, and any reorder/bulk behavior that lands. |
| `_docs/_WIDGETS/FAQ.md` | Update editor behavior notes for item management and previews. |

## Implementation Pseudocode

Remove confirmation/undo:

```tsx
const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

function requestRemove(item: FaqAccordionItem) {
  setPendingRemovalId(item.id ?? null);
}

function confirmRemove(index: number) {
  removeItem(value, onChange, index);
  setPendingRemovalId(null);
}
```

Variant miniature:

```tsx
function FaqVariantPreview({ variant }: { variant: FaqAccordionVariantId }) {
  return (
    <div aria-hidden="true" className={previewClassMap[variant]}>
      <span />
      <span />
      <span />
    </div>
  );
}
```

Local drag/drop:

```tsx
function handleDrop(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return;
  moveItem(value, onChange, fromIndex, toIndex);
}
```

Error handling:

- Delete confirmation cannot remove the final remaining item.
- Reorder operations ignore out-of-range indexes.
- Bulk delete leaves at least one item and uses the same normalizer as single
  item delete.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless item metadata changes.
- Anti-abuse: no arbitrary HTML in variant previews or action labels.
- Secret handling: no secrets in UI state, diagnostics, or Playwright evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before any manual commit that includes this leaf, also run:
  - `bun run lint`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FAQ.md` editor-mode notes.
- Update `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` rows U1, U5, U7,
  U10, and U11 with fixed/deferred evidence after validation.

## Changelog Policy

- Covered by the TASK-266 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Removing Q/A rows requires confirmation or provides a tested undo path.
- Item action controls remain compact and accessible in the right inspector.
- Variant choices include a visual preview that does not depend on public
  runtime screenshots.
- Drag/drop and bulk actions are implemented locally with tests and keep the
  min-one-item FAQ guard intact.
