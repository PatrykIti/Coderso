# TASK-339-08: Gallery Mosaic Contract Truthfulness

# FileName: TASK-339-08_Gallery_Mosaic_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** Done (2026-05-27)
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `gallery-mosaic` contract metadata match the richer editor that already
ships.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows `gallery-mosaic` renders
  `Visual=7`, `Advanced=4` while the contract still declares `Visual=2`,
  `Advanced=1`.
- The current UI already exposes media structure, interactions, overlays,
  density, and motion separately; the contract simply does not tell the truth.
- First Claude Playwright review found a second drift surface beyond section
  truthfulness: Gallery Visual fields were not wired to labels with the same
  shared accessibility pattern that Hero uses for its textboxes and comboboxes.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add truthful section ids/roles that match the live UI. |
| `core/widgets/core/galleryMosaic.tsx` | Replace the stale contract with the true rendered section inventory. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
// Keep the current rendered UI, but make ids/roles/contracts truthful.
variant and media structure
header copy
media items and links
interaction
overlay and caption controls
layout style
density and motion
```

Data flow:

- Preserve the current richer UI and media/link behavior.
- Align the contract and stable DOM metadata to that UI.
- Keep Hero-style ownership boundaries:
  - Wizard seeds layout plus starter item count,
  - Visual owns daily media/layout/interaction edits,
  - Advanced stays read-only diagnostics only.

Error handling:

- Keep `Advanced` read-only.
- Do not regress to the coarse two-section contract.
- Do not keep mutating support actions in daily Advanced once the Hero-style
  diagnostics split is applied.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `gallery-mosaic` against the `hero` baseline
- Claude review for this leaf must use Playwright-visible UI only and must not
  read repo code, task files, or source diffs.

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/GALLERY_MOSAIC.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Progress Notes

- 2026-05-27: Gallery Mosaic now exports truthful Wizard/Visual/Advanced
  section ids and roles instead of the old `Visual=2` / `Advanced=1` contract.
- 2026-05-27: Wizard now seeds gallery layout and starter item count instead of
  staying summary-only.
- 2026-05-27: Advanced is now fully read-only and split into runtime, style,
  accessibility, and contract summaries to match the Hero daily-tab pattern.
- 2026-05-27: Shared field labeling was tightened through Gallery-local
  `WidgetControlRow` adoption plus a shared `LinkDestinationField` update so
  comboboxes/textboxes now expose the same accessible naming pattern as Hero.
- 2026-05-27: Focused validation is green:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/widgets/entryTeaser.test.tsx tests/vitest/ui/link-destination-field.test.tsx`
- 2026-05-27: Final Claude Playwright snapshot review returned
  `VERDICT: NO BLOCKERS`.

## Acceptance Criteria

- Gallery Mosaic keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly.
