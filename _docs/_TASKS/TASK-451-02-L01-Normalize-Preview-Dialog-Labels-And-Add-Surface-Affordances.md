# TASK-451-02-L01: Normalize Preview Dialog Labels And Add Surface Affordances
# FileName: TASK-451-02-L01-Normalize-Preview-Dialog-Labels-And-Add-Surface-Affordances.md

**Parent Subtask:** TASK-451-02
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-451-02, TASK-451-01-L01
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Normalize toolbar labels that currently leak block content or inconsistent
capitalization — as reported by the per-block 2026-06-10 audits
(`_docs/AUDIT/text-2026-06-10.md` and `_docs/AUDIT/statistic-2026-06-10.md`,
e.g. `Write the section copy here. tools` and `0 tools`) — and close the
remaining add-surface/shell parity gaps noted by the cross-parity audit
(`_docs/AUDIT/_cross-parity-2026-06-10.md`): a single top-of-canvas "Add
section" button instead of per-gap inline "+" insertion points. This leaf is
the single owner of the shared toolbar-label helper; TASK-438, TASK-446, and
TASK-447 are adopters that only verify their per-type fallback labels
("Text tools", "Statistic tools", "Quote tools") after this leaf lands.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Toolbar labels — single owner of the shared helper (new helper, to be
// created in core/admin/ui/pages/PageEditor.tsx). It replaces the
// content-leaking getBlockDisplayLabel-derived aria text
// (PageEditor.tsx:290-294 -> toolbarSelectionLabel :956-958 ->
// aria-label `${toolbarSelectionLabel} tools` :1892):
const toolbarLabel = resolveToolbarTargetLabel(target, {
  fallbackToTypeName: true,
});
// aria-label={`${toolbarLabel} tools`} — stable human type names, never block
// content or placeholder copy. TASK-438/446/447 adopt this helper and only
// verify their per-type fallbacks ("Text tools", "Statistic tools",
// "Quote tools") after this leaf lands.

// Inline add-surface — per-gap hover insertion zones between sections on the
// canvas, complementing the current single top-of-canvas "Add section" button
// (PageEditor.tsx:1798-1801, onClick={openCommandPalette} defined at :981):
{pageDocument.sections.map((section, index) => (
  <Fragment key={section.id}>
    {/* SectionGapInsertZone: new component, to be created in
        core/admin/ui/pages/PageEditor.tsx — hover-revealed "+" zone */}
    <SectionGapInsertZone
      index={index}
      onInsert={() => openCommandPaletteAtGap(index)}
    />
    <SectionCanvas /* existing props */ />
  </Fragment>
))}
// openCommandPaletteAtGap (new helper wrapping openCommandPalette at :981)
// opens the existing command palette pre-targeted at the gap index;
// addSection (PageEditor.tsx:1108-1118) today only appends via
// [...current.sections, section] and must accept an optional insertion index
// so the chosen section is spliced at the gap instead of the end.
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/preview/RuntimePreviewDialog.tsx`

Validation commands:

- `bun run test:bun`
- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Toolbar labels prefer stable human type names over placeholder/default copy.
- Per-gap inline "+" zones open the existing command palette pre-targeted at
  the gap index, and the chosen section is inserted at that gap (today
  `addSection` only appends); affordances stay capability-aware.
- Preview dialog shell matches the preview-surface behavior fixed by
  TASK-451-01-L01.

Error handling:

- Missing labels fall back to type-safe defaults.
- Shell polish must not alter save/publish behavior.

Regression-test shape:

- Vitest UI coverage for toolbar labels and preview-shell interactions,
  including the type-name fallback (no block content/placeholder copy in the
  toolbar `aria-label`).
- Vitest UI coverage for the per-gap insertion zones: hovering a gap reveals
  the "+", activating it opens the command palette pre-targeted at the gap
  index, and the chosen section lands at that gap instead of being appended.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes beyond the preview flow fixed by
  TASK-451-01-L01.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** shell polish must not expose extra preview/token data.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Completed 2026-06-11: resolveToolbarTargetLabel owner helper (adopter families 438/446/447 verify after this), per-gap inline add-section zones with insert-at-index, dialog label normalization; flow tests added.
