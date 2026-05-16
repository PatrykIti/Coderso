# TASK-268-04: Footer Editor Mode IA and Link Management

# FileName: TASK-268-04_Footer_Editor_Mode_IA_and_Link_Management.md

**Priority:** High
**Category:** Widgets + Admin UI + Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-268, TASK-268-01, TASK-268-02, TASK-268-03
**Status:** To Do

---

## Overview

Repair Footer-local editor mode drift and link-management UX after the public
Footer data model is stable.

The report calls out unlabeled Advanced controls, duplicated `sectionPaddingY`
between Visual and Advanced, Wizard quick setup exposing only first links, and
no practical way to reorder links/columns. This leaf fixes only Footer editor
code in `FooterEditors.tsx`. It must not alter global page-builder mode
navigation or shared editor primitives unless those changes have already landed
through TASK-256.

## Scope Boundary

This leaf owns:

- Footer Advanced select labels and one-control-per-line inspector layout where
  required by `_docs/WIDGETS.md`.
- A single owner for Footer `sectionPaddingY`; prefer Advanced for layout tokens
  unless product decides Visual should own it and Advanced becomes read-only.
- Wizard disclosure for first-link-only quick setup, including hidden-link
  counts or a direct Visual handoff copy if available locally.
- Footer-local link and column reordering controls that are accessible and
  deterministic, such as move up/down buttons.
- Editor labels for Footer color/link/social fields introduced by earlier
  TASK-268 leaves.

This leaf does not own:

- Global Wizard/Visual/Advanced tabs being hidden before the first Continue
  action. That is a page-builder/editor-shell concern, not a Footer editor file.
- Generic drag-and-drop infrastructure unless already approved elsewhere.
- Generic `Clear`/color-picker semantics from TASK-256-02.

## Sub-Tasks

- [ ] Add visible labels around Footer Advanced controls for columns alignment,
  legal row alignment, max width, column gap, and section padding.
- [ ] Remove or relocate the Visual `sectionPaddingY` control so exactly one
  Footer editor mode owns that setting.
- [ ] Add Wizard quick-setup copy or per-column hidden-link count that tells the
  user only the first link is edited in Wizard and additional links remain in
  Visual.
- [ ] Add accessible move up/down controls for visible links; add column
  reordering only if it does not break variant-bound hidden column preservation.
- [ ] Keep all link updates immutable and preserve hidden columns when editing a
  smaller active variant.
- [ ] Update UI tests to assert labels, ownership, and reorder behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Add labels, remove duplicate Footer layout control ownership, improve Wizard disclosure, and add deterministic link/column reorder controls. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover labels, no duplicate `sectionPaddingY` control, hidden-link disclosure, and move up/down behavior. |
| `tests/vitest/widgets/footer.test.tsx` | Update only if editor helper exports or schema/default assumptions change. |
| `_docs/_WIDGETS/FOOTER.md` | Document final Wizard/Visual/Advanced ownership and link management behavior. |

## Implementation Pseudocode

```tsx
function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function moveFooterLink(
  value: FooterData,
  variant: string,
  columnIndex: number,
  linkIndex: number,
  direction: -1 | 1
): FooterData {
  const columns = resolveEditableFooterColumns(value, variant);
  const nextColumns = [...columns];
  const links = [...(nextColumns[columnIndex]?.links ?? [])];
  const targetIndex = linkIndex + direction;
  if (targetIndex < 0 || targetIndex >= links.length) return value;
  [links[linkIndex], links[targetIndex]] = [links[targetIndex], links[linkIndex]];
  nextColumns[columnIndex] = { ...nextColumns[columnIndex], links };
  return { ...value, columns: nextColumns };
}
```

Footer mode ownership:

```tsx
// Visual owns content, legal, social, and user-facing style.
// Advanced owns layout tokens: align, legalAlign, maxWidth, columnGap, sectionPaddingY.
```

Error handling:

- Move buttons are disabled at boundaries and must not throw for sparse columns.
- Reordering visible columns must preserve hidden columns or be deferred if the
  hidden-column contract becomes ambiguous.
- Removing the duplicate `sectionPaddingY` control must not reset saved layout
  values.
- Tests should assert count/labels instead of relying on placeholder-only
  controls.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: editor changes must keep schema-owned payload keys;
  no temporary UI-only fields should be persisted.
- Anti-abuse: link editor changes must preserve safe href normalization in the
  renderer and must not add arbitrary HTML/script fields.
- Secret handling: no secrets in editor state, tests, docs, or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx` if helper
  exports/schema assumptions change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before moving this leaf to `Done` or committing it independently, also run
  `git diff --check`, `bun run gates:coderso`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/FOOTER.md` with final editor mode ownership and link
  management behavior.
- Update `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` rows for Advanced labels,
  `sectionPaddingY` duplication, Wizard first-link UX, and reordering after
  validation.

## Changelog Policy

- Covered by the TASK-268 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Footer Advanced controls have visible labels in the rendered editor UI.
- Footer `sectionPaddingY` has one clear editor owner.
- Wizard quick setup makes first-link-only scope explicit and does not hide
  existing additional links without context.
- Link reordering is possible through deterministic accessible controls or is
  explicitly deferred with a concrete reason if column/slot preservation blocks
  it.
- Editor tests cover the fixed IA instead of relying on placeholder text alone.
